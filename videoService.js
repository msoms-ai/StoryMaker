import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Configure explicit paths to bundled ffmpeg and ffprobe binaries
try {
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  if (ffprobeInstaller && ffprobeInstaller.path) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }
} catch (e) {
  console.warn('[Video Service] Warning configuring ffmpeg paths:', e.message);
}

/**
 * Validate and auto-repair malformed WAV headers (e.g. formatTag=0x0000 -> 0x0001 PCM)
 */
export function repairAndValidateAudio(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 44) return null;

    // If WAV file, verify and fix RIFF header format tag
    if (filePath.toLowerCase().endsWith('.wav')) {
      const buf = fs.readFileSync(filePath);
      if (buf.length >= 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
        const formatTag = buf.readUInt16LE(20);
        if (formatTag === 0) {
          console.log(`[Video Service] Auto-repaired malformed WAV header (formatTag 0 -> 1) in ${path.basename(filePath)}`);
          buf.writeUInt16LE(1, 20); // 1 = WAVE_FORMAT_PCM
          fs.writeFileSync(filePath, buf);
        }
      }
    }
    return filePath;
  } catch (err) {
    console.warn(`[Video Service] Audio header check notice for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Probe audio file to verify valid decodable audio stream and get duration
 */
export function probeAudio(filePath) {
  return new Promise((resolve) => {
    const cleanPath = repairAndValidateAudio(filePath);
    if (!cleanPath) {
      return resolve({ isValid: false, duration: 5.0 });
    }

    ffmpeg.ffprobe(cleanPath, (err, metadata) => {
      if (err || !metadata || !metadata.streams) {
        console.warn(`[Video Service] ffprobe cannot parse ${path.basename(cleanPath)}:`, err?.message);
        return resolve({ isValid: false, duration: 5.0 });
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream || !audioStream.codec_name || audioStream.codec_name === 'unknown' || audioStream.codec_name === 'none') {
        console.warn(`[Video Service] Unsupported audio codec in ${path.basename(cleanPath)}, using silent fallback.`);
        return resolve({ isValid: false, duration: 5.0 });
      }

      const dur = parseFloat(metadata.format?.duration || audioStream.duration || 0);
      resolve({ isValid: true, duration: dur > 0 ? dur : 5.0, codec: audioStream.codec_name });
    });
  });
}

/**
 * Measure audio file duration in seconds using ffprobe
 */
export async function getAudioDuration(filePath) {
  const probe = await probeAudio(filePath);
  return probe.duration;
}

/**
 * Render a single slide into an MP4 video segment
 */
function renderSlideSegment({ imagePath, audioPath, duration, outputPath }) {
  return new Promise(async (resolve, reject) => {
    // Probe audio to check if it has a valid, decodable audio codec
    const audioProbe = await probeAudio(audioPath);
    const useRealAudio = audioProbe.isValid;

    let command = ffmpeg();

    // Input 1: Image looped for duration
    command.input(imagePath)
      .loop(duration)
      .inputOptions(['-framerate 25']);

    // Input 2: Valid Audio file or silent lavfi audio fallback
    if (useRealAudio) {
      command.input(audioPath);
    } else {
      command.input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi');
    }

    command
      .outputOptions([
        '-c:v libx264',
        '-tune stillimage',
        '-preset fast',
        '-pix_fmt yuv420p',
        '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(1920-iw)/2:(1080-ih)/2:black',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-movflags +faststart'
      ])
      .duration(duration)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error(`[Video Service] Segment render error:`, err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Concatenate multiple MP4 segments into final story video using concat demuxer
 */
function concatenateSegments(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const listFilePath = path.join(path.dirname(outputPath), `concat_list_${Date.now()}.txt`);
    const fileContent = segmentPaths
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    
    fs.writeFileSync(listFilePath, fileContent, 'utf-8');

    ffmpeg()
      .input(listFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(listFilePath); } catch (e) {}
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(listFilePath); } catch (e) {}
        console.error('[Video Service] Concat error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Generate full story video by stitching all slides with images and audio
 */
export async function generateStoryVideo({ story, storiesDir, onProgress = () => {} }) {
  if (!story || !story.slides || story.slides.length === 0) {
    throw new Error('Story has no slides to render into video.');
  }

  const safeFolder = path.basename(story.folderName);
  const storyFolder = path.resolve(storiesDir, safeFolder);
  if (!fs.existsSync(storyFolder)) {
    throw new Error(`Story folder does not exist: ${storyFolder}`);
  }

  const finalVideoPath = path.join(storyFolder, 'story_video.mp4');
  const tempSegmentsDir = path.join(storyFolder, '.temp_video_segments');
  if (!fs.existsSync(tempSegmentsDir)) {
    fs.mkdirSync(tempSegmentsDir, { recursive: true });
  }

  const totalSlides = story.slides.length;
  const segmentPaths = [];

  console.log(`[Video Service] Starting video generation for story: "${story.name?.ar || story.title || story.id}" (${totalSlides} slides)`);
  onProgress(5, 'Analyzing slides and audio durations...');

  try {
    for (let i = 0; i < totalSlides; i++) {
      const slide = story.slides[i];
      const segmentOutPath = path.join(tempSegmentsDir, `segment_${i}.mp4`);

      // Resolve Image Path (with URL decoding)
      let imgPath = '';
      if (slide.imageFile) {
        try {
          const decoded = decodeURIComponent(slide.imageFile);
          const cleanRelImg = decoded.replace(/^\/STORIES\/[^\/]+\//, '');
          imgPath = path.join(storyFolder, cleanRelImg);
        } catch (e) {
          const cleanRelImg = slide.imageFile.replace(/^\/STORIES\/[^\/]+\//, '');
          imgPath = path.join(storyFolder, cleanRelImg);
        }
      }
      if (!imgPath || !fs.existsSync(imgPath)) {
        // Fallback search across png, jpg, jpeg, webp
        for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
          const candidate = path.join(storyFolder, 'story_images', `slide_${i + 1}.${ext}`);
          if (fs.existsSync(candidate)) {
            imgPath = candidate;
            break;
          }
        }
      }

      // Resolve Audio Path (with URL decoding)
      let audioPath = '';
      if (slide.voiceFile) {
        try {
          const decoded = decodeURIComponent(slide.voiceFile);
          const cleanRelVoice = decoded.replace(/^\/STORIES\/[^\/]+\//, '');
          audioPath = path.join(storyFolder, cleanRelVoice);
        } catch (e) {
          const cleanRelVoice = slide.voiceFile.replace(/^\/STORIES\/[^\/]+\//, '');
          audioPath = path.join(storyFolder, cleanRelVoice);
        }
      }
      if (!audioPath || !fs.existsSync(audioPath)) {
        // Fallback search across mp3 and wav
        const candidateMp3 = path.join(storyFolder, 'story_voice', `slide_${i + 1}.mp3`);
        const candidateWav = path.join(storyFolder, 'story_voice', `slide_${i + 1}.wav`);
        audioPath = fs.existsSync(candidateMp3) ? candidateMp3 : (fs.existsSync(candidateWav) ? candidateWav : '');
      }

      if (!imgPath || !fs.existsSync(imgPath)) {
        console.warn(`[Video Service] Slide ${i + 1} image not found on disk, skipping segment.`);
        continue;
      }

      // Measure audio duration (auto-repairing header if needed)
      const duration = await getAudioDuration(audioPath);
      // Extra 0.5s pause between slides for natural storytelling pace
      const slideDuration = Math.max(duration + 0.5, 3.0);

      const currentProgress = Math.round(10 + (i / totalSlides) * 75);
      onProgress(currentProgress, `Rendering slide ${i + 1} of ${totalSlides}...`);
      console.log(`[Video Service] Rendering slide segment ${i + 1}/${totalSlides} (duration: ${slideDuration.toFixed(2)}s)...`);

      await renderSlideSegment({
        imagePath: imgPath,
        audioPath,
        duration: slideDuration,
        outputPath: segmentOutPath
      });

      segmentPaths.push(segmentOutPath);
    }

    if (segmentPaths.length === 0) {
      throw new Error('No valid slide video segments could be created.');
    }

    onProgress(90, 'Stitching video segments together...');
    console.log(`[Video Service] Stitching ${segmentPaths.length} slide segments into final MP4...`);

    await concatenateSegments(segmentPaths, finalVideoPath);

    onProgress(100, 'Video completed successfully!');
    console.log(`[Video Service] Successfully generated story video: ${finalVideoPath}`);

    // Clean up temporary segment files
    segmentPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    try { fs.rmdirSync(tempSegmentsDir); } catch (e) {}

    const encodedFolder = encodeURIComponent(safeFolder);
    return `/STORIES/${encodedFolder}/story_video.mp4?v=${Date.now()}`;
  } catch (err) {
    console.error('[Video Service] Generation failed:', err);
    // Cleanup on failure
    segmentPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    try { fs.rmdirSync(tempSegmentsDir); } catch (e) {}
    throw err;
  }
}

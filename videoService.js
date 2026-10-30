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
 * Measure audio file duration in seconds using ffprobe
 */
export function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      return resolve(5.0); // Fallback duration if audio is absent
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata || !metadata.format || !metadata.format.duration) {
        console.warn(`[Video Service] ffprobe duration notice for ${path.basename(filePath)}:`, err?.message);
        return resolve(5.0);
      }
      const dur = parseFloat(metadata.format.duration);
      resolve(dur > 0 ? dur : 5.0);
    });
  });
}

/**
 * Render a single slide into an MP4 video segment
 */
function renderSlideSegment({ imagePath, audioPath, duration, outputPath }) {
  return new Promise((resolve, reject) => {
    const hasAudio = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0;
    
    let command = ffmpeg();

    // Input 1: Image looped for duration
    command.input(imagePath)
      .loop(duration)
      .inputOptions(['-framerate 25']);

    // Input 2: Audio or silent audio fallback
    if (hasAudio) {
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

      // Resolve Image Path
      let imgPath = '';
      if (slide.imageFile) {
        const cleanRelImg = slide.imageFile.replace(/^\/STORIES\/[^\/]+\//, '');
        imgPath = path.join(storyFolder, cleanRelImg);
      }
      if (!imgPath || !fs.existsSync(imgPath)) {
        // Fallback search
        const fallback1 = path.join(storyFolder, 'story_images', `slide_${i + 1}.png`);
        const fallback2 = path.join(storyFolder, 'story_images', `slide_${i + 1}.jpg`);
        imgPath = fs.existsSync(fallback1) ? fallback1 : (fs.existsSync(fallback2) ? fallback2 : '');
      }

      // Resolve Audio Path
      let audioPath = '';
      if (slide.voiceFile) {
        const cleanRelVoice = slide.voiceFile.replace(/^\/STORIES\/[^\/]+\//, '');
        audioPath = path.join(storyFolder, cleanRelVoice);
      }
      if (!audioPath || !fs.existsSync(audioPath)) {
        const fallbackAudio = path.join(storyFolder, 'story_voice', `slide_${i + 1}.mp3`);
        audioPath = fs.existsSync(fallbackAudio) ? fallbackAudio : '';
      }

      if (!imgPath || !fs.existsSync(imgPath)) {
        console.warn(`[Video Service] Slide ${i + 1} image not found on disk, skipping segment.`);
        continue;
      }

      // Measure audio duration
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

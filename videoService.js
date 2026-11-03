import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import retry from 'async-retry';

dotenv.config();

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
 * Format seconds into ASS subtitle timestamp format: H:MM:SS.cc
 */
function formatAssTime(seconds) {
  const s = Math.max(0, seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const centis = Math.floor((s - Math.floor(s)) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

/**
 * Wrap long text with ASS line breaks (\N) to prevent overflow
 */
function wrapText(text, maxChars = 52) {
  if (!text || text.length <= maxChars) return text || '';
  const words = text.split(/\s+/);
  let res = '';
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).length > maxChars) {
      res += (res ? '\\N' : '') + line;
      line = w;
    } else {
      line = (line ? line + ' ' : '') + w;
    }
  }
  if (line) res += (res ? '\\N' : '') + line;
  return res;
}

/**
 * Build word-by-word timings using SSML timepoints or syllable-weighted cadence
 */
function buildWordTimings(slideText, timepoints, audioDuration) {
  const rawWords = (slideText || '').trim().split(/\s+/).filter(w => w.length > 0);
  if (rawWords.length === 0) return [];

  // 1. If real Google TTS timepoints exist, use exact millisecond marks
  if (Array.isArray(timepoints) && timepoints.length > 0) {
    const tpMap = new Map();
    timepoints.forEach(tp => {
      if (tp.markName !== undefined) {
        tpMap.set(String(tp.markName), parseFloat(tp.timeSeconds || 0));
      }
    });

    return rawWords.map((word, i) => {
      const start = tpMap.has(String(i)) ? tpMap.get(String(i)) : (i / rawWords.length) * audioDuration;
      const nextStart = tpMap.has(String(i + 1)) 
        ? tpMap.get(String(i + 1)) 
        : ((i + 1 < rawWords.length) ? ((i + 1) / rawWords.length) * audioDuration : audioDuration);
      const dur = Math.max(0.12, nextStart - start);
      return {
        word,
        start,
        duration: dur,
        centis: Math.max(10, Math.round(dur * 100))
      };
    });
  }

  // 2. Fallback: Character & punctuation weighted timing
  const weights = rawWords.map(w => {
    // Strip Arabic diacritics for accurate syllable root weighting
    const clean = w.replace(/[\u064B-\u065F\u0670]/g, '');
    const base = Math.max(1, clean.length);
    const pause = /[.،؛!؟:,\n]$/.test(w) ? 2.5 : 0;
    return base + pause;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let currentSec = 0;
  return rawWords.map((word, i) => {
    const durSec = (weights[i] / totalWeight) * audioDuration;
    const start = currentSec;
    currentSec += durSec;
    return {
      word,
      start,
      duration: durSec,
      centis: Math.max(10, Math.round(durSec * 100))
    };
  });
}

/**
 * Group words into readable subtitle chunks (5 to 8 words per line)
 */
function chunkSlideWords(wordTimings, maxWordsPerChunk = 7) {
  const chunks = [];
  let current = [];
  for (let i = 0; i < wordTimings.length; i++) {
    current.push(wordTimings[i]);
    const isPunctuation = /[.،؛!؟:,\n]$/.test(wordTimings[i].word);
    if (current.length >= maxWordsPerChunk || (isPunctuation && current.length >= 4)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Generate ASS subtitle file for a single slide with Karaoke word-by-word highlights
 */
function generateSlideAssFile({ slideText, timepoints, audioDuration, outputPath }) {
  const wordTimings = buildWordTimings(slideText, timepoints, audioDuration);
  if (wordTimings.length === 0) return null;

  const chunks = chunkSlideWords(wordTimings, 7);

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Karaoke,Dubai,48,&H00FFFFFF,&H0000D7FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,2,2,60,60,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  chunks.forEach(chunk => {
    const chunkStart = chunk[0].start;
    const lastWord = chunk[chunk.length - 1];
    const chunkEnd = lastWord.start + lastWord.duration;
    
    // Karaoke highlight tags: {\kf<centiseconds>}word
    const lineText = chunk.map(w => `{\\kf${w.centis}}${w.word}`).join(' ');
    ass += `Dialogue: 0,${formatAssTime(chunkStart)},${formatAssTime(chunkEnd)},Karaoke,,0,0,0,,${lineText}\n`;
  });

  fs.writeFileSync(outputPath, ass, 'utf8');
  return outputPath;
}

/**
 * 5 Dynamic Ken Burns Motion Presets (Pan, Zoom, Tilt)
 */
const KEN_BURNS_PRESETS = [
  // Preset 0: Smooth Zoom In towards center
  (tf) => `scale=3840:2160,zoompan=z='min(zoom+0.0015,1.18)':d=${tf}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`,
  // Preset 1: Cinematic Horizontal Pan from Left to Right
  (tf) => `scale=3840:2160,zoompan=z='1.12':d=${tf}:x='(iw-iw/zoom)*(on/${tf})':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`,
  // Preset 2: Smooth Zoom Out from Close-Up to Wide
  (tf) => `scale=3840:2160,zoompan=z='max(1.18-(on/${tf})*0.18,1.0)':d=${tf}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`,
  // Preset 3: Cinematic Horizontal Pan from Right to Left
  (tf) => `scale=3840:2160,zoompan=z='1.12':d=${tf}:x='(iw-iw/zoom)*(1-on/${tf})':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25`,
  // Preset 4: Dynamic Tilt Up from Bottom to Top
  (tf) => `scale=3840:2160,zoompan=z='1.12':d=${tf}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/${tf})':s=1920x1080:fps=25`
];

/**
 * Generate Outro Moral and Question via Gemini API
 */
async function fetchGeminiOutroData({ title, category, storyText, lang = 'ar' }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(title || storyText || '');
  const excerpt = (storyText || '').slice(0, 1500);

  const prompt = `You are an expert children's literature educator.
For this children's story:
Title: "${title}"
Category: "${category || 'general'}"
Summary Excerpt: "${excerpt}"

Generate an inspiring moral lesson and a thought-provoking comprehension/reflection question for children.
Rules:
1. In ${isArabic ? 'ARABIC with full diacritics (التشكيل الكامل)' : 'ENGLISH'}.
2. 'moral': Exactly 1 concise, inspiring sentence explaining what children learn from the story.
3. 'question': Exactly 1 engaging question encouraging children to think or imagine what they would do.

Output JSON ONLY:
{
  "moral": "...",
  "question": "..."
}`;

  const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.moral && parsed.question) {
            console.log(`[Video Service] Successfully generated outro moral & question with ${model}`);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn(`[Video Service] Gemini outro notice for ${model}:`, err.message);
    }
  }

  return null;
}

/**
 * Get or synthesize story moral and reflection question
 */
async function getStoryOutroData(story) {
  const isArabic = story.lang === 'ar' || /[\u0600-\u06FF]/.test(story.name?.ar || story.title || '');
  const storyTitle = (typeof story.name === 'object' ? (story.name.ar || story.name.en) : (story.name || story.title)) || 'القصة';

  // 1. If story already has moral / takeaway defined
  if (story.moral && story.question) {
    return { moral: story.moral, question: story.question };
  }

  // 2. Fetch from Gemini
  try {
    const allText = (story.slides || []).map(s => s.text).join(' ');
    const geminiResult = await fetchGeminiOutroData({
      title: storyTitle,
      category: story.category,
      storyText: allText,
      lang: story.lang || (isArabic ? 'ar' : 'en')
    });
    if (geminiResult) return geminiResult;
  } catch (e) {
    console.warn('[Video Service] Outro generation fallback:', e.message);
  }

  // 3. High quality fallback tailored to category & language
  if (isArabic) {
    return {
      moral: 'نَتَعَلَّمُ أَنَّ الْعَطَاءَ، وَالصِّدْقَ، وَالتَّعَاوُنَ هِيَ أَجْمَلُ الْقِيَمِ الَّتِي تُنِيرُ طَرِيقَنَا نَحْوَ النَّجَاحِ.',
      question: `لَوْ كُنْتَ مَكَانَ بَطَلِ قِصَّةِ "${storyTitle}"، كَيْفَ كُنْتَ سَتَتَصَرَّفُ فِي نِهَايَةِ الرِّحْلَةِ؟`
    };
  } else {
    return {
      moral: 'We learn that kindness, courage, and cooperation are the keys to overcoming any challenge.',
      question: `If you were the hero of "${storyTitle}", what would you have done differently?`
    };
  }
}

/**
 * Render Closing Moral & Question Outro Card (7.5 seconds)
 */
async function renderOutroSegment({ story, outputPath, tempSubsDir }) {
  const outroData = await getStoryOutroData(story);
  const isArabic = story.lang === 'ar' || /[\u0600-\u06FF]/.test(story.name?.ar || story.title || '');

  const headerText = isArabic ? '✨ مَاذَا تَعَلَّمْنَا مِنَ القِصَّةِ؟ ✨' : '✨ What Did We Learn? ✨';
  const cleanMoral = wrapText(outroData.moral, 52);
  const cleanQuestion = wrapText(outroData.question, 56);

  const assFileName = `outro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.ass`;
  const outroAssAbsPath = path.join(tempSubsDir, assFileName);
  const outroAssRelPath = `.temp_video_subtitles/${assFileName}`.replace(/\\/g, '/');

  const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: OutroHeader,Dubai,56,&H0000D7FF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,2,8,80,80,130,1
Style: OutroMoral,Dubai,42,&H00FFFFFF,&H0000D7FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,2,5,100,100,20,1
Style: OutroQuestion,Dubai,40,&H007DF9FF,&H0000D7FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,2,2,100,100,130,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:07.50,OutroHeader,,0,0,0,,{\\fad(500,500)}${headerText}
Dialogue: 0,0:00:00.80,0:00:07.50,OutroMoral,,0,0,0,,{\\fad(500,500)}🌟 العِبرَة:\\N"${cleanMoral}"
Dialogue: 0,0:00:02.00,0:00:07.50,OutroQuestion,,0,0,0,,{\\fad(500,500)}💡 سُؤَالٌ لِلْمُنَاقَشَة:\\N${cleanQuestion}
`;

  fs.writeFileSync(outroAssAbsPath, assContent, 'utf8');

  const outroDur = 7.5;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=c=0x0f172a:s=1920x1080:d=${outroDur}`)
      .inputFormat('lavfi')
      .input('anullsrc=channel_layout=stereo:sample_rate=44100')
      .inputFormat('lavfi')
      .outputOptions([
        '-vf', `ass=${outroAssRelPath}:fontsdir=Fonts,fade=t=in:st=0:d=0.5,fade=t=out:st=7.0:d=0.5,format=yuv420p`,
        '-c:v libx264',
        '-preset fast',
        '-c:a aac',
        '-b:a 128k',
        '-t', `${outroDur}`,
        '-movflags +faststart'
      ])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(outroAssAbsPath); } catch (e) {}
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(outroAssAbsPath); } catch (e) {}
        console.error('[Video Service] Outro render error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Render a single slide into an MP4 video segment with Ken Burns camera motion,
 * synchronized Karaoke subtitles, and smooth scene fade transitions.
 */
function renderSlideSegment({
  imagePath,
  audioPath,
  slideText,
  timepoints,
  duration,
  outputPath,
  presetIndex = 0,
  tempSubsDir
}) {
  return new Promise(async (resolve, reject) => {
    // Probe audio to check if it has a valid, decodable audio stream
    const audioProbe = await probeAudio(audioPath);
    const useRealAudio = audioProbe.isValid;

    let command = ffmpeg();

    // Input 0: Image looped for slideDuration
    command.input(imagePath)
      .loop(duration)
      .inputOptions(['-framerate 25']);

    // Input 1: Real audio or silent lavfi audio fallback
    if (useRealAudio) {
      command.input(audioPath);
    } else {
      command.input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi');
    }

    const totalFrames = Math.round(duration * 25);
    const motionFilterFn = KEN_BURNS_PRESETS[presetIndex % KEN_BURNS_PRESETS.length];
    const motionFilter = motionFilterFn(totalFrames);

    // Build subtitle file if slide text is available
    let assRelPath = null;
    let assAbsPath = null;
    if (slideText && slideText.trim().length > 0) {
      const assFileName = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.ass`;
      assAbsPath = path.join(tempSubsDir, assFileName);
      assRelPath = `.temp_video_subtitles/${assFileName}`.replace(/\\/g, '/');

      generateSlideAssFile({
        slideText,
        timepoints,
        audioDuration: audioProbe.duration,
        outputPath: assAbsPath
      });
    }

    // Compose video filter chain
    const filterParts = [motionFilter];
    if (assRelPath && fs.existsSync(assAbsPath)) {
      filterParts.push(`ass=${assRelPath}:fontsdir=Fonts`);
    }

    // Smooth scene transitions: fade-in at start, fade-out at end
    const fadeOutStart = Math.max(0.5, duration - 0.35).toFixed(2);
    filterParts.push(`fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.35,format=yuv420p`);

    const vfChain = filterParts.join(',');

    command
      .outputOptions([
        '-vf', vfChain,
        '-c:v libx264',
        '-preset fast',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-movflags +faststart'
      ])
      .duration(duration)
      .output(outputPath)
      .on('end', () => {
        if (assAbsPath) {
          try { fs.unlinkSync(assAbsPath); } catch (e) {}
        }
        resolve(outputPath);
      })
      .on('error', (err) => {
        if (assAbsPath) {
          try { fs.unlinkSync(assAbsPath); } catch (e) {}
        }
        console.error(`[Video Service] Slide segment render error:`, err.message);
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
 * Generate full vibrant story video:
 * - Ken Burns camera motion presets across scenes
 * - Synchronized Karaoke word-by-word highlighted subtitles
 * - Smooth fade scene transitions
 * - Interactive Moral and Comprehension Question Outro suffix
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

  // Clean relative subtitle path to avoid Windows bracket/colon filter escaping issues
  const tempSubsDir = path.resolve('.temp_video_subtitles');
  if (!fs.existsSync(tempSubsDir)) {
    fs.mkdirSync(tempSubsDir, { recursive: true });
  }

  const totalSlides = story.slides.length;
  const segmentPaths = [];

  const storyTitle = (typeof story.name === 'object' ? (story.name.ar || story.name.en) : (story.name || story.title)) || story.id;
  console.log(`[Video Service] Starting vibrant video generation for: "${storyTitle}" (${totalSlides} slides)`);
  onProgress(5, 'Preparing camera motion and subtitle tracks...');

  try {
    for (let i = 0; i < totalSlides; i++) {
      const slide = story.slides[i];
      const segmentOutPath = path.join(tempSegmentsDir, `segment_${i}.mp4`);

      // Resolve Image Path
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

      // Resolve Audio Path
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

      // Read timepoints file if available
      let timepoints = null;
      const tpCandidate1 = path.join(storyFolder, 'story_voice', `slide_${i + 1}_timepoints.json`);
      const tpCandidate2 = path.join(storyFolder, `slide_${i + 1}_timepoints.json`);
      const tpFile = fs.existsSync(tpCandidate1) ? tpCandidate1 : (fs.existsSync(tpCandidate2) ? tpCandidate2 : null);
      if (tpFile) {
        try {
          timepoints = JSON.parse(fs.readFileSync(tpFile, 'utf8'));
        } catch (e) {
          console.warn(`[Video Service] Timepoints parse notice for slide ${i + 1}:`, e.message);
        }
      }

      // Measure audio duration
      const audioDuration = await getAudioDuration(audioPath);
      // Give 0.6s breathing room for natural storytelling and smooth cross-slide fade
      const slideDuration = Math.max(audioDuration + 0.6, 3.5);

      const currentProgress = Math.round(10 + (i / totalSlides) * 70);
      onProgress(currentProgress, `Rendering slide ${i + 1} of ${totalSlides} (motion & karaoke subtitles)...`);
      console.log(`[Video Service] Rendering slide ${i + 1}/${totalSlides} (duration: ${slideDuration.toFixed(2)}s, preset: ${i % KEN_BURNS_PRESETS.length})...`);

      await renderSlideSegment({
        imagePath: imgPath,
        audioPath,
        slideText: slide.text || '',
        timepoints,
        duration: slideDuration,
        outputPath: segmentOutPath,
        presetIndex: i,
        tempSubsDir
      });

      segmentPaths.push(segmentOutPath);
    }

    if (segmentPaths.length === 0) {
      throw new Error('No valid slide video segments could be created.');
    }

    // Render Closing Moral & Question Outro Card
    onProgress(82, 'Generating interactive moral & reflection outro...');
    console.log('[Video Service] Rendering closing moral and question outro card...');
    const outroOutPath = path.join(tempSegmentsDir, `segment_outro.mp4`);
    await renderOutroSegment({
      story,
      outputPath: outroOutPath,
      tempSubsDir
    });
    segmentPaths.push(outroOutPath);

    onProgress(90, 'Stitching animated scenes and outro into final video...');
    console.log(`[Video Service] Stitching ${segmentPaths.length} video scenes into final MP4...`);

    await concatenateSegments(segmentPaths, finalVideoPath);

    onProgress(100, 'Video created successfully!');
    console.log(`[Video Service] Successfully generated vibrant story video: ${finalVideoPath}`);

    // Clean up temporary segment and subtitle files
    segmentPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    try { fs.rmdirSync(tempSegmentsDir); } catch (e) {}
    try {
      const leftoverSubs = fs.readdirSync(tempSubsDir);
      leftoverSubs.forEach(f => {
        try { fs.unlinkSync(path.join(tempSubsDir, f)); } catch (e) {}
      });
      fs.rmdirSync(tempSubsDir);
    } catch (e) {}

    const encodedFolder = encodeURIComponent(safeFolder);
    return `/STORIES/${encodedFolder}/story_video.mp4?v=${Date.now()}`;
  } catch (err) {
    console.error('[Video Service] Generation failed:', err);
    // Cleanup on failure
    segmentPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    try { fs.rmdirSync(tempSegmentsDir); } catch (e) {}
    try { fs.rmdirSync(tempSubsDir); } catch (e) {}
    throw err;
  }
}

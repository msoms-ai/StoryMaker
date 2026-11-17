import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import retry from 'async-retry';

dotenv.config();

// Configure ffmpeg & ffprobe binary paths
try {
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  if (ffprobeInstaller && ffprobeInstaller.path) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }
} catch (e) {
  console.warn('[AI Veo Service] Warning configuring ffmpeg paths:', e.message);
}

/**
 * 5 Dynamic Ken Burns Motion Presets (Pan, Zoom, Tilt)
 * High-fidelity fallback when AI video generation is quota-limited or unavailable.
 */
export const KEN_BURNS_PRESETS = [
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
 * Build rich, dynamic motion prompts tailored for children's storybook illustrations
 */
export function buildVeoMotionPrompt({ motionPrompt = '', slideText = '' } = {}) {
  const baseInstruction = 'Cinematic storybook animation, smooth subtle camera sweep, characters breathing gently and blinking, ambient environmental motion such as foliage swaying softly, fabric moving in gentle breeze, warm ambient light flickering, highly stable and realistic organic motion, 4k ultra-high definition, award-winning cinematography, no distortions.';

  const contextPart = motionPrompt?.trim()
    ? motionPrompt.trim()
    : (slideText?.trim() ? `Motion reflecting scene: ${slideText.trim().substring(0, 200)}` : '');

  return contextPart ? `${contextPart}. ${baseInstruction}` : baseInstruction;
}

/**
 * Detect image MIME type based on file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    default: return 'image/png';
  }
}

/**
 * Ken Burns Fallback Clip Renderer
 * Renders high-fidelity Ken Burns motion video from static illustration.
 */
export function renderKenBurnsFallbackClip({
  imagePath,
  durationSeconds = 5,
  outputPath,
  presetIndex = 0
}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(imagePath)) {
      return reject(new Error(`Source image does not exist: ${imagePath}`));
    }

    const dur = Math.max(1.0, parseFloat(durationSeconds) || 5.0);
    const totalFrames = Math.round(dur * 25);
    const presetFn = KEN_BURNS_PRESETS[presetIndex % KEN_BURNS_PRESETS.length];
    const motionFilter = `${presetFn(totalFrames)},format=yuv420p`;

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    ffmpeg()
      .input(imagePath)
      .loop(dur)
      .inputOptions(['-framerate 25'])
      .outputOptions([
        '-vf', motionFilter,
        '-c:v libx264',
        '-preset ultrafast',
        '-t', `${dur}`,
        '-movflags +faststart'
      ])
      .duration(dur)
      .output(outputPath)
      .on('end', () => {
        resolve({
          success: true,
          mode: 'kenburns_fallback',
          outputPath
        });
      })
      .on('error', (err) => {
        console.error('[AI Veo Service] Ken Burns fallback render error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Sleep helper for polling intervals
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll long-running video generation operation until completed
 */
async function pollVeoOperation({ operationName, apiKey, maxWaitMs = 180000, pollIntervalMs = 5000 }) {
  const startTime = Date.now();
  const cleanOpName = operationName.replace(/^\/+/, '');
  const pollUrl = cleanOpName.startsWith('http')
    ? (cleanOpName.includes('key=') ? cleanOpName : `${cleanOpName}?key=${apiKey}`)
    : `https://generativelanguage.googleapis.com/v1beta/${cleanOpName}?key=${apiKey}`;

  console.log(`[AI Veo Service] Polling video operation: ${cleanOpName.substring(0, 80)}...`);

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(pollIntervalMs);

    try {
      const res = await fetch(pollUrl, {
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[AI Veo Service] Operation polling notice (status ${res.status}): ${errorText.substring(0, 150)}`);
        // If not found or forbidden, break to allow fallback
        if (res.status === 404 || res.status === 403) {
          throw new Error(`Operation polling failed with status ${res.status}`);
        }
        continue;
      }

      const opData = await res.json();

      if (opData.error) {
        throw new Error(opData.error.message || `Operation failed: ${JSON.stringify(opData.error)}`);
      }

      if (opData.done) {
        console.log('[AI Veo Service] Veo video generation operation completed!');
        return opData;
      }
    } catch (pollErr) {
      if (pollErr.message && pollErr.message.includes('polling failed')) {
        throw pollErr;
      }
      console.warn('[AI Veo Service] Transient polling error, continuing retry:', pollErr.message);
    }
  }

  throw new Error(`Veo video generation timed out after ${Math.round(maxWaitMs / 1000)} seconds.`);
}

/**
 * Download generated video file from URI or base64 response into outputPath
 */
async function saveGeneratedVideoFile({ opData, apiKey, outputPath }) {
  // 1. Look for generated video object
  const generatedVideos = opData.response?.generatedVideos
    || opData.result?.generatedVideos
    || opData.response?.videos
    || [];

  const firstVideo = generatedVideos[0];

  // 2. Direct base64 payload
  const base64Data = firstVideo?.video?.bytesBase64Encoded
    || firstVideo?.bytesBase64Encoded
    || opData.response?.predictions?.[0]?.bytesBase64Encoded;

  if (base64Data) {
    const videoBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(outputPath, videoBuffer);
    console.log(`[AI Veo Service] Saved video from Base64 to ${outputPath} (${videoBuffer.length} bytes)`);
    return outputPath;
  }

  // 3. Downloadable URI
  let videoUri = firstVideo?.video?.uri
    || firstVideo?.video?.downloadUrl
    || firstVideo?.uri
    || opData.response?.videoUri;

  if (!videoUri) {
    throw new Error('No downloadable video URI or base64 bytes found in Veo operation response.');
  }

  // Ensure Google API Key is passed for Generative Language storage endpoints
  if (videoUri.includes('generativelanguage.googleapis.com') && !videoUri.includes('key=')) {
    videoUri += (videoUri.includes('?') ? '&' : '?') + `key=${apiKey}`;
  }

  console.log(`[AI Veo Service] Downloading generated video from: ${videoUri.substring(0, 100)}...`);

  const downloadRes = await fetch(videoUri, {
    headers: {
      'x-goog-api-key': apiKey
    }
  });

  if (!downloadRes.ok) {
    throw new Error(`Failed to download generated video asset: ${downloadRes.status} ${downloadRes.statusText}`);
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buffer);

  console.log(`[AI Veo Service] Successfully saved generated Veo video to ${outputPath} (${buffer.length} bytes)`);
  return outputPath;
}

/**
 * Generate Veo Motion Video Clip
 *
 * Core Initiative 2 implementation:
 * 1. Reads illustration image & encodes to base64 inlineData.
 * 2. Calls Google Veo video generation REST API (veo-3.1-fast-generate-preview or veo-3.1-generate-001).
 * 3. Sends prompt with motion instructions (camera sweep, character breathing, wind, ambient dynamics).
 * 4. Polls long-running operation until `done: true`.
 * 5. Downloads and saves MP4 to `outputPath`.
 * 6. Includes robust retry and graceful fallback to Ken Burns rendering if Veo is quota-limited or unavailable.
 *
 * @param {Object} options
 * @param {string} options.imagePath - Path to source illustration image
 * @param {string} [options.motionPrompt] - Text description of desired motion dynamics
 * @param {string} [options.slideText] - Story slide text context
 * @param {number} [options.durationSeconds=5] - Target video duration in seconds
 * @param {string} options.outputPath - Destination path for MP4 file
 * @param {number} [options.presetIndex=0] - Fallback Ken Burns preset index
 * @returns {Promise<{ success: boolean, mode: 'veo' | 'kenburns_fallback', outputPath: string, model?: string }>}
 */
export async function generateVeoMotionClip({
  imagePath,
  motionPrompt = '',
  slideText = '',
  durationSeconds = 5,
  outputPath,
  presetIndex = 0
}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Source illustration image not found: ${imagePath}`);
  }

  if (!outputPath) {
    throw new Error('outputPath is required for generateVeoMotionClip');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const targetDuration = Math.min(Math.max(Math.round(durationSeconds || 5), 4), 8);
  const fullMotionPrompt = buildVeoMotionPrompt({ motionPrompt, slideText });

  // Read illustration and convert to Base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = getMimeType(imagePath);

  // Candidate Veo models in order of preference
  const candidateModels = [
    'veo-3.1-fast-generate-preview',
    'veo-3.1-generate-001',
    'veo-2.0-generate-001'
  ];

  if (apiKey) {
    for (const model of candidateModels) {
      try {
        console.log(`[AI Veo Service] Attempting video generation with model: ${model}...`);

        let operationName = null;

        // 1. Try standard generateVideos endpoint
        const generateVideosUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateVideos?key=${apiKey}`;
        const genVideosBody = {
          prompt: fullMotionPrompt,
          image: {
            inlineData: {
              mimeType,
              data: base64Image
            }
          },
          videoConfig: {
            durationSeconds: targetDuration,
            aspectRatio: '16:9',
            resolution: '720p'
          }
        };

        const res1 = await fetch(generateVideosUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(genVideosBody)
        });

        if (res1.ok) {
          const data1 = await res1.json();
          operationName = data1.name || data1.operation?.name;
        } else {
          const errText1 = await res1.text();
          console.warn(`[AI Veo Service] generateVideos for ${model} returned ${res1.status}: ${errText1.substring(0, 120)}`);

          // 2. Fallback to predictLongRunning with instances format if generateVideos was unsupported/404/400
          if (res1.status === 404 || res1.status === 400) {
            const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`;
            const predictBody = {
              instances: [
                {
                  prompt: fullMotionPrompt,
                  image: {
                    bytesBase64Encoded: base64Image,
                    mimeType
                  }
                }
              ],
              parameters: {
                durationSeconds: targetDuration,
                aspectRatio: '16:9',
                resolution: '720p'
              }
            };

            const res2 = await fetch(predictUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify(predictBody)
            });

            if (res2.ok) {
              const data2 = await res2.json();
              operationName = data2.name || data2.operation?.name;
            } else {
              const errText2 = await res2.text();
              console.warn(`[AI Veo Service] predictLongRunning for ${model} returned ${res2.status}: ${errText2.substring(0, 120)}`);
            }
          }
        }

        // If an operation was successfully created, poll and save
        if (operationName) {
          const opData = await pollVeoOperation({
            operationName,
            apiKey,
            maxWaitMs: 180000,
            pollIntervalMs: 5000
          });

          await saveGeneratedVideoFile({ opData, apiKey, outputPath });

          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
            console.log(`[AI Veo Service] Successfully rendered Veo motion clip (${model}) -> ${outputPath}`);
            return {
              success: true,
              mode: 'veo',
              model,
              outputPath
            };
          }
        }
      } catch (modelErr) {
        console.warn(`[AI Veo Service] Notice for model ${model}:`, modelErr.message);
      }
    }
  } else {
    console.warn('[AI Veo Service] GEMINI_API_KEY is not defined in environment.');
  }

  // Graceful fallback to Ken Burns rendering if Veo is quota-limited, preview deprecated, or unavailable
  console.log(`[AI Veo Service] Falling back to Ken Burns motion rendering (preset: ${presetIndex})...`);
  await renderKenBurnsFallbackClip({
    imagePath,
    durationSeconds: targetDuration,
    outputPath,
    presetIndex
  });

  return {
    success: true,
    mode: 'kenburns_fallback',
    outputPath
  };
}

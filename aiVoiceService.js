import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import textToSpeech from '@google-cloud/text-to-speech';
import retry from 'async-retry';

import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use explicit absolute path to ensure Plesk Passenger finds the credentials
const client = new textToSpeech.TextToSpeechClient({
  keyFilename: path.join(__dirname, 'google-credentials.json')
});

/**
 * Generate Voice Narration Audio exclusively using Google Cloud Neural2 TTS API
 */
export async function generateAndSaveSlideVoice({
  slideText,
  slideIndex,
  outputDir,
  lang = 'ar',
  voiceGender = 'male'
}) {
  console.log(`[AI Voice Service] Generating Voice Narration for Slide ${slideIndex + 1} via Google Cloud Chirp3-HD...`);
  
  const fileName = `slide_${slideIndex + 1}.mp3`;
  const filePath = path.join(outputDir, fileName);
  const timepointsFileName = `slide_${slideIndex + 1}_timepoints.json`;
  const timepointsFilePath = path.join(outputDir, timepointsFileName);

  // Split into words cleanly and wrap each with a mark tag
  // Trim words properly so word indices align cleanly with frontend timepoints
  const words = (slideText || '').trim().split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
  let ssmlText = '<speak>';
  words.forEach((word, idx) => {
    // Only escape XML special characters (&, <, >) to avoid breaking apostrophes (don't, it's) or quotes in English words
    const safeWord = word
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    ssmlText += `<mark name="${idx}"/> ${safeWord} `;
  });
  ssmlText += '</speak>';

  const request = {
    input: { ssml: ssmlText },
    voice: {
      languageCode: lang === 'ar' ? 'ar-XA' : 'en-US',
      name: lang === 'ar' 
        ? (voiceGender === 'female' ? 'ar-XA-Chirp3-HD-Aoede' : 'ar-XA-Chirp3-HD-Puck') 
        : (voiceGender === 'female' ? 'en-US-Chirp3-HD-Aoede' : 'en-US-Chirp3-HD-Puck')
    },
    audioConfig: { 
      audioEncoding: 'MP3',
      speakingRate: 0.95 // slightly slower for better storytelling pace
    },
    enableTimePointing: ['SSML_MARK']
  };

  try {
    const [response] = await retry(
      async (bail, attempt) => {
        try {
          return await client.synthesizeSpeech(request);
        } catch (err) {
          const status = err.status || err.statusCode || err.code;
          const msg = (err.message || '').toLowerCase();
          // Retry on 429, 503, Resource Exhausted, Unavailable, and network timeouts
          const isRetryable =
            status === 429 ||
            status === 503 ||
            status === 8 || // gRPC RESOURCE_EXHAUSTED
            status === 14 || // gRPC UNAVAILABLE
            msg.includes('429') ||
            msg.includes('503') ||
            msg.includes('resource_exhausted') ||
            msg.includes('unavailable') ||
            msg.includes('rate limit') ||
            msg.includes('econnreset') ||
            msg.includes('etimedout');

          if (isRetryable) {
            throw err;
          }
          bail(err);
        }
      },
      {
        retries: 3,
        minTimeout: 1500,
        factor: 2,
        onRetry: (err, attempt) => {
          console.warn(`[AI Voice Service] Retrying TTS synthesis (attempt ${attempt})...`);
        }
      }
    );

    fs.writeFileSync(filePath, response.audioContent, 'binary');
    
    // Save the timepoints data
    if (response.timepoints && response.timepoints.length > 0) {
      fs.writeFileSync(timepointsFilePath, JSON.stringify(response.timepoints, null, 2));
    }
    
    console.log(`[AI Voice Service] Successfully saved Chirp3-HD AI Voiceover and Timepoints: ${fileName}`);
    return fileName;
  } catch (err) {
    console.error(`[AI Voice Service] Google Cloud TTS error for Slide ${slideIndex + 1}: ${err.message}`);
    
    // Save the exact error to a text file so we can debug it on Plesk
    const errorLogPath = path.join(outputDir, `error_slide_${slideIndex + 1}.txt`);
    fs.writeFileSync(errorLogPath, `Google Cloud TTS Error: ${err.message}\nStack: ${err.stack}`);
    
    // Create a 0-byte file to trigger frontend Web Speech fallback gracefully
    fs.writeFileSync(filePath, Buffer.alloc(0));
    return fileName;
  }
}

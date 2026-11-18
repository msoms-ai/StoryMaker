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
 * Resolve Google Cloud TTS Voice dynamically based on character role and language
 */
function resolveVoiceSelection(lang, voiceGender = 'male', voiceRole = null) {
  const isArabic = lang === 'ar';
  const role = (voiceRole || '').toLowerCase();

  if (isArabic) {
    if (role.includes('child_female') || role.includes('girl') || role.includes('بنت') || role.includes('طفلة')) {
      return { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-D', pitch: 2.5, speakingRate: 0.95 };
    }
    if (role.includes('child_male') || role.includes('boy') || role.includes('ولد') || role.includes('طفل')) {
      return { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-C', pitch: 2.5, speakingRate: 0.95 };
    }
    if (role.includes('female') || role.includes('mother') || role.includes('teacher') || role.includes('أم') || role.includes('معلمة') || voiceGender === 'female') {
      return { languageCode: 'ar-XA', name: 'ar-XA-Chirp3-HD-Aoede', pitch: 0.0, speakingRate: 0.95 };
    }
    return { languageCode: 'ar-XA', name: 'ar-XA-Chirp3-HD-Puck', pitch: 0.0, speakingRate: 0.95 };
  } else {
    // English
    if (role.includes('child_female') || role.includes('girl')) {
      return { languageCode: 'en-US', name: 'en-US-Neural2-C', pitch: 2.5, speakingRate: 0.95 };
    }
    if (role.includes('child_male') || role.includes('boy')) {
      return { languageCode: 'en-US', name: 'en-US-Neural2-A', pitch: 2.5, speakingRate: 0.95 };
    }
    if (role.includes('elderly') || role.includes('grandfather') || role.includes('grandmother')) {
      return { languageCode: 'en-US', name: 'en-US-Neural2-D', pitch: -2.0, speakingRate: 0.90 };
    }
    if (role.includes('female') || role.includes('mother') || role.includes('teacher') || voiceGender === 'female') {
      return { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Aoede', pitch: 0.0, speakingRate: 0.95 };
    }
    return { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Puck', pitch: 0.0, speakingRate: 0.95 };
  }
}

/**
 * Build Expressive SSML with Punctuation-Aware Pauses, Dialogue Pitch Shifts, and Sync Marks
 */
export function buildExpressiveSSML(text, { lang = 'ar' } = {}) {
  const words = (text || '').trim().split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
  let ssml = '<speak>';
  let inDialogue = false;
  const wordMeta = [];

  for (let idx = 0; idx < words.length; idx++) {
    const rawWord = words[idx];
    const isQuoteStart = /^[«"“'\(]/.test(rawWord);
    const isQuoteEnd = /[»"”'\)]$/.test(rawWord);

    // Open dialogue prosody if entering quoted speech
    if (isQuoteStart && !inDialogue) {
      inDialogue = true;
      ssml += '<prosody pitch="+1.5st" rate="98%">';
    }

    const safeWord = rawWord
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    ssml += `<mark name="${idx}"/> ${safeWord} `;

    let pauseMs = 0;
    if (/[،,]/.test(rawWord)) {
      pauseMs = 260; // Natural breath on comma
      ssml += `<break time="${pauseMs}ms"/> `;
    } else if (/[:：]/.test(rawWord)) {
      pauseMs = 320; // Pause before dialogue
      ssml += `<break time="${pauseMs}ms"/> `;
    } else if (/[؛;]/.test(rawWord)) {
      pauseMs = 360; // Moderate pause on semicolon
      ssml += `<break time="${pauseMs}ms"/> `;
    } else if (/[.!?؟!]/.test(rawWord)) {
      pauseMs = 520; // Full pause on sentence end
      if (isQuoteEnd && inDialogue) {
        ssml += '</prosody>';
        inDialogue = false;
      }
      ssml += `<break time="${pauseMs}ms"/> `;
    } else if (isQuoteEnd && inDialogue) {
      ssml += '</prosody>';
      inDialogue = false;
    }

    // Strip Arabic diacritics for character duration weighting
    const cleanChars = rawWord.replace(/[\u064B-\u065F\u0670]/g, '').length || 1;
    wordMeta.push({
      index: idx,
      word: rawWord,
      charCount: cleanChars,
      pauseMs
    });
  }

  if (inDialogue) {
    ssml += '</prosody>';
  }
  ssml += '</speak>';

  return { ssml, words, wordMeta };
}

/**
 * Generate Voice Narration Audio exclusively using Google Cloud Chirp3-HD TTS API
 */
export async function generateAndSaveSlideVoice({
  slideText,
  slideIndex,
  outputDir,
  lang = 'ar',
  voiceGender = 'male',
  voiceRole = null
}) {
  const selectedVoice = resolveVoiceSelection(lang, voiceGender, voiceRole);
  console.log(`[AI Voice Service] Generating Expressive Voice Narration for Slide ${slideIndex + 1} (${selectedVoice.name}, role: ${voiceRole || voiceGender})...`);
  
  const fileName = `slide_${slideIndex + 1}.mp3`;
  const filePath = path.join(outputDir, fileName);
  const timepointsFileName = `slide_${slideIndex + 1}_timepoints.json`;
  const timepointsFilePath = path.join(outputDir, timepointsFileName);

  const { ssml, words, wordMeta } = buildExpressiveSSML(slideText, { lang });

  const request = {
    input: { ssml },
    voice: {
      languageCode: selectedVoice.languageCode,
      name: selectedVoice.name
    },
    audioConfig: { 
      audioEncoding: 'MP3',
      speakingRate: selectedVoice.speakingRate,
      pitch: selectedVoice.pitch
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
    
    // Save or synthesize exact timepoints for the frontend karaoke reading guide
    let finalTimepoints = response.timepoints;
    if (!finalTimepoints || finalTimepoints.length === 0) {
      // Synthesize character-weighted and pause-adjusted timepoints from audio buffer length
      const estDurationSec = Math.max(1, response.audioContent.length / 4000);
      const totalChars = wordMeta.reduce((sum, w) => sum + w.charCount, 0) || 1;
      const totalPauseMs = wordMeta.reduce((sum, w) => sum + w.pauseMs, 0);
      const totalSpeechSec = Math.max(0.5, estDurationSec - (totalPauseMs / 1000));

      let currentSec = 0;
      finalTimepoints = [];

      for (const w of wordMeta) {
        finalTimepoints.push({
          markName: String(w.index),
          timeSeconds: parseFloat(currentSec.toFixed(3))
        });
        const wordDur = (w.charCount / totalChars) * totalSpeechSec;
        currentSec += wordDur + (w.pauseMs / 1000);
      }
    }

    fs.writeFileSync(timepointsFilePath, JSON.stringify(finalTimepoints, null, 2));
    
    console.log(`[AI Voice Service] Successfully saved Chirp3-HD Expressive Voiceover (${response.audioContent.length} bytes) and Timepoints: ${fileName}`);
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

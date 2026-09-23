import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import textToSpeech from '@google-cloud/text-to-speech';

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
  lang = 'ar'
}) {
  console.log(`[AI Voice Service] Generating Voice Narration for Slide ${slideIndex + 1} via Google Cloud Neural2...`);
  
  const fileName = `slide_${slideIndex + 1}.mp3`;
  const filePath = path.join(outputDir, fileName);

  const request = {
    input: { text: slideText },
    voice: {
      languageCode: lang === 'ar' ? 'ar-XA' : 'en-US',
      name: lang === 'ar' ? 'ar-XA-Neural2-B' : 'en-US-Neural2-J' 
    },
    audioConfig: { 
      audioEncoding: 'MP3',
      speakingRate: 0.95 // slightly slower for better storytelling pace
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(filePath, response.audioContent, 'binary');
    console.log(`[AI Voice Service] Successfully saved compressed Neural2 AI Voiceover: ${fileName}`);
    return fileName;
  } catch (err) {
    console.error(`[AI Voice Service] Google Cloud TTS error for Slide ${slideIndex + 1}: ${err.message}`);
    
    // Create a 0-byte file to trigger frontend Web Speech fallback gracefully
    fs.writeFileSync(filePath, Buffer.alloc(0));
    return fileName;
  }
}

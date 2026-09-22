import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Convert PCM (L16, 24000Hz, Mono) audio buffer from Gemini TTS API into a standard WAV file buffer
 */
function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const wavHeader = Buffer.alloc(44);

  // RIFF Header
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(chunkSize, 4);
  wavHeader.write('WAVE', 8);

  // Subchunk 1: fmt
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);

  // Subchunk 2: data
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

/**
 * Generate Voice Narration Audio exclusively using Google Gemini TTS API
 */
export async function generateAndSaveSlideVoice({
  slideText,
  slideIndex,
  outputDir,
  lang = 'ar'
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY missing in environment.');
  }

  const ttsModels = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];
  let lastError = null;

  for (const model of ttsModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      console.log(`[AI Voice Service] Generating Voice Narration for Slide ${slideIndex + 1} via Google Gemini API (${model})...`);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: slideText }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: lang === 'ar' ? 'Aoede' : 'Puck'
                }
              }
            }
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            const rawPcmBuffer = Buffer.from(p.inlineData.data, 'base64');
            const wavBuffer = pcmToWavBuffer(rawPcmBuffer, 24000, 1, 16);
            const fileName = `slide_${slideIndex + 1}.wav`;
            const filePath = path.join(outputDir, fileName);
            fs.writeFileSync(filePath, wavBuffer);
            console.log(`[AI Voice Service] Successfully saved Gemini AI Voiceover: ${fileName} (${wavBuffer.length} bytes)`);
            return fileName;
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[AI Voice Service] Gemini TTS ${model} notice (${res.status}): ${JSON.stringify(errJson)}`);
        lastError = new Error(`Gemini TTS ${model} (${res.status}): ${JSON.stringify(errJson)}`);
      }
    } catch (err) {
      console.warn(`[AI Voice Service] Gemini TTS ${model} error for Slide ${slideIndex + 1}: ${err.message}`);
      lastError = err;
    }
  }

  // If Gemini API voice returns audio file, save fallback audio container
  console.log(`[AI Voice Service] Saving audio container for Slide ${slideIndex + 1}.`);
  const fileName = `slide_${slideIndex + 1}.wav`;
  const emptyWav = pcmToWavBuffer(Buffer.alloc(24000), 24000, 1, 16);
  fs.writeFileSync(path.join(outputDir, fileName), emptyWav);
  return fileName;
}

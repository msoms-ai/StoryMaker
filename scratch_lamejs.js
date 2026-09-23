import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lamejs = require('lamejs');

const rawPcmBuffer = Buffer.alloc(48000); // 1 second of silence
const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 64);
const samples = new Int16Array(rawPcmBuffer.buffer, rawPcmBuffer.byteOffset, rawPcmBuffer.length / 2);
const mp3Data = [];
const sampleBlockSize = 1152;
for (let i = 0; i < samples.length; i += sampleBlockSize) {
  const sampleChunk = samples.subarray(i, i + sampleBlockSize);
  const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
  if (mp3buf.length > 0) {
    mp3Data.push(Buffer.from(mp3buf));
  }
}
const mp3buf = mp3encoder.flush();
if (mp3buf.length > 0) {
  mp3Data.push(Buffer.from(mp3buf));
}
const mp3Buffer = Buffer.concat(mp3Data);

console.log("MP3 encoded size:", mp3Buffer.length);

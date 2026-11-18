import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpressiveSSML } from '../aiVoiceService.js';

test('Voice Narration: Expressive SSML Engine', async (t) => {
  await t.test('wraps every word in sync mark tags', () => {
    const text = 'ذَهَبَ سَالِمٌ إِلَى الْمَدْرَسَةِ.';
    const { ssml, words } = buildExpressiveSSML(text, { lang: 'ar' });

    assert.strictEqual(words.length, 4);
    assert.ok(ssml.includes('<mark name="0"/>'), 'Mark 0 must be present');
    assert.ok(ssml.includes('<mark name="1"/>'), 'Mark 1 must be present');
    assert.ok(ssml.includes('<mark name="2"/>'), 'Mark 2 must be present');
    assert.ok(ssml.includes('<mark name="3"/>'), 'Mark 3 must be present');
    assert.ok(ssml.startsWith('<speak>'), 'Must start with <speak>');
    assert.ok(ssml.endsWith('</speak>'), 'Must end with </speak>');
  });

  await t.test('inserts natural pauses for commas, colons, and periods', () => {
    const text = 'فِي يَوْمٍ دَافِئٍ، قَالَتْ: مَرْحَبًا!';
    const { ssml } = buildExpressiveSSML(text, { lang: 'ar' });

    assert.ok(ssml.includes('<break time="260ms"/>'), 'Comma must produce breath pause');
    assert.ok(ssml.includes('<break time="320ms"/>'), 'Colon must produce dialogue pause');
    assert.ok(ssml.includes('<break time="520ms"/>'), 'Exclamation must produce sentence pause');
  });

  await t.test('applies character prosody pitch shifts to quoted dialogue', () => {
    const text = 'قَالَ الأَرْنَبُ: «أَنَا الأَسْرَعُ!» ثُمَّ جَرَى.';
    const { ssml } = buildExpressiveSSML(text, { lang: 'ar' });

    assert.ok(ssml.includes('<prosody pitch="+1.5st" rate="98%">'), 'Dialogue must have pitch elevation');
    assert.ok(ssml.includes('</prosody>'), 'Prosody must be closed properly');
  });
});

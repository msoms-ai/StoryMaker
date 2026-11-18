import test from 'node:test';
import assert from 'node:assert/strict';

test('Story Data Integrity & Structure Validation', async (t) => {
  await t.test('validates minimum required slide properties', () => {
    const validSlide = {
      index: 0,
      title: 'بداية الرحلة',
      text: 'انطلق سالم في رحلة شائقة.',
      imageFile: '/STORIES/story_1/story_images/slide_1.png',
      voiceFile: '/STORIES/story_1/story_voice/slide_1.mp3'
    };

    assert.ok(typeof validSlide.index === 'number');
    assert.ok(validSlide.title.length > 0);
    assert.ok(validSlide.text.length > 0);
    assert.ok(validSlide.imageFile.endsWith('.png') || validSlide.imageFile.endsWith('.jpg'));
  });

  await t.test('validates story quiz question structure', () => {
    const validQuestion = {
      id: 'q1',
      question: 'أين ذهب سالم؟',
      category: 'فهم واستيعاب',
      options: ['إلى السوق', 'إلى المدرسة', 'إلى الحديقة', 'إلى البحر'],
      correctAnswerIndex: 0,
      explanation: 'سالم اتجه مباشرة إلى السوق في بداية القصة.'
    };

    assert.strictEqual(validQuestion.options.length, 4, 'Quiz questions must have exactly 4 choices');
    assert.ok(validQuestion.correctAnswerIndex >= 0 && validQuestion.correctAnswerIndex < 4);
    assert.ok(validQuestion.explanation.length > 0);
  });
});

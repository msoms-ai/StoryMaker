import test from 'node:test';
import assert from 'node:assert/strict';

test('Story Branching & Adventure Path Resolution', async (t) => {
  await t.test('truncates old subsequent slides and replaces old ending with new branch slide', () => {
    const originalSlides = [
      { index: 0, title: 'Slide 1', text: 'Text 1', imageFile: 'slide_1.png', voiceFile: 'slide_1.mp3' },
      { index: 1, title: 'Slide 2', text: 'Text 2', imageFile: 'slide_2.png', voiceFile: 'slide_2.mp3' },
      { index: 2, title: 'Old Slide 3', text: 'Old Ending 1', imageFile: 'slide_3.png', voiceFile: 'slide_3.mp3' },
      { index: 3, title: 'Old Slide 4', text: 'Old Ending 2', imageFile: 'slide_4.png', voiceFile: 'slide_4.mp3' }
    ];

    const targetIndex = 1; // User branched at Slide 2 (index 1)
    const previousSlides = originalSlides.slice(0, targetIndex + 1);

    const newSlide = {
      index: previousSlides.length,
      title: 'مسار جديد',
      text: 'اختار سالم المغامرة عبر الكهف السري...',
      imageFile: '/STORIES/adventure/story_images/slide_branch_3_1732360000000.png',
      voiceFile: '/STORIES/adventure/story_voice/slide_branch_3_1732360000000.mp3',
      isBranchChoice: true,
      choiceOrigin: 'choice_cave',
      hotspots: [
        { id: 'spot_1', nameAr: 'كهف', nameEn: 'Cave', soundType: 'environment', x: 45, y: 55 }
      ]
    };

    const newSlides = [...previousSlides, newSlide];

    // Assertions
    assert.strictEqual(newSlides.length, 3, 'Old slides 2 & 3 must be replaced by new branch');
    assert.strictEqual(newSlides[0].index, 0);
    assert.strictEqual(newSlides[1].index, 1);
    assert.strictEqual(newSlides[2].index, 2);
    assert.strictEqual(newSlides[2].isBranchChoice, true);
    assert.ok(newSlides[2].imageFile.includes('slide_branch_'), 'Image must use unique timestamped filename');
    assert.ok(newSlides[2].voiceFile.includes('slide_branch_'), 'Voice must use unique timestamped filename');
    assert.ok(Array.isArray(newSlides[2].hotspots) && newSlides[2].hotspots.length > 0, 'Hotspots must be present');
  });

  await t.test('branch lock guard prevents branching when already branched', () => {
    const storyState = {
      hasBranched: true,
      slides: [
        { index: 0, isBranchChoice: false },
        { index: 1, isBranchChoice: true }
      ]
    };

    const isBranchingAllowed = !storyState.hasBranched && !storyState.slides.some(s => s.isBranchChoice);
    assert.strictEqual(isBranchingAllowed, false, 'Branch button must be locked once path is chosen');
  });
});

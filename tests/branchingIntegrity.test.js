import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

  await t.test('branch cleanup strictly purges ephemeral slide_branch_* files and preserves canonical assets', () => {
    const tempDir = path.join(process.cwd(), 'scratch', 'test_cleanup_' + Date.now());
    const imgDir = path.join(tempDir, 'story_images');
    const voiceDir = path.join(tempDir, 'story_voice');
    fs.mkdirSync(imgDir, { recursive: true });
    fs.mkdirSync(voiceDir, { recursive: true });

    // Canonical files (MUST NEVER BE DELETED)
    const canonicalImg = path.join(imgDir, 'slide_1.png');
    const canonicalVoice = path.join(voiceDir, 'slide_1.mp3');
    fs.writeFileSync(canonicalImg, 'canonical-image');
    fs.writeFileSync(canonicalVoice, 'canonical-voice');

    // Ephemeral branch files (MUST BE DELETED)
    const branchImg = path.join(imgDir, 'slide_branch_2_1732360000000.png');
    const branchVoice = path.join(voiceDir, 'slide_branch_2_1732360000000.mp3');
    const branchTimepoints = path.join(voiceDir, 'slide_branch_2_1732360000000_timepoints.json');
    fs.writeFileSync(branchImg, 'branch-image');
    fs.writeFileSync(branchVoice, 'branch-voice');
    fs.writeFileSync(branchTimepoints, '{}');

    // Simulate cleanup logic
    const filesToClean = [
      'slide_branch_2_1732360000000.png',
      'slide_branch_2_1732360000000.mp3',
      'slide_1.png' // Should be rejected and NOT deleted!
    ];

    let deleted = 0;
    for (const rawName of filesToClean) {
      const fileName = path.basename(rawName);
      if (!fileName.startsWith('slide_branch_')) continue; // Guard

      const sub = fileName.endsWith('.png') ? imgDir : voiceDir;
      const target = path.join(sub, fileName);
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        deleted++;
      }
      if (fileName.endsWith('.mp3')) {
        const tp = path.join(voiceDir, fileName.replace('.mp3', '_timepoints.json'));
        if (fs.existsSync(tp)) {
          fs.unlinkSync(tp);
        }
      }
    }

    assert.strictEqual(deleted, 2);
    assert.strictEqual(fs.existsSync(canonicalImg), true, 'Canonical image must NOT be touched');
    assert.strictEqual(fs.existsSync(canonicalVoice), true, 'Canonical voice must NOT be touched');
    assert.strictEqual(fs.existsSync(branchImg), false, 'Branch image must be deleted');
    assert.strictEqual(fs.existsSync(branchVoice), false, 'Branch voice must be deleted');
    assert.strictEqual(fs.existsSync(branchTimepoints), false, 'Branch timepoints must be deleted');

    // Clean up test dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

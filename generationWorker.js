import fs from 'fs';
import path from 'path';
import { generateAndSaveSlideImage } from './aiImageService.js';
import { generateAndSaveSlideVoice } from './aiVoiceService.js';

// We need a helper to read/write DB
const DB_FILE = path.join(process.cwd(), 'STORIES', 'database.json');

function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { categories: [], stories: [], users: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function processStoryGeneration(job, storyId, planData, settings, updateProgress) {
  const { title, isAiGenerated, narratorVoice, artStyle, lang, userId, authorName } = settings;
  const folderName = storyId;
  const STORIES_DIR = path.join(process.cwd(), 'STORIES');
  
  // 1. Create Directories
  const imgDir = path.join(STORIES_DIR, folderName, 'story_images');
  const voiceDir = path.join(STORIES_DIR, folderName, 'story_voices');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

  const totalSlides = planData.slides.length;
  const draftStory = {
    id: storyId,
    title: title,
    userId: userId,
    authorName: authorName,
    createdAt: new Date().toISOString(),
    isPublic: false,
    viewCount: 0,
    likes: 0,
    likedBy: [],
    completedBy: [],
    isAiGenerated: isAiGenerated,
    category: settings.category || 'general',
    coverImage: '',
    slides: []
  };

  // 2. Loop through slides
  for (let i = 0; i < totalSlides; i++) {
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating...' });
    
    let currentSlide = planData.slides[i];
    
    // A. Generate Text (If AI Generated and needs slide expansion)
    // Note: The UI passes pre-generated/analyzed text in planData. 
    // We only call generateStorySlideTextWithGemini if it's missing or requested.
    let slideText = currentSlide.text;
    
    // B. Generate Image
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating Image...' });
    const imgFilename = await generateAndSaveSlideImage(
      folderName, 
      i, 
      slideText, 
      title, 
      settings.category, 
      planData.characters || [], 
      lang, 
      '', // feedback
      artStyle
    );

    // C. Generate Voice
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating Voice...' });
    const voiceFilename = await generateAndSaveSlideVoice(
      folderName, 
      i, 
      slideText, 
      lang,
      narratorVoice || 'male'
    );

    draftStory.slides.push({
      id: `slide_${i + 1}`,
      text: slideText,
      image: imgFilename,
      audio: voiceFilename,
      timestamp: 0 
    });

    // Save intermediate progress to DB in case of crash? Not strictly necessary, but good.
    // Actually, we can wait until the end to write to DB.
  }

  updateProgress({ slideIndex: totalSlides, totalSlides, stage: 'Finalizing...' });

  // 3. Set Cover Image
  if (draftStory.slides.length > 0) {
    draftStory.coverImage = draftStory.slides[0].image;
  }

  // 4. Save to Database
  const db = readDB();
  db.stories.push(draftStory);
  writeDB(db);

  return draftStory;
}

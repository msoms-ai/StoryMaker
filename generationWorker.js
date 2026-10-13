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
  const voiceDir = path.join(STORIES_DIR, folderName, 'story_voice');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

  const totalSlides = planData.slides ? planData.slides.length : 0;
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(title);

  const draftStory = {
    id: (Date.now() % 100000).toString().padStart(4, '0'),
    folderName,
    name: {
      ar: title,
      en: title
    },
    title,
    category: settings.category || 'general',
    lang: isArabic ? 'ar' : 'en',
    readTimeMinutes: Math.ceil(totalSlides * 0.8),
    slidesCount: totalSlides,
    isAiGenerated: isAiGenerated === true,
    status: 'draft',
    authorId: userId || null,
    authorName: authorName || (isArabic ? 'مؤلف مجهول' : 'Anonymous Author'),
    readProgress: { currentSlide: 0, completed: false },
    createdAt: new Date().toISOString(),
    comments: '',
    viewCount: 0,
    likes: 0,
    likedBy: [],
    completedBy: [],
    coverImage: '',
    slides: []
  };

  // 2. Loop through slides
  for (let i = 0; i < totalSlides; i++) {
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating...' });
    
    let currentSlide = planData.slides[i];
    let slideText = currentSlide.text;
    
    // B. Generate Image
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating Image...' });
    const imgFilename = await generateAndSaveSlideImage({
      folderName, 
      slideIndex: i, 
      slideText, 
      storyTitle: title, 
      category: settings.category, 
      characters: planData.characters || [], 
      outputDir: imgDir,
      lang, 
      userFeedback: '', 
      artStyle
    });

    // C. Generate Voice
    updateProgress({ slideIndex: i, totalSlides, stage: 'Generating Voice...' });
    const voiceFilename = await generateAndSaveSlideVoice({
      outputDir: voiceDir, 
      slideIndex: i, 
      slideText, 
      lang,
      voiceGender: narratorVoice || 'male'
    });

    const encodedFolder = encodeURIComponent(folderName);
    draftStory.slides.push({
      index: i,
      title: currentSlide.title || (isArabic ? `الشريحة ${i + 1}` : `Slide ${i + 1}`),
      text: slideText,
      imageFile: `/STORIES/${encodedFolder}/story_images/${imgFilename}`,
      voiceFile: `/STORIES/${encodedFolder}/story_voice/${voiceFilename}`,
      timestamp: 0 
    });
  }

  updateProgress({ slideIndex: totalSlides, totalSlides, stage: 'Finalizing...' });

  // 3. Set Cover Image
  if (draftStory.slides.length > 0) {
    draftStory.coverImage = draftStory.slides[0].imageFile;
  }

  // 4. Save to Database
  const db = readDB();
  db.stories.unshift(draftStory);
  writeDB(db);

  return draftStory;
}

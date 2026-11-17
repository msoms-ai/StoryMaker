import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import retry from 'async-retry';

dotenv.config();

/**
 * Common vocabulary dictionary for deterministic fallback
 */
const FALLBACK_VOCABULARY_RULES = [
  {
    regex: /(شَابّ|وَلَد|طِفْل|فَتَى|صَبِيّ|رَجُل|شَخْص|boy|young|child|kid|man)/i,
    item: {
      id: 'character_boy',
      nameAr: 'الشَّابُّ المُسْتَكْشِفُ',
      nameEn: 'Young Explorer',
      box2d: [200, 350, 750, 620],
      soundType: 'footstep',
      description: 'بَطَلُ القِصَّةِ الشُّجَاعُ الَّذِي يَخُوضُ المَغَامَرَةَ.'
    }
  },
  {
    regex: /(صَحْرَاء|رِمَال|كُثْبَان|desert|sand|dune)/i,
    item: {
      id: 'desert_sand',
      nameAr: 'الرِّمَالُ الذَّهَبِيَّةُ',
      nameEn: 'Golden Sand',
      box2d: [600, 100, 950, 900],
      soundType: 'wind',
      description: 'كُثْبَانٌ رَمْلِيَّةٌ نَاعِمَةٌ تَتَلَأْلَأُ تَحْتَ الشَّمْسِ.'
    }
  },
  {
    regex: /(شَمْس|نَهَار|ضَوْء|دَافِئ|sun|warm|sunshine|daylight)/i,
    item: {
      id: 'warm_sun',
      nameAr: 'الشَّمْسُ الدَّافِئَةُ',
      nameEn: 'Warm Sun',
      box2d: [60, 750, 240, 930],
      soundType: 'sparkle',
      description: 'قُرْصُ الشَّمْسِ المُضِيءُ يَنْشُرُ الدِّفْءَ فِي الأَرْجَاءِ.'
    }
  },
  {
    regex: /(سَمَاء|سَحَاب|غُيُوم|أُفُق|sky|cloud|horizon)/i,
    item: {
      id: 'clear_sky',
      nameAr: 'السَّمَاءُ الصَّافِيَةُ',
      nameEn: 'Clear Sky',
      box2d: [30, 200, 250, 800],
      soundType: 'wind',
      description: 'سَمَاءٌ زَرْقَاءُ فَسِيحَةٌ تُعَانِقُ الأُفُقَ.'
    }
  },
  {
    regex: /(صَقْر|طَائِر|عُصْفُور|نِسْر|جَنَاح|falcon|hawk|bird|eagle)/i,
    item: {
      id: 'desert_falcon',
      nameAr: 'الصَّقْرُ الجَارِحُ',
      nameEn: 'Falcon',
      box2d: [120, 420, 290, 580],
      soundType: 'bird',
      description: 'صَقْرٌ قَوِيٌّ يُحَلِّقُ بِمَهَارَةٍ فِي الأَعَالِي.'
    }
  },
  {
    regex: /(حَدِيد|آلِيّ|رُوبُوت|رَجُل حَدِيدِيّ|robot|iron|machine)/i,
    item: {
      id: 'iron_robot',
      nameAr: 'الرَّجُلُ الحَدِيدِيُّ',
      nameEn: 'Iron Giant',
      box2d: [280, 500, 800, 780],
      soundType: 'bell',
      description: 'عِمْلَاقٌ حَدِيدِيٌّ عَجِيبٌ يَقِفُ شَامِخًا.'
    }
  },
  {
    regex: /(شَجَر|أَشْجَار|نَخْل|غَابَة|زَهْر|نَبَات|tree|palm|plant|forest)/i,
    item: {
      id: 'green_tree',
      nameAr: 'الشَّجَرَةُ الخَضْرَاءُ',
      nameEn: 'Green Tree',
      box2d: [320, 680, 820, 950],
      soundType: 'nature',
      description: 'شَجَرَةٌ نَضِرَةٌ تَمْنَحُ الظِّلَّ وَالانْتِعَاشَ.'
    }
  },
  {
    regex: /(كِتَاب|قَلَم|دَفْتَر|قِرَاءَة|book|notebook|journal)/i,
    item: {
      id: 'story_book',
      nameAr: 'الكِتَابُ القَيِّمُ',
      nameEn: 'Book',
      box2d: [620, 380, 820, 620],
      soundType: 'sparkle',
      description: 'كِتَابٌ يَحْمِلُ بَيْنَ صَفَحَاتِهِ أَسْرَارَ المَعْرِفَةِ.'
    }
  },
  {
    regex: /(خَيْمَة|مُخَيَّم|بَيْت الشَّعْر|tent|camp)/i,
    item: {
      id: 'traditional_tent',
      nameAr: 'الخَيْمَةُ البَدَوِيَّةُ',
      nameEn: 'Desert Tent',
      box2d: [480, 120, 800, 440],
      soundType: 'bell',
      description: 'خَيْمَةٌ تَقْلِيدِيَّةٌ مِضْيَافَةٌ تَقِي مِنْ حَرَارَةِ الجَوِّ.'
    }
  },
  {
    regex: /(قَمِيص|بِنْطَال|حِذَاء|حَقِيبَة|بَوْصَلَة|clothes|bag|backpack|compass|shoes)/i,
    item: {
      id: 'travel_gear',
      nameAr: 'حَقِيبَةُ المُغَامِرِ',
      nameEn: 'Explorer Backpack',
      box2d: [260, 430, 520, 580],
      soundType: 'sparkle',
      description: 'مُعِدَّاتُ وَأَدَوَاتُ الِاسْتِكْشَافِ اللَّازِمَةُ لِلرِّحْلَةِ.'
    }
  },
  {
    regex: /(مَاء|نَهْر|بَحْر|بُحَيْرَة|يَنْبُوع|water|river|sea|lake|oasis)/i,
    item: {
      id: 'pure_water',
      nameAr: 'المَاءُ العَذْبُ',
      nameEn: 'Clear Water',
      box2d: [680, 250, 920, 750],
      soundType: 'nature',
      description: 'مِيَاهٌ رَقْرَاقَةٌ صَافِيَةٌ تُنْعِشُ الرُّوحَ.'
    }
  },
  {
    regex: /(نَجْم|نُجُوم|قَمَر|لَيْل|ظَلَام|star|moon|night)/i,
    item: {
      id: 'twinkling_star',
      nameAr: 'النَّجْمَةُ السَّاطِعَةُ',
      nameEn: 'Twinkling Star',
      box2d: [70, 780, 220, 920],
      soundType: 'sparkle',
      description: 'نَجْمٌ بَرَّاقٌ يُنِيرُ ظُلْمَةَ اللَّيْلِ البَهِيمِ.'
    }
  }
];

/**
 * Generate fallback hotspots deterministically based on slide text
 */
export function generateFallbackHotspots({ slideText = '', lang = 'ar' }) {
  const matches = [];
  const text = slideText || '';

  for (const rule of FALLBACK_VOCABULARY_RULES) {
    if (rule.regex.test(text)) {
      // Clone to avoid mutation
      matches.push({ ...rule.item });
      if (matches.length >= 5) break;
    }
  }

  // If fewer than 3 items found from text, fill with default essential items
  if (matches.length < 3) {
    const defaults = [
      FALLBACK_VOCABULARY_RULES[0].item, // character
      FALLBACK_VOCABULARY_RULES[1].item, // desert/ground
      FALLBACK_VOCABULARY_RULES[3].item, // sky
      FALLBACK_VOCABULARY_RULES[2].item  // sun
    ];

    for (const def of defaults) {
      if (!matches.some(m => m.id === def.id)) {
        matches.push({ ...def });
      }
      if (matches.length >= 4) break;
    }
  }

  return matches;
}

/**
 * Resolve local image file path on disk from arbitrary URI or relative path
 */
export function resolveLocalImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;

  try {
    const cleanPath = decodeURIComponent(inputPath);

    // 1. If already an absolute path and exists
    if (path.isAbsolute(cleanPath) && fs.existsSync(cleanPath)) {
      return cleanPath;
    }

    // 2. Remove leading slash / backslash
    const stripped = cleanPath.replace(/^[/\\]+/, '');

    // 3. Check directly relative to process.cwd()
    const fromCwd = path.resolve(process.cwd(), stripped);
    if (fs.existsSync(fromCwd)) return fromCwd;

    // 4. Check inside STORIES directory
    const strippedStories = stripped.replace(/^STORIES[/\\]/, '');
    const fromStories = path.resolve(process.cwd(), 'STORIES', strippedStories);
    if (fs.existsSync(fromStories)) return fromStories;

    // 5. Check if it's within uploads
    const fromUploads = path.resolve(process.cwd(), 'uploads', stripped.replace(/^uploads[/\\]/, ''));
    if (fs.existsSync(fromUploads)) return fromUploads;
  } catch (err) {
    console.warn('[AI Hotspot Service] Warning resolving image path:', err.message);
  }

  return null;
}

/**
 * Detect image mime type from file path
 */
function getImageMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

/**
 * Validate and sanitize bounding boxes and hotspot fields
 */
function sanitizeHotspots(rawList) {
  if (!Array.isArray(rawList)) return null;

  const valid = [];
  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') continue;

    // Box2d validation: [ymin, xmin, ymax, xmax]
    let box = item.box2d;
    if (!Array.isArray(box) || box.length !== 4) continue;

    let [ymin, xmin, ymax, xmax] = box.map(Number);
    if ([ymin, xmin, ymax, xmax].some(n => isNaN(n))) continue;

    // Check if normalized 0-1, convert to 0-1000
    if (ymin <= 1 && ymax <= 1 && xmin <= 1 && xmax <= 1 && (ymax > 0 || xmax > 0)) {
      ymin = Math.round(ymin * 1000);
      xmin = Math.round(xmin * 1000);
      ymax = Math.round(ymax * 1000);
      xmax = Math.round(xmax * 1000);
    }

    // Ensure valid bounds
    ymin = Math.max(0, Math.min(1000, Math.round(ymin)));
    xmin = Math.max(0, Math.min(1000, Math.round(xmin)));
    ymax = Math.max(0, Math.min(1000, Math.round(ymax)));
    xmax = Math.max(0, Math.min(1000, Math.round(xmax)));

    if (ymax <= ymin) ymax = Math.min(1000, ymin + 100);
    if (xmax <= xmin) xmax = Math.min(1000, xmin + 100);

    const soundTypes = ['bird', 'wind', 'sparkle', 'bell', 'nature', 'footstep', 'water'];
    const soundType = soundTypes.includes(item.soundType) ? item.soundType : 'sparkle';

    valid.push({
      id: String(item.id || `spot_${i + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      nameAr: String(item.nameAr || item.name || '').trim(),
      nameEn: String(item.nameEn || item.name || '').trim(),
      box2d: [ymin, xmin, ymax, xmax],
      soundType,
      description: String(item.description || '').trim()
    });

    if (valid.length >= 6) break;
  }

  return valid.length >= 2 ? valid : null;
}

/**
 * Extract slide visual vocabulary hotspots using Gemini Multimodal Vision
 * with graceful deterministic fallback.
 *
 * @param {Object} params
 * @param {string|Buffer} params.imagePath - Path to slide image or Buffer
 * @param {string} params.slideText - Text narration of the slide
 * @param {string} [params.lang='ar'] - Language code
 * @returns {Promise<Array>} List of vocabulary hotspots
 */
export async function extractSlideVocabularyHotspots({ imagePath, slideText = '', lang = 'ar' }) {
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Locate and read the image buffer
  let imgBuffer = null;
  let mimeType = 'image/png';

  if (Buffer.isBuffer(imagePath)) {
    imgBuffer = imagePath;
  } else if (typeof imagePath === 'string') {
    const resolvedPath = resolveLocalImagePath(imagePath);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        imgBuffer = fs.readFileSync(resolvedPath);
        mimeType = getImageMimeType(resolvedPath);
      } catch (e) {
        console.warn(`[AI Hotspot Service] Could not read image at ${resolvedPath}:`, e.message);
      }
    }
  }

  // If no image buffer or no API key, use deterministic fallback
  if (!apiKey || !imgBuffer) {
    console.log(`[AI Hotspot Service] Offline/Missing image buffer or API key, using deterministic fallback hotspots.`);
    return generateFallbackHotspots({ slideText, lang });
  }

  const prompt = `Analyze this children's book illustration and the slide text. Identify 3 to 6 key visual objects or characters present in the image (e.g. boy, falcon, tent, tree, book, star).

Slide Text: "${slideText}"

For each visual object return a JSON object with this exact schema:
{
  "id": "short_unique_id",
  "nameAr": "اسم الكائن أو الشخصية باللغة العربية مع التشكيل الكامل وضبط الحركات بدقة",
  "nameEn": "English Name",
  "box2d": [ymin, xmin, ymax, xmax], // normalized 0 to 1000 coordinates marking the bounding box
  "soundType": "one of: bird, wind, sparkle, bell, nature, footstep, water",
  "description": "Short friendly sentence in Arabic explaining the object"
}

Output MUST BE a valid JSON array containing 3 to 6 objects. Do NOT include markdown code fences or explanatory text.`;

  const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
  const base64Image = imgBuffer.toString('base64');

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      console.log(`[AI Hotspot Service] Requesting visual vocabulary hotspots via Gemini Multimodal (${model})...`);
      const rawText = await retry(
        async (bail) => {
          let res;
          try {
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: prompt }
                  ]
                }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.2
                },
                safetySettings: [
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
              })
            });
          } catch (netErr) {
            throw netErr;
          }

          if (res.ok) {
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text;
          }

          const errJson = await res.json().catch(() => ({}));
          const msg = errJson.error?.message || `HTTP ${res.status}`;
          const err = new Error(`Gemini model ${model} (${res.status}): ${msg}`);
          err.status = res.status;

          // Retry on 429, 503, 500, 504
          if ([429, 500, 503, 504].includes(res.status)) {
            throw err;
          }

          bail(err);
          return null;
        },
        { retries: 2, minTimeout: 1000, factor: 2 }
      );

      if (rawText) {
        // Strip markdown fences if any
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleaned);
        const sanitized = sanitizeHotspots(parsed);
        if (sanitized && sanitized.length >= 2) {
          console.log(`[AI Hotspot Service] Successfully extracted ${sanitized.length} vocabulary hotspots via ${model}!`);
          return sanitized;
        }
      }
    } catch (err) {
      console.warn(`[AI Hotspot Service] Model ${model} failed:`, err.message);
    }
  }

  // If all AI models failed, gracefully fallback
  console.log(`[AI Hotspot Service] AI extraction did not return valid hotspots, falling back to deterministic heuristics.`);
  return generateFallbackHotspots({ slideText, lang });
}

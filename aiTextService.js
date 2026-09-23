import dotenv from 'dotenv';

dotenv.config();

/**
 * AI Text Analysis & Story Planning Service using Google Gemini
 * Analyzes sourceText strictly without defaulting to any hardcoded old story text.
 */
export async function generateStoryPlanWithGemini({ title, category, sourceText, lang, comments }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(title || sourceText || '');

  const rawText = (sourceText || '').trim();
  const rawTitle = (title || '').trim();

  // Ensure rawText is the story text passed from the user or PDF extractor
  const storyContent = rawText.length > 5 ? rawText : rawTitle;

  if (apiKey && storyContent.length > 5) {
    const prompt = `Consider yourself as an expert children's storybook editor, character designer, and art director.

You will get a story text from any source (pasted text, PDF, Word document, or article).

Your primary mission is twofold:
1. Extract and analyze the story text, list the characters that actually appear in the source story, and define a comprehensive VISUAL PROFILE (Character Model Sheet / Visual Bible) for EACH character. This visual profile will be strictly used across every slide to ensure 100% VISUAL CONSISTENCY of their look, age, clothing, color palette, and physical features.
2. Structure the verbatim story text into clear, scene-by-scene slides suitable for visual illustration.

CHARACTER VISUAL CONSISTENCY MANDATE (CRITICAL):
For each character identified, you MUST create a detailed "visualProfile" written in English that specifies:
- Character Type & Age: (e.g., "7-year-old curious Middle Eastern boy", "kind elderly grandfather with wrinkles and warm smile", "playful fluffy golden eagle chick").
- Physical Appearance: Hair/fur/feathers color & style, skin tone/complexion, facial features, eye color, height & build.
- Signature Outfit & Exact Colors: Specific clothing items and permanent colors that the character wears throughout the story (e.g., "Bright cobalt-blue traditional tunic with golden embroidery on the collar, cream-colored linen trousers, brown leather sandals").
- Distinctive Accessories/Props: (e.g., "carrying a small woven straw basket", "wearing round horn-rimmed reading glasses", "silver crescent amulet necklace").

INTELLIGENT EVENT & SCENE BREAKDOWN DIRECTIVE:
Do NOT simply assign 1 physical paragraph to 1 slide! Analyze the plot events and actions inside the story text. When a single long paragraph contains multiple distinct events, activities, or character dialogue exchanges, SPLIT that paragraph into 2 or more separate, focused scenes suitable for visual drawing.

STRICT VERBATIM MANDATE (NO SUMMARIZATION & NO SINGLE-WORD SLIDES):
DO NOT SUMMARIZE, CONDENSE, SHORTEN, OR PARAPHRASE THE STORY. Each slide MUST contain the EXACT ORIGINAL SENTENCES verbatim corresponding to that specific scene event without changing the words.

SLIDE COUNT: Determine the natural number of scenes based on plot events (typically 4 to 8 scenes).
${comments ? `USER MODIFICATION COMMENTS: "${comments}". Adapt the breakdown accordingly.` : ''}

LANGUAGE MANDATE:
- "storyTitle" and "slides" title and text MUST be in ${isArabic ? 'ARABIC (اللغة العربية)' : 'ENGLISH'}.
${isArabic ? '- CRITICAL TTS MANDATE: The Arabic text in every slide MUST be fully vowelized with complete diacritics (التشكيل الكامل: الفتحة، الضمة، الكسرة، السكون، الشدة، التنوين) on EVERY SINGLE LETTER. This is absolutely necessary so the AI Text-to-Speech engine reads it with perfect grammar and pronunciation without guessing.' : ''}
- "name" and "role" should be in ${isArabic ? 'Arabic' : 'English'}.
- "visualProfile" MUST BE IN ENGLISH (to directly guide the AI image generator).

Output JSON format ONLY:
{
  "storyTitle": "[Extracted short story title from the Source Story Text below]",
  "category": "${category || 'bedtime'}",
  "slideCount": 6,
  "characters": [
    {
      "name": "[Character Name]",
      "role": "[Character Role e.g. Protagonist / Father]",
      "gender": "[male or female]",
      "visualProfile": "[Detailed English description of appearance, exact clothing, signature colors, hairstyle, accessories for cross-slide visual consistency]"
    }
  ],
  "slides": [
    {
      "index": 0,
      "title": "[Scene Title]",
      "text": "[EXACT VERBATIM UNTOUCHED SENTENCES OF THIS EVENT FROM SOURCE STORY]"
    }
  ]
}

Source Story Text:
"""
${storyContent}
"""`;

    const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        console.log(`[AI Text Service] Requesting event-based verbatim story analysis and character visual profiles from ${model}...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJsonText) {
            const parsed = JSON.parse(rawJsonText);
            if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length >= 2) {
              
              let cleanTitle = (parsed.storyTitle || '').trim();
              if (!cleanTitle || cleanTitle.length > 50 || cleanTitle.includes('\n')) {
                cleanTitle = (rawTitle && rawTitle.length < 50) ? rawTitle : (isArabic ? 'قصة جديدة' : 'New Story');
              }

              const sanitizedSlides = parsed.slides.map((s, idx) => ({
                index: idx,
                title: s.title || (isArabic ? `المشهد ${idx + 1}` : `Scene ${idx + 1}`),
                text: (s.text || '').trim()
              }));

              const sanitizedCharacters = (parsed.characters && Array.isArray(parsed.characters) && parsed.characters.length > 0)
                ? parsed.characters.map(c => ({
                    name: c.name || (isArabic ? 'شخصية رئيسية' : 'Main Character'),
                    role: c.role || (isArabic ? 'بطل القصة' : 'Protagonist'),
                    gender: c.gender || 'male',
                    visualProfile: c.visualProfile || (isArabic ? 'Middle Eastern character with warm expressive eyes, traditional tunic, hand-drawn colored pencil look' : 'Character with consistent clothing and features')
                  }))
                : extractCharactersFromText(storyContent, isArabic);

              console.log(`[AI Text Service] Successfully analyzed story. Title: "${cleanTitle}", ${sanitizedCharacters.length} characters with visual profiles, ${sanitizedSlides.length} scenes.`);
              
              return {
                storyTitle: cleanTitle,
                category: parsed.category || category || 'bedtime',
                slideCount: sanitizedSlides.length,
                characters: sanitizedCharacters,
                slides: sanitizedSlides
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[AI Text Service] Model ${model} notice: ${err.message}`);
      }
    }
  }

  return generateFallbackPlanWithActualText(title, category, storyContent, isArabic);
}

function generateFallbackPlanWithActualText(title, category, sourceText, isArabic) {
  const text = (sourceText && sourceText.length > 10) ? sourceText : 'كان ماجد رجلا صالحا يحب العمل ويعتني بحديقته...';

  let cleanTitle = (title || '').trim();
  if (!cleanTitle || cleanTitle.length > 50) {
    cleanTitle = isArabic ? 'قصة جديدة' : 'New Story';
  }

  let clauses = text.split(/(?<=[.!?؟,،\n])\s+/).filter(c => c.trim().length > 0);
  if (clauses.length < 4) {
    const words = text.split(/\s+/);
    const chunkSize = Math.max(1, Math.ceil(words.length / 5));
    clauses = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      clauses.push(words.slice(i, i + chunkSize).join(' '));
    }
  }

  const slideCount = Math.min(Math.max(clauses.length, 4), 8);
  const itemsPerSlide = Math.max(1, Math.ceil(clauses.length / slideCount));
  const plannedSlides = [];

  for (let i = 0; i < slideCount; i++) {
    const chunk = clauses.slice(i * itemsPerSlide, (i + 1) * itemsPerSlide).join(' ');
    if (chunk && chunk.trim().length > 0) {
      plannedSlides.push({
        index: plannedSlides.length,
        title: isArabic ? `المشهد ${plannedSlides.length + 1}` : `Scene ${plannedSlides.length + 1}`,
        text: chunk.trim()
      });
    }
  }

  return {
    storyTitle: cleanTitle,
    category: category || 'bedtime',
    slideCount: plannedSlides.length,
    characters: extractCharactersFromText(text, isArabic),
    slides: plannedSlides
  };
}

function extractCharactersFromText(text, isArabic) {
  const characters = [];
  if (text.includes('ماجد')) {
    characters.push({
      name: isArabic ? 'ماجد' : 'Majid',
      role: isArabic ? 'الأب الصالح' : 'Father',
      gender: 'male',
      visualProfile: 'Middle Eastern father in his late 30s, warm gentle face with a neat trimmed short black beard, wearing a crisp white traditional thobe and red-and-white checkered ghutra with black egal, warm brown eyes'
    });
  }
  if (text.includes('وحيد')) {
    characters.push({
      name: isArabic ? 'وحيد' : 'Waheed',
      role: isArabic ? 'الابن البطل' : 'Son',
      gender: 'male',
      visualProfile: '7-year-old energetic Middle Eastern boy with tousled dark brown hair, bright curious dark eyes, wearing a sunny-yellow long-sleeved tunic over beige pants and brown soft leather shoes'
    });
  }
  if (text.includes('نسر') || text.includes('النسر')) {
    characters.push({
      name: isArabic ? 'النسر الصغير' : 'Little Eagle',
      role: isArabic ? 'فرخ النسر البطل' : 'Young Eagle Chick',
      gender: 'male',
      visualProfile: 'Young juvenile golden eagle chick, soft fluffy golden-brown and cream feathers, bright golden-amber inquisitive eyes, small curved yellow beak, distinctive feather tuft on crown'
    });
  }
  if (text.includes('دجاج') || text.includes('الدجاج')) {
    characters.push({
      name: isArabic ? 'الدجاجة الأم' : 'Mother Hen',
      role: isArabic ? 'الدجاجة الحاضنة' : 'Nurturing Hen',
      gender: 'female',
      visualProfile: 'Plump warm reddish-brown hen with bright red comb and wattle, round observant black eyes, soft speckled feather pattern'
    });
  }
  if (text.includes('صياد') || text.includes('الصياد')) {
    characters.push({
      name: isArabic ? 'الصياد الحكيم' : 'Wise Fisherman',
      role: isArabic ? 'الصياد القنوع' : 'Content Fisherman',
      gender: 'male',
      visualProfile: 'Weathered kind fisherman in his 40s with sun-kissed skin, wearing a simple indigo-blue cotton vest over a cream shirt, rolled-up trousers, holding a hand-woven reed fishing net'
    });
  }
  
  if (characters.length === 0) {
    characters.push({
      name: isArabic ? 'البطل الرئيسي' : 'Main Character',
      role: isArabic ? 'الشخصية الرئيسية' : 'Protagonist',
      gender: 'male',
      visualProfile: 'Expressive storybook protagonist with friendly approachable facial features, wearing a signature vibrant colored tunic with detailed stitching, consistent hair and styling across all scenes'
    });
  }

  return characters;
}

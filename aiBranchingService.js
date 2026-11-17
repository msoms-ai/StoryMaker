import dotenv from 'dotenv';
import retry from 'async-retry';

dotenv.config();

/**
 * Valid Lucide icon names suitable for children's adventure branching choices
 */
const VALID_ICONS = [
  'Compass', 'Map', 'Key', 'Sparkles', 'Footprints', 'Feather', 'Flame',
  'Shield', 'DoorOpen', 'TreePine', 'Mountain', 'Search', 'Eye', 'Heart',
  'Wand2', 'Star', 'Crown', 'Gem', 'Bird', 'Zap', 'Lightbulb', 'Compass'
];

/**
 * Helper to call Gemini models with automatic failover and retries
 */
async function callGeminiApi({ prompt, temperature = 0.4 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment');
  }

  const models = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash'
  ];

  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      console.log(`[AI Branching Service] Calling Gemini (${model})...`);
      const data = await retry(
        async (bail, attempt) => {
          let res;
          try {
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature
                },
                safetySettings: [
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
              })
            });
          } catch (netErr) {
            throw netErr;
          }

          if (res.ok) {
            return await res.json();
          }

          const errJson = await res.json().catch(() => ({}));
          const msg = errJson.error?.message || `HTTP ${res.status}`;
          const err = new Error(`Gemini model ${model} (${res.status}): ${msg}`);
          err.status = res.status;

          // Retry on transient server errors
          if (res.status === 429 || res.status === 500 || res.status === 503 || res.status === 504) {
            throw err;
          }

          bail(err);
          return null;
        },
        {
          retries: 2,
          minTimeout: 1500,
          factor: 2,
          onRetry: (err, attempt) => {
            console.warn(`[AI Branching Service] Retrying ${model} (attempt ${attempt}): ${err.message}`);
          }
        }
      );

      if (data) {
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          // Parse JSON, strip any leading/trailing markdown code fences if present
          const cleanedText = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
          return JSON.parse(cleanedText);
        }
      }
    } catch (err) {
      console.warn(`[AI Branching Service] Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to generate response');
}

/**
 * Generate 2 contrasting Choose-Your-Own-Adventure branch options
 * for the current slide context.
 *
 * @param {Object} params
 * @param {string} params.storyTitle - The title of the story
 * @param {Array} params.previousSlides - Array of slides up to the current point
 * @param {number} params.currentSlideIdx - Index of the current slide
 * @param {string} params.lang - Language code ('ar' or 'en')
 * @returns {Promise<{ choices: Array<{ id: string, titleAr: string, titleEn: string, descriptionAr: string, descriptionEn: string, iconName: string }> }>}
 */
export async function generateBranchOptions({ storyTitle, previousSlides = [], currentSlideIdx = 0, lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || '');

  // Slice story slides up to current slide index
  const relevantSlides = Array.isArray(previousSlides) && previousSlides.length > 0
    ? previousSlides.slice(0, (currentSlideIdx ?? 0) + 1)
    : [];

  const contextSummary = relevantSlides.map((s, idx) => {
    return `Scene ${idx + 1} (${s.title || 'Untitled'}): ${s.text || ''}`;
  }).join('\n\n');

  const prompt = `You are an expert children's adventure author and interactive story architect specializing in "Choose-Your-Own-Adventure" (قصص تفاعلية متعددة المسارات).

MISSION:
Analyze the ongoing story narrative and formulate exactly 2 exciting, contrasting narrative choices for what the protagonist/character does next at this critical turning point.

CHOICE DESIGN MANDATES:
1. CONTRAST:
   - Choice A should represent a bold, exploratory, or action-oriented approach (e.g. venturing into a mysterious glowing cave, investigating an unknown sound, taking the high mountain bridge).
   - Choice B should represent a clever, gentle, magical, or observant approach (e.g. following a friendly singing bird, deciphering ancient markings, asking an elder forest animal for guidance).
2. CHILD-FRIENDLY & POSITIVE:
   - Exciting and wondrous, without gruesome violence or dark horror. Inspires curiosity, problem-solving, and adventure.
3. BILINGUAL CONTENT:
   - Both choices MUST have captivating titles and descriptions in both ARABIC (اللغة العربية مع التشكيل المناسب) and ENGLISH.
4. ICON:
   - Choose a fitting icon name from this exact list:
     ${JSON.stringify(VALID_ICONS)}

OUTPUT JSON FORMAT ONLY:
{
  "choices": [
    {
      "id": "a",
      "titleAr": "استكشاف الكهف المتلألئ",
      "titleEn": "Explore the Sparkling Cave",
      "descriptionAr": "الاقتراب بحذر نحو بريق غريب ينبعث من بين الصخور القديمة.",
      "descriptionEn": "Approach cautiously toward a strange shimmering glow among the ancient rocks.",
      "iconName": "Compass"
    },
    {
      "id": "b",
      "titleAr": "اتباع الطائر الغريد الذهبي",
      "titleEn": "Follow the Golden Singing Bird",
      "descriptionAr": "ملاحقة لحن عذب يتردد بين الأشجار الكثيفة يقود إلى واحة خفية.",
      "descriptionEn": "Follow a sweet melody echoing through the dense trees leading to a hidden oasis.",
      "iconName": "Sparkles"
    }
  ]
}

STORY CONTEXT:
Story Title: "${storyTitle || (isArabic ? 'قصة المغامرة' : 'Adventure Story')}"
Current Slide Index: ${currentSlideIdx}
<untrusted_story_narrative_context>
${contextSummary || storyTitle || 'An exciting adventure begins...'}
</untrusted_story_narrative_context>`;

  try {
    const result = await callGeminiApi({ prompt, temperature: 0.45 });

    if (result && Array.isArray(result.choices) && result.choices.length >= 2) {
      const sanitizedChoices = result.choices.slice(0, 2).map((c, i) => {
        const fallbackId = i === 0 ? 'a' : 'b';
        const rawIcon = c.iconName || (i === 0 ? 'Compass' : 'Sparkles');
        const validIcon = VALID_ICONS.includes(rawIcon) ? rawIcon : (i === 0 ? 'Compass' : 'Sparkles');

        return {
          id: (c.id || fallbackId).toLowerCase(),
          titleAr: c.titleAr || (i === 0 ? 'خوض المغامرة الجريئة' : 'اتباع الدليل الحكيم'),
          titleEn: c.titleEn || (i === 0 ? 'Bold Adventure Path' : 'Wise Guidance Path'),
          descriptionAr: c.descriptionAr || (i === 0 ? 'الانطلاق في مسار جديد حافل بالاكتشافات والمفاجآت.' : 'البحث عن إشارات ذكية وطلب المساعدة لمواصلة الرحلة.'),
          descriptionEn: c.descriptionEn || (i === 0 ? 'Embark on a bold new path full of discoveries and surprises.' : 'Search for clever clues and guidance to continue the journey.'),
          iconName: validIcon
        };
      });

      return { choices: sanitizedChoices };
    }
  } catch (err) {
    console.warn(`[AI Branching Service] Gemini options generation fell back to defaults: ${err.message}`);
  }

  // Graceful fallback choices if API fails
  return generateFallbackBranchOptions({ storyTitle, lang });
}

/**
 * Generate fallback branch choices when Gemini is offline or unavailable
 */
export function generateFallbackBranchOptions({ storyTitle = '', lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || '');

  return {
    choices: [
      {
        id: 'a',
        titleAr: 'اسْتِكْشَافُ المَسَارِ المَجْهُولِ',
        titleEn: 'Explore the Mysterious Path',
        descriptionAr: 'التَّقَدُّمُ بِشَجَاعَةٍ نَحْوَ المَمَرِّ السِّرِّيِّ المَلِيءِ بِالأَلْغَازِ وَالمُفَاجَآتِ.',
        descriptionEn: 'Venture courageously toward the secret pathway filled with puzzles and surprises.',
        iconName: 'Compass'
      },
      {
        id: 'b',
        titleAr: 'اتِّبَاعُ النُّورِ السِّحْرِيِّ وَالدَّلِيلِ',
        titleEn: 'Follow the Magical Light & Clues',
        descriptionAr: 'تَتَبُّعُ ضَوْءٍ بَرَّاقٍ يَرْسُمُ طَرِيقًا آمِنًا وَيَفْتَحُ أَبْوَابَ الحِكْمَةِ.',
        descriptionEn: 'Follow a shimmering light that maps a safe trail and opens doors of wisdom.',
        iconName: 'Sparkles'
      }
    ]
  };
}

/**
 * Generate a new story scene / slide matching the user's selected branch path.
 * In Arabic, enforces complete diacritics (التشكيل الكامل) on every letter.
 *
 * @param {Object} params
 * @param {string} params.storyTitle - The title of the story
 * @param {Object} params.choiceSelected - The branch choice chosen by the user
 * @param {Array} params.previousSlides - Previous story slides
 * @param {string} params.lang - Language code ('ar' or 'en')
 * @returns {Promise<{ title: string, text: string, imagePrompt: string, speakerRole: string, voiceRole: string, choiceId: string }>}
 */
export async function generateBranchedScene({ storyTitle, choiceSelected, previousSlides = [], lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || choiceSelected?.titleAr || '');

  const choiceId = choiceSelected?.id || 'a';
  const choiceTitle = choiceSelected?.titleAr || choiceSelected?.titleEn || choiceSelected?.title || 'Selected Path';
  const choiceDesc = choiceSelected?.descriptionAr || choiceSelected?.descriptionEn || choiceSelected?.description || '';

  const contextSummary = (previousSlides || []).map((s, idx) => {
    return `Scene ${idx + 1}: ${s.text || ''}`;
  }).join('\n\n');

  const prompt = `You are a master children's author, voice scriptwriter, and art director for the Qisas platform.

MISSION:
Write the NEXT dynamic narrative scene (slide) in the story based on the reader's chosen branching decision.

BRANCH DECISION TAKEN BY READER:
Choice ID: "${choiceId}"
Choice Title: "${choiceTitle}"
Choice Description: "${choiceDesc}"

CRITICAL REQUIREMENTS:
1. NARRATIVE FLOW:
   - Directly and seamlessly continue from the previous events, showing the exciting immediate consequences of choosing "${choiceTitle}".
   - Keep the length to 2-4 rich, rhythmic, and vivid sentences ideal for an illustrated children's storybook slide.
2. LANGUAGE & FULL TASHKEEL MANDATE (CRITICAL):
   - "title" MUST be in ${isArabic ? 'ARABIC (اللغة العربية)' : 'ENGLISH'}.
   - "text" MUST be in ${isArabic ? 'ARABIC' : 'ENGLISH'}.
   ${isArabic ? '- CRITICAL TTS MANDATE: Every single Arabic letter in "text" and "title" MUST have full diacritics (التشكيل الكامل: الفتحة، الضمة، الكسرة، السكون، الشدة، التنوين) on EVERY SINGLE WORD AND LETTER. This is strictly required so the AI Text-to-Speech engine produces natural, flawless vocalization.' : ''}
3. IMAGE PROMPT SPECIFICATION:
   - "imagePrompt": A highly-detailed English visual illustration prompt for the AI image generator.
   - Describe character postures, expressive faces, emotional lighting, vivid colors, and scenic atmosphere.
   - Conclude with: "storybook illustration style, colorful, highly detailed, no text, no watermark".
4. VOICE ROLES:
   - "speakerRole": "Narrator" / "راوي"
   - "voiceRole": "narrator_male" or "narrator_female"

OUTPUT JSON FORMAT ONLY:
{
  "title": "[Scene Title with full diacritics in Arabic if Arabic]",
  "text": "[Narrative text of this new scene with complete diacritics on every letter if Arabic]",
  "imagePrompt": "[Detailed English visual illustration prompt for image generation, no text]",
  "speakerRole": "Narrator",
  "voiceRole": "narrator_male"
}

STORY CONTEXT:
Story Title: "${storyTitle || ''}"
<untrusted_previous_scenes>
${contextSummary || 'Beginning of the adventure'}
</untrusted_previous_scenes>`;

  try {
    const result = await callGeminiApi({ prompt, temperature: 0.35 });

    if (result && result.text) {
      return {
        title: result.title || (isArabic ? 'مُوَاصَلَةُ المَسَارِ المُخْتَارِ' : 'Continuing the Chosen Path'),
        text: result.text.trim(),
        imagePrompt: result.imagePrompt || `A vibrant storybook illustration of ${storyTitle}, characters exploring ${choiceTitle}, warm magical lighting, detailed background, no text`,
        speakerRole: result.speakerRole || 'Narrator',
        voiceRole: result.voiceRole || 'narrator_male',
        choiceId
      };
    }
  } catch (err) {
    console.warn(`[AI Branching Service] Gemini branched scene generation fell back to defaults: ${err.message}`);
  }

  // Fallback scene generation with full diacritics
  return generateFallbackBranchedScene({ storyTitle, choiceSelected, lang });
}

/**
 * Generate fallback branched scene with full diacritics in Arabic
 */
export function generateFallbackBranchedScene({ storyTitle = '', choiceSelected = {}, lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || choiceSelected?.titleAr || '');
  const choiceId = choiceSelected?.id || 'a';
  const choiceTitle = isArabic
    ? (choiceSelected?.titleAr || 'المَسَارِ المُخْتَارِ')
    : (choiceSelected?.titleEn || 'The Chosen Path');

  if (isArabic) {
    const isOptionA = choiceId.toLowerCase() === 'a';
    const title = isOptionA ? 'خُطْوَةٌ جَرِيئَةٌ فِي عُمْقِ المَكَانِ' : 'إِشْرَاقَةُ الحِكْمَةِ وَالأَمَلِ';
    const text = isOptionA
      ? 'تَقَدَّمَ البَطَلُ بِخُطُوَاتٍ وَاثِقَةٍ نَحْوَ ذَلِكَ المَمَرِّ الغَامِضِ، فَتَلَأْلَأَتْ حَوْلَهُ جُدْرَانٌ بَرَّاقَةٌ تَحْمِلُ نُقُوشًا بَدِيعَةً، وَشَعَرَ بِفَرْحَةِ الاِكْتِشَافِ تَمْلَأُ قَلْبَهُ حَمَاسًا وَأَمَلاً.'
      : 'تَبِعَ البَطَلُ ذَلِكَ النُّورَ السِّحْرِيَّ الهَادِئَ، فَقَادَهُ عَبْرَ أَشْجَارٍ زَاهِيَةٍ إِلَى وَاحَةٍ خَلَّابَةٍ تَفُوحُ مِنْهَا رَائِحَةُ الزُّهُورِ العَطِرَةِ، حَيْثُ وَجَدَ مِفْتَاحًا ذَهَبِيًّا قَدِيمًا يَفْتَحُ أَبْوَابَ الخَيْرِ.';

    return {
      title,
      text,
      imagePrompt: `A vibrant magical storybook illustration of the protagonist following ${choiceTitle}, glowing sparkling lights, lush atmospheric environment, cinematic warm sunset lighting, highly detailed, no text, no watermark`,
      speakerRole: 'راوي',
      voiceRole: 'narrator_male',
      choiceId
    };
  } else {
    const isOptionA = choiceId.toLowerCase() === 'a';
    const title = isOptionA ? 'A Bold Step into the Unknown' : 'The Radiance of Wisdom';
    const text = isOptionA
      ? 'With steady and confident steps, our hero advanced into the mysterious corridor. Shimmering crystals sparkled along the ancient carved stone walls, filling their heart with the thrill of discovery and wonder.'
      : 'Guided by the gentle sparkling light, our hero walked past glowing trees into a breathtaking hidden glade, where a gleaming golden key rested atop a mossy pedestal, opening doors of joy.';

    return {
      title,
      text,
      imagePrompt: `A vibrant storybook illustration of the protagonist following ${choiceTitle}, warm glowing ambiance, magical scenery, colorful details, no text, no watermark`,
      speakerRole: 'Narrator',
      voiceRole: 'narrator_male',
      choiceId
    };
  }
}

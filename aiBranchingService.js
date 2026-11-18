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
 * strictly tailored to the CURRENT SLIDE content.
 *
 * @param {Object} params
 * @param {string} params.storyTitle - The title of the story
 * @param {Array} params.previousSlides - Array of slides up to the current point
 * @param {number} params.currentSlideIdx - Index of the current slide
 * @param {Object} params.currentSlide - Direct reference to current slide object
 * @param {string} params.lang - Language code ('ar' or 'en')
 * @returns {Promise<{ choices: Array<{ id: string, titleAr: string, titleEn: string, descriptionAr: string, descriptionEn: string, iconName: string }> }>}
 */
export async function generateBranchOptions({ storyTitle, previousSlides = [], currentSlideIdx = 0, currentSlide = null, lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || '');

  // Resolve current active slide
  const targetIndex = currentSlideIdx ?? 0;
  const activeSlide = currentSlide || (Array.isArray(previousSlides) && previousSlides[targetIndex]) || (previousSlides[previousSlides.length - 1]) || null;
  const currentSceneTitle = activeSlide?.title || `المشهد ${targetIndex + 1}`;
  const currentSceneText = (activeSlide?.text || '').trim();

  // Slice story slides up to current slide index for background context
  const relevantSlides = Array.isArray(previousSlides) && previousSlides.length > 0
    ? previousSlides.slice(0, targetIndex + 1)
    : [];

  const contextSummary = relevantSlides.map((s, idx) => {
    return `Scene ${idx + 1} (${s.title || 'Untitled'}): ${s.text || ''}`;
  }).join('\n\n');

  const prompt = `You are an expert children's adventure author and interactive story architect specializing in "Choose-Your-Own-Adventure" (قصص تفاعلية متعددة المسارات).

MISSION:
Analyze the ongoing story narrative and formulate exactly 2 exciting, contrasting narrative choices for what the character/protagonist does next, DIRECTLY ARISING from the CURRENT SCENE the child reader is currently reading.

CRITICAL DYNAMIC CONTEXT MANDATE:
The child reader is currently looking at this exact scene on their screen right now:
----------------------------------------
CURRENT SCENE (Slide ${targetIndex + 1}):
Scene Title: "${currentSceneTitle}"
Scene Story Text: "${currentSceneText || storyTitle || 'بدايه الرحلة المشوقة'}"
----------------------------------------

MANDATORY CHOICE DESIGN INSTRUCTIONS:
1. DEEP RELEVANCE TO CURRENT SCENE:
   - The 2 choices MUST NOT be generic clichés.
   - They MUST directly address the specific characters, dilemma, surroundings, and events described in "${currentSceneText}".
   - For example: if the scene is about making milk in a factory with a friend, choices should be about exploring the farm or helping with cheese making; if it's about an eagle egg hatching with hens, choices should be about trying to flap wings or foraging with the chicks.
2. CONTRAST:
   - Choice A: A bold, proactive, energetic, or fast-action response to the situation in the scene.
   - Choice B: A clever, gentle, observant, friendly, or thoughtful response to the situation in the scene.
3. CHILD-FRIENDLY & POSITIVE:
   - Inspires wholesome curiosity, values, kindness, and problem-solving.
4. BILINGUAL CONTENT & TASHKEEL:
   - Provide titles and descriptions in both Arabic (اللغة العربية مع التشكيل الكامل للكلمات) and English.
5. ICON:
   - Select a fitting icon name from this exact list:
     ${JSON.stringify(VALID_ICONS)}

OUTPUT JSON FORMAT ONLY:
{
  "choices": [
    {
      "id": "a",
      "titleAr": "عنوان الخيار الأول المبتكر والمناسب للمشهد بدقة",
      "titleEn": "Creative Scene-Specific First Choice Title",
      "descriptionAr": "وصف مشوق لما سيفعله البطل في هذا المسار المتفرع بناء على ما حدث للتو.",
      "descriptionEn": "Engaging description of what the protagonist will do next.",
      "iconName": "Compass"
    },
    {
      "id": "b",
      "titleAr": "عنوان الخيار الثاني الحكيم والبديل المناسب للمشهد بدقة",
      "titleEn": "Clever Scene-Specific Second Choice Title",
      "descriptionAr": "وصف بديل ممتع ومختلف للتعامل مع هذا الموقف بذكاء وحكمة.",
      "descriptionEn": "Alternative clever path description.",
      "iconName": "Sparkles"
    }
  ]
}

STORY BACKGROUND:
Story Title: "${storyTitle || (isArabic ? 'قصة المغامرة' : 'Adventure Story')}"
<untrusted_story_narrative_context>
${contextSummary || currentSceneText || storyTitle}
</untrusted_story_narrative_context>`;

  try {
    const result = await callGeminiApi({ prompt, temperature: 0.5 });

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
    console.warn(`[AI Branching Service] Gemini options generation fell back to contextual defaults: ${err.message}`);
  }

  // Contextual fallback choices if API fails
  return generateFallbackBranchOptions({ storyTitle, currentSceneText, currentSceneTitle, lang });
}

/**
 * Generate contextual fallback branch choices derived from the current scene
 */
export function generateFallbackBranchOptions({ storyTitle = '', currentSceneText = '', currentSceneTitle = '', lang = 'ar' }) {
  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(storyTitle || currentSceneText);
  const snippet = (currentSceneText || currentSceneTitle || storyTitle).slice(0, 35).trim();

  if (isArabic) {
    return {
      choices: [
        {
          id: 'a',
          titleAr: snippet ? `مُوَاصَلَةُ اسْتِكْشَافِ (${snippet}...)` : 'خَوْضُ تَجْرِبَةٍ جَدِيدَةٍ وَشُجَاعَةٍ',
          titleEn: 'Bold Exploration Path',
          descriptionAr: 'الِانْطِلَاقُ لِمَعْرِفَةِ مَا يَخْتَبِئُ وَرَاءَ هَذَا المَوْقِفِ بِعَزِيمَةٍ وَحَمَاسٍ.',
          descriptionEn: 'Venture forward to uncover what lies ahead with boldness and courage.',
          iconName: 'Compass'
        },
        {
          id: 'b',
          titleAr: snippet ? `التَّفْكِيرُ فِي حَلٍّ ذَكِيٍّ لِـ (${snippet}...)` : 'التَّأَمُّلُ وَاتِّبَاعُ الحِكْمَةِ',
          titleEn: 'Clever & Thoughtful Path',
          descriptionAr: 'التَّأَنِّي وَطَلَبُ النَّصِيحَةِ وَالبَحْثُ عَنْ إِشَارَاتٍ سِحْرِيَّةٍ تُسَاعِدُ فِي الرِّحْلَةِ.',
          descriptionEn: 'Pause to look for clever clues and helpful guidance on the journey.',
          iconName: 'Lightbulb'
        }
      ]
    };
  }

  return {
    choices: [
      {
        id: 'a',
        titleAr: 'اسْتِكْشَافُ المَسَارِ الجَرِيءِ',
        titleEn: snippet ? `Investigate further (${snippet}...)` : 'Bold Action Path',
        descriptionAr: 'الاقتراب بحماس واستكشاف ما سيحدث بعد ذلك.',
        descriptionEn: 'Take decisive action to explore the unfolding scene.',
        iconName: 'Compass'
      },
      {
        id: 'b',
        titleAr: 'اخْتِيَارُ الحِكْمَةِ وَالمُرَاقَبَةِ',
        titleEn: snippet ? `Observe carefully (${snippet}...)` : 'Thoughtful Path',
        descriptionAr: 'المراقبة بحذر والبحث عن حل ذكي ومبتكر.',
        descriptionEn: 'Step back to observe carefully and find a clever solution.',
        iconName: 'Lightbulb'
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

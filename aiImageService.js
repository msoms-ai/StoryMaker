import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Visual Prompt Builder for Image Models using Gemini 3.5 Flash
 * Enforces strict character appearance, clothing, and palette consistency across all slides.
 */
export async function buildGeminiVisualPrompt({
  slideText,
  storyTitle,
  category,
  slideIndex = 0,
  characters = [],
  userFeedback = '',
  artStyle = 'Colored Pencil'
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Build Character Visual Consistency Dossier string
  let characterDossierText = 'No specific characters identified. Maintain a consistent protagonist style.';
  if (Array.isArray(characters) && characters.length > 0) {
    characterDossierText = characters
      .map((c, i) => `${i + 1}. **${c.name}** (${c.role}, ${c.gender}): ${c.visualProfile || 'Consistent character with defined outfit and colors'}`)
      .join('\n');
  }

  if (apiKey) {
    const systemInstruction = `You are an award-winning art director and character consistency lead.

Your task is to analyze the slide text of an ongoing story and generate a single, highly-detailed English visual illustration prompt for the AI image generator.

==================================================
CRITICAL DIRECTIVE: CROSS-SLIDE CHARACTER CONSISTENCY
==================================================
To ensure every character looks IDENTICAL in every slide across the entire story, you MUST adhere strictly to the Character Visual Dossier below:

--- CHARACTER VISUAL CONSISTENCY DOSSIER ---
${characterDossierText}
---------------------------------------------

RULES FOR PROMPT CREATION:
1. CHARACTER RECOGNITION & CONSISTENCY:
   - Identify which character(s) from the dossier appear or are implied in this slide's scene.
   - For every character present, incorporate their EXACT visual profile from the dossier into the prompt: their precise age, facial features, hair/fur/feathers color & texture, and specifically their EXACT SIGNATURE CLOTHING ITEMS and COLORS (e.g. if the character wears a mustard-yellow tunic with brown vest, describe them wearing that exact outfit in this slide).
   - Never change the character's core clothing colors, skin tone, hair color, or physical age between slides.
   - Describe their dynamic posture, emotional facial expression, and exact physical actions according to the slide text.

2. ENVIRONMENT & SETTING:
   - Describe the background setting in vivid detail (e.g., golden sunset illuminating mountain cliffs, traditional village courtyard with palm shadows, cozy bedroom with wooden lantern).
   - Ensure the perspective, camera angle, and composition highlight the emotional core of the scene.

3. UNIFORM ART STYLE SPECIFICATION:
   - Style: "${artStyle}, highly detailed, professional masterpiece".
   - Negative constraints: "No text, no letters, no words, no speech bubbles, no watermark".

4. OUTPUT FORMAT:
   - Return ONLY the finalized English visual prompt string. Do not include introductory or explanatory conversational text.

Slide Number: ${slideIndex + 1}
Story Title: "${storyTitle}"
Category: "${category}"
Slide Text: "${slideText}"
${userFeedback ? `User Revision Feedback: "${userFeedback}"` : ''}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: { temperature: 0.25 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const visualPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (visualPrompt && visualPrompt.length > 10) {
          console.log(`[AI Image Service] Slide ${slideIndex + 1} consistency visual prompt: "${visualPrompt.substring(0, 140)}..."`);
          return `${visualPrompt}, ${artStyle}, no text`;
        }
      }
    } catch (err) {
      console.warn(`[AI Image Service] Gemini prompt builder notice: ${err.message}`);
    }
  }

  // Fallback visual prompt
  return `A detailed ${artStyle} illustration for slide ${slideIndex + 1} of "${storyTitle}". Characters matching their established visual profiles and signature clothing, expressive faces, no text`;
}

/**
 * Generate a profile cover image using AI
 */
export async function generateProfileCoverImage(prompt, outputDir) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const enhancedPrompt = `A wide landscape profile banner, scenic background. Style: high-quality illustration, vivid colors, artistic masterpiece. User prompt: ${prompt}`;

  try {
    const buffer = await generateViaGoogleGemini(enhancedPrompt, apiKey);
    const fileName = `cover_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
  } catch (err) {
    console.error(`[AI Image Service] Cover Generation Error: ${err.message}`);
    throw err;
  }
}

/**
 * Generate image exclusively via Google Gemini Image API
 */
async function generateViaGoogleGemini(prompt, apiKey) {
  const models = [
    'gemini-3.1-flash-image',
    'nano-banana-pro-preview',
    'gemini-2.5-flash-image',
    'gemini-3-pro-image'
  ];

  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      console.log(`[AI Image Service] Calling Google Gemini API (${model}) for image creation...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            return Buffer.from(p.inlineData.data, 'base64');
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        lastError = new Error(`Gemini model ${model} (${res.status}): ${msg}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Google Gemini Image API generation failed.');
}

/**
 * Main Service Function: Generate slide image exclusively via Google Gemini API
 * Incorporates character dossier for cross-slide visual consistency.
 */
export async function generateAndSaveSlideImage({
  slideText,
  storyTitle,
  category,
  slideIndex,
  characters = [],
  outputDir,
  lang = 'ar',
  userFeedback = '',
  artStyle = 'Colored Pencil'
}) {
  const visualPrompt = await buildGeminiVisualPrompt({
    slideText,
    storyTitle,
    category,
    slideIndex,
    characters,
    userFeedback,
    artStyle
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY missing in environment.');
  }

  console.log(`[AI Image Service] Generating Slide ${slideIndex + 1} Image with character consistency...`);
  const buffer = await generateViaGoogleGemini(visualPrompt, apiKey);
  const filePath = path.join(outputDir, `slide_${slideIndex + 1}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`[AI Image Service] Successfully saved Gemini AI image: slide_${slideIndex + 1}.png (${buffer.length} bytes)`);
  return `slide_${slideIndex + 1}.png`;
}

/**
 * Generate a character avatar
 */
export async function generateCharacterAvatar(character, artStyle = 'Colored Pencil', outputDir) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const enhancedPrompt = `A portrait avatar of ${character.name}, a ${character.role}, ${character.gender}. Visual profile: ${character.visualProfile || 'Consistent character with defined outfit and colors'}. Style: ${artStyle}, highly detailed, professional masterpiece, plain background. No text.`;

  try {
    const buffer = await generateViaGoogleGemini(enhancedPrompt, apiKey);
    const fileName = `avatar_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
  } catch (err) {
    console.error(`[AI Image Service] Avatar Generation Error: ${err.message}`);
    throw err;
  }
}

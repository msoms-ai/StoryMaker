# Qisas (قصص) - Master AI Prompt Templates (Google Gemini API Exclusive)

This document contains all official prompt templates used across the Qisas application exclusively powered by the **Google Gemini API** for Text Analysis, Verbatim Scene Segmentation, Gemini Image Generation, Gemini Voice Narration, and User Redo Adaptation.

---

## 1. Story Planning & Verbatim Scene Prompt (`STORY_PLANNING_PROMPT`)

**AI Model**: Google Gemini (`gemini-3.5-flash` / `gemini-3.6-flash`)

**Purpose**: Takes raw input text (pasted text, extracted PDF file content, Word file content, or website link) and performs story breakdown, character extraction, gender identification, and verbatim scene segmentation into slides.

```text
Consider yourself as an editor and school teacher who wants to make stories into more interactive and visual for students who reads the story.

You will get a story as text from any source like copied text, pdf file, word file, website link.

Your goal is to extract the story text, understand the whole context of it, list the names of the charachters and make sure they do not change, understand the gender of each character, understand the theme and category of the story.

You also need to findout the story title if available.

STRICT VERBATIM MANDATE:
DO NOT SUMMARIZE, CONDENSE, OR PARAPHRASE THE STORY. You MUST divide the source text into sequential scenes by placing the EXACT ORIGINAL SENTENCES verbatim into each slide text. Every sentence from the source story must be preserved 100% untouched.

SLIDE COUNT: Determine the natural number of scenes based on story context (typically 4 to 6 scenes).
Output JSON format ONLY:
{
  "storyTitle": "[Original if available or use the user input from step 1 of the wizard]",
  "category": "[Story category]",
  "slideCount": [Total scenes number],
  "characters": [
    { "name": "[character name]", "role": "[character role]", "gender": "[male/female]" }
  ],
  "slides": [
    {
      "index": 0,
      "title": "[Short thematic scene title in Arabic/English]",
      "text": "[Exact original verbatim sentence/paragraph of this specific scene - NO SUMMARIZATION]"
    }
  ]
}

Source Story:
"""
{SOURCE_TEXT}
"""
```

---

## 2. Gemini Image Generation Visual Prompt (`GEMINI_IMAGE_PROMPT`)

**AI Model**: Google Gemini Image API (`gemini-3.1-flash-image` / `nano-banana-pro-preview` / `gemini-2.5-flash-image`)

**Purpose**: Generates scene-specific children's storybook illustrations directly via Google Gemini Image API based on slide context, matching character gender and specifications across all slides.

```text
You are an editor and story book designer, you receive a section of the story as follows: "{SLIDE_TEXT}", understand the context of this text and generate an image reflecting the over all view of the scene making sure that the drawn characters are matching the gender as per the story and the same character will be used with the same specs all over the story. Make sure the style of the drawing is simple and lightly coloured using coloured pencils. the drawing should match the over all theme of the story.
```

---

## 3. Gemini Voice Narration TTS Prompt (`GEMINI_VOICE_TTS_PROMPT`)

**AI Model**: Google Gemini Multimodal Speech API (`gemini-2.5-flash-preview-tts` / `gemini-3.1-flash-tts-preview`)

**Purpose**: Synthesizes natural spoken voice narration directly via Gemini Multimodal Speech API.

```text
Generate Content Request:
- Input Text: "{SLIDE_TEXT}"
- Response Modality: ["AUDIO"]
- Prebuilt Voice: "Aoede" (Arabic natural voice) / "Puck" (English natural voice)
- Target: Warm, natural, expressive storybook voice narration for children.
```

---

## 4. Gemini User Redo & Modification Prompt (`GEMINI_REDO_PROMPT`)

**AI Model**: Google Gemini (`gemini-3.5-flash`)

**Purpose**: Processes user feedback comments in Step 7 to adapt story text, scenes, images, and voice narration.

```text
You are a children's storybook editor using Google Gemini.
The user reviewed the generated draft story and requested the following modifications:

User Feedback Comments: "{USER_COMMENTS}"
Original Story Title: "{STORY_TITLE}"
Original Slides: {ORIGINAL_SLIDES_JSON}

Instructions:
1. Intelligently update the slide titles and story texts to reflect the user's feedback comments.
2. PRESERVE character names (e.g., "ماجد", "وحيد") unless the user explicitly requested a name change in their comments.
3. Output the updated story plan in JSON format with keys: "storyTitle", "category", "slideCount", "characters", and "slides".
```

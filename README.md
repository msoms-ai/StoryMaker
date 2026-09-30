# StoryMaker / Qisas (قصص) - Interactive AI Story Generator 📚✨

StoryMaker (Qisas) is a pioneering interactive storytelling platform designed to elevate children's and youth literature. Powered by Google's latest Gemini 3.8 Flash, it fuses engaging storytelling, diverse visual art styles, and expressive Google Cloud Chirp3-HD LLM voices into a rich, interactive educational experience.

## ✨ What's New in v1.1.0 (تحديثات الإصدار 1.1)

- **Make a Story Wizard**: A brand new AI generator pipeline. Build a story from scratch by defining specific characters (age, gender, visuals), plot events, grammar focus, vocabulary, and moral lessons. The AI perfectly tailors the text to your exact pedagogical constraints.
- **Dynamic Art Styles**: Ditch the default colored pencils! Now generate stories in Anime/Manga, Watercolor, 3D Pixar Animation, or Oil Painting styles with strictly enforced character consistency.
- **Next-Gen Voices**: Upgraded from WaveNet to Google Cloud's cutting-edge **Chirp3-HD** LLM-based voice models, delivering breathtakingly emotional and grammatically perfect narration in both Arabic and English.
- **Character AI Avatars**: The planning phase now generates real-time visual AI avatars for every character directly in the dashboard before you commit to the full story.
- **Comprehensive Help Center**: A massive bilingual (AR/EN) Help Center guiding users step-by-step through creation and conversion.
- **Enhanced Progress Tracking**: Reading history and slide completion is now securely isolated per-user account, rather than globally shared.
- **Redesigned Landing Page**: Featuring dynamic live platform statistics and a beautiful immersive cloud-book background.

## ✨ Key Features

- **AI Story Generation**: Automatically generate rich, multi-slide stories from a simple text prompt, a topic, or even an uploaded PDF document.
- **Multilingual Support**: Fully bilingual interface and story generation (English and Arabic), complete with right-to-left (RTL) layout support.
- **AI Audio & Voiceovers**: Human-like expressive voice synthesis reads the stories aloud with word highlighting.
- **AI Illustrations**: Each story slide is accompanied by a custom-generated, character-consistent image that visually narrates the scene.
- **Interactive Reader**: A sleek, full-screen reader view with progress tracking, read-time estimation, and interactive audio controls.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express
- **AI Integrations**: Gemini 3.8 Flash (Text & Vision), Gemini Image APIs, Google Cloud TTS (Chirp3-HD)
- **Data Storage**: Local JSON-based flat files for lightweight deployment

## ⚙️ Local Development Setup

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. **Google Cloud TTS Authentication**:
   Place your `google-credentials.json` Service Account key in the root directory for Chirp3-HD voice access.
5. **Start the Frontend**: `npm run dev`
6. **Start the Backend**: `node server.js`

## 📦 Deployment (Plesk / Phusion Passenger)

The application is configured to run on Plesk using Phusion Passenger. The `passenger_wsgi.py` handles the routing to the compiled `server.js`. Ensure you run `npm run build` locally before pushing to production, as the `dist` folder is required for the static frontend.

## 📄 License

Proprietary. All rights reserved.

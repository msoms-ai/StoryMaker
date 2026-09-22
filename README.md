# Qisas (قصص) - Interactive AI Story Generator 📚✨

Qisas is a pioneering interactive storytelling platform designed to elevate children's and youth literature. Powered by generative AI, it fuses engaging storytelling, evocative pencil-sketch illustrations, and expressive human-like speech synthesis into a rich, interactive educational experience.

## ✨ Key Features

- **AI Story Generation**: Automatically generate rich, multi-slide stories from a simple text prompt, a topic, or even an uploaded PDF document.
- **Multilingual Support**: Fully bilingual interface and story generation (English and Arabic), complete with right-to-left (RTL) layout support.
- **AI Audio & Voiceovers**: Human-like expressive voice synthesis reads the stories aloud, enhancing accessibility and immersion.
- **AI Pencil-Sketch Illustrations**: Each story slide is accompanied by a custom-generated, character-consistent pencil sketch that visually narrates the scene.
- **Public Author Profiles**: Authors can customize their public profiles with AI-generated cover images and showcase their published libraries.
- **Interactive Reader**: A sleek, full-screen reader view with progress tracking, read-time estimation, and interactive audio controls.
- **Admin Dashboard**: Comprehensive moderation tools for admins to manage categories, monitor usage, and govern stories.

## 🚀 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express
- **AI Integrations**: Gemini API (Text & Multimodal Processing, Image Generation, Voice Synthesis)
- **Data Storage**: Local JSON-based flat files for lightweight deployment

## 🛠️ Getting Started

### Prerequisites
- Node.js installed
- A valid Gemini API key (`GEMINI_API_KEY`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/msoms-ai/StoryMaker.git
   cd StoryMaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   ```

4. **Start the Servers**
   You will need two terminal windows to run the frontend and backend simultaneously.
   
   *Terminal 1 (Backend):*
   ```bash
   node server.js
   ```
   
   *Terminal 2 (Frontend):*
   ```bash
   npm run dev
   ```

5. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`.

## 📂 Project Structure

- `/src/components` - React UI components and pages
- `/server.js` - Main backend Express server and API endpoints
- `/aiTextService.js` - Gemini text and PDF extraction logic
- `/aiImageService.js` - AI image generation logic
- `/aiVoiceService.js` - AI audio synthesis logic
- `/STORIES/` - Auto-generated storage for compiled story assets (JSON, images, audio)
- `/USERS/` - User data and profiles

## 🔒 License
Proprietary - Developed by msoms.ai

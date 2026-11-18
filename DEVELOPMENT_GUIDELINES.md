# Qisas Story Platform: Development, Security & Architecture Guidelines

This document serves as the master guide for maintaining, extending, and testing the Qisas Story Generator platform. All contributors and automated agents must adhere to these standards.

---

## 1. System Architecture Overview

```
├── Frontend (Vite + React 18 + Tailwind CSS)
│   ├── src/components/       # Modular UI pages, modals, and views
│   ├── src/context/          # AuthContext (JWT) & LanguageContext (i18n Arabic/English)
│   ├── src/utils/            # Line-art converter, ambient soundscapes, speech coach
│   └── src/styles/           # Global styles and Tailwind configuration
│
├── Backend (Node.js 20 + Express + BullMQ Queue + SQLite)
│   ├── server.js             # Core Express API, REST endpoints
│   ├── sqliteDatabase.js     # SQLite ACID persistence layer (WAL mode, prepared statements)
│   ├── securityGuards.js     # Centralized prompt injection, path traversal & upload guards
│   ├── aiTextService.js      # Gemini story breakdown, character visual bible, quiz generator
│   ├── aiImageService.js     # Imagen 3 & Gemini image generation with consistency prompts
│   ├── aiBranchingService.js # Choose-Your-Own-Adventure interactive branching
│   ├── aiHotspotService.js   # Interactive vocabulary hotspot identification
│   ├── aiVoiceService.js     # Google Cloud TTS with Arabic vowelization (Tashkeel)
│   ├── videoService.js       # FFmpeg video rendering & subtitle sync
│   └── queueService.js       # BullMQ Redis job queue with in-memory fallback
│
├── Storage & Persistence
│   ├── STORIES/database.sqlite # Primary ACID SQLite database (users, stories, categories, roles)
│   ├── STORIES/database.json   # Automated atomic JSON backup snapshot
│   ├── STORIES/<id>/           # Story media assets (images, audio, video MP4)
│   ├── USERS/<id>/             # User avatar, cover, and teacher proof files
│   └── uploads/                # Ephemeral upload processing (strictly auto-deleted)
│
└── Testing & CI/CD
    ├── tests/                # Automated regression test suite (node:test)
    └── .github/workflows/    # GitHub Actions automated build & test pipeline
```

---

## 2. CI/CD & Testing Standards

### Automated Testing
The project uses Node.js 20's native test runner (`node:test` and `node:assert/strict`) for rapid, dependency-free automated tests:
```bash
# Run the complete test suite
npm test
```
The test suite validates:
1. **Security Guards:** Prompt injection filtering, delimiter boundary preservation, path traversal sanitization, and Multer MIME/extension filters.
2. **Authentication Protection:** Password hashing with Bcrypt, elimination of `passwordHash`, OTPs, and reset tokens via `sanitizeUser`.
3. **Data Integrity:** Story slide structure and interactive quiz question formatting.

### GitHub Actions CI Workflow (`.github/workflows/ci.yml`)
On every `push` and `pull_request` to tracked branches:
1. Runs on `ubuntu-latest` with Node.js 20.x.
2. Executes `npm ci` for clean dependency installation.
3. Runs `npm test` (all 18+ tests must pass).
4. Runs `npm run build` (Vite production bundle verification).

---

## 3. Security Architecture & Threat Defenses

### A. Database Persistence & Concurrency
- **Universal Engine:** High-performance In-Memory Indexed Engine with Atomic POSIX/NTFS file persistence (`sqliteDatabase.js`).
- **Zero Native Dependencies:** Built purely in standard JavaScript — requires no C++ compilers (`g++`, `gcc`, `make`, `python3`), ensuring 100% flawless deployment across any hosting environment (Plesk, cPanel, Docker, Ubuntu, Node 18 through Node 26+).
- **Concurrency & Speed:** In-memory $O(1)$ Hash Map indexing (`usersByEmail`, `storiesById`, `categoriesById`) guarantees microsecond (<0.01ms) response times.
- **ACID Atomic Writes:** Writes to an atomic `.tmp` buffer file before replacing the target via `fs.renameSync()`, preventing file corruption during power failures or sudden server restarts. Maintains automatic rolling backups (`database.backup.json`).
- **Injection Defense:** All lookups use direct key matching and prepared object queries. No raw string injection or script evaluation is ever performed.
- **Directory Traversal Protection:** All file path references are validated using `sanitizePathSegment()` and path containment checks (`path.resolve(DIR, id).startsWith(DIR)`).

### B. File Upload Security
All file uploads use restricted Multer storage with explicit validation:
| Endpoint | Purpose | Allowed Types | Max Size | Cleanup |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/upload` | Document Text Extraction | `.pdf`, `.txt` (`application/pdf`, `text/plain`) | **10 MB** | Guaranteed deleted in `finally` |
| `POST /api/user/avatar` | Profile Avatar | `.jpg`, `.jpeg`, `.png`, `.webp` | **1 MB** | Saved to user's isolated folder |
| `POST /api/user/cover/upload` | Profile Cover | `.jpg`, `.jpeg`, `.png`, `.webp` | **2 MB** | Saved to user's isolated folder |
| `POST /api/user/request-story-maker` | Teacher ID Proof | `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` | **5 MB** | Verified by Admin only |

### C. Prompt Injection & AI Safety
User-supplied inputs (story text, titles, modification notes, branching choices) are passed through `sanitizePromptInput()`:
1. **Tag Stripping:** Neutralizes attempts to inject closing delimiter tags (e.g. `</untrusted_user_story_input>`).
2. **Phrase Filtering:** Replaces known override triggers ("ignore all previous instructions", "system override", "developer mode") with safe tokens.
3. **Length Caps:** Prevents context window exhaustion denial-of-service.
4. **Isolated Delimiters:** All untrusted user content is enclosed in explicit XML-like fences with a strict `SECURITY & INTEGRITY DIRECTIVE` commanding the model never to obey instructions embedded within user text.

### D. Authentication & Authorization
- Passwords hashed using `bcryptjs` with standard 10-round salt.
- JWT tokens with HMAC SHA-256 signing (`authMiddleware.js`).
- Protected endpoints strictly enforce role authorization (`requireRole(['Story Maker', 'Admin'])`).
- Sensitive fields (`passwordHash`, `otpCode`, `resetOtp`) are stripped from all API outputs via `sanitizeUser()`.

---

## 4. Change Management Checklist

Whenever implementing new features or making modifications, verify the following 5 checkpoints:

- [ ] **1. Run Tests:** `npm test` passes 100% with zero failures.
- [ ] **2. Verify Production Build:** `npm run build` completes with zero errors.
- [ ] **3. Input Validation:** Any new endpoint accepting user strings or files applies `sanitizePromptInput()`, `sanitizePathSegment()`, or a strict Multer filter.
- [ ] **4. Responsive & Bidi UI:** Verify visual layout in both **Arabic (RTL)** and **English (LTR)**, checking desktop (`>= 768px`) and mobile (`< 768px`) screens.
- [ ] **5. Git Cleanliness:** Never commit `.env`, `.apk`, `google-credentials.json`, or temporary test files. Keep `.gitignore` updated.

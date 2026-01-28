# Endo App Forge - Healthcare AI Platform

## Introduction

**Endo App Forge** is a Korean-language AI-powered healthcare platform designed for medical professionals and health-conscious users. The platform provides evidence-based clinical information, health chatbot services, exercise guidance, medication information, and an AI-powered medical app blueprint generator.

**Live URL:** https://endo-app-forge.pages.dev
**Repository:** https://github.com/cmoh1981/endo-app-forge

---

## Project Aim & Vision

### Primary Goals

1. **Democratize Medical Knowledge** — Provide evidence-based clinical information accessible to healthcare professionals and patients in Korean language.

2. **AI-Powered Health Assistance** — Leverage Google Gemini AI to answer health questions, generate personalized exercise plans, and provide medication information.

3. **Medical App Development Tool** — Help medical professionals and entrepreneurs design healthcare applications with AI-generated blueprints.

4. **Free & Accessible** — All features are free to use with an ad-supported revenue model (no paywall).

### Target Users

- Korean-speaking healthcare professionals (physicians, nurses, pharmacists)
- Patients seeking reliable health information
- Medical app developers and entrepreneurs
- Health-conscious individuals

---

## What We Built

### Development Journey

1. **Initial Setup** — Created a Cloudflare Pages application with Hono.js SSR framework
2. **Authentication System** — Implemented secure user registration/login with PBKDF2 password hashing and HMAC-SHA256 session tokens
3. **AI Integration** — Integrated Google Gemini 2.0 Flash API for AI-powered features
4. **Healthcare Services** — Ported services from a previous healthcare app (오늘건강/Today's Health):
   - Health chatbot with conversation memory
   - Exercise library with 7 exercises
   - AI exercise plan generator
   - Medication information search
   - Medical knowledge base
5. **Modern UI Design** — Redesigned with glass-morphism effects, gradient backgrounds, and premium healthcare aesthetic

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript, CSS3 |
| Backend | Hono.js (TypeScript) |
| Hosting | Cloudflare Pages (Edge) |
| Database | Cloudflare KV (Key-Value Store) |
| AI | Google Gemini 2.0 Flash API |
| Auth | Web Crypto API (PBKDF2, HMAC-SHA256) |
| Build | Vite |

---

## Features & Functions

### 1. Evidence AI (임상 근거 AI 검색)

Search for clinical evidence on medical topics. Returns structured answers with:
- Evidence-based responses
- Academic citations (journal, year, DOI)
- Confidence level (high/moderate/limited)
- Related questions for further exploration

**Supported Topics:**
- Type 2 Diabetes treatment guidelines
- Hypertension management
- Thyroid nodule evaluation (TI-RADS)
- HbA1c targets for elderly patients

### 2. Health Chatbot (건강 챗봇)

Conversational AI assistant for health questions:
- Drug information and interactions
- Nutrition advice
- Exercise guidance
- General health questions
- Maintains conversation history for context

**Disclaimer:** For reference only, not a substitute for medical advice.

### 3. Exercise Guide (운동 가이드)

Exercise library with 7 exercises:
- **Categories:** Indoor, Gym, Outdoor
- **Types:** Strength, Core, Cardio, Plyometric
- **Details:** Sets, reps, rest time, calories/min, instructions

**AI Exercise Plan Generator:**
- Input: Goal, fitness level, available equipment
- Output: Personalized 7-day workout plan with daily exercises and tips

### 4. Medication Info (약물 정보)

Search for medication information:
- Mechanism of action
- Dosage guidelines
- Side effects
- Drug interactions
- Contraindications

Uses local medical knowledge base + Gemini AI for comprehensive responses.

### 5. App Forge (의료 앱 블루프린트)

AI-powered medical app design tool:
- Select from 3 templates:
  - Glucose Intelligence Hub (혈당 인텔리전스 허브)
  - Clinical Trial Orchestrator (임상시험 오케스트레이터)
  - Metabolic Lifestyle Coach (대사 라이프스타일 코치)
- Input project details
- Generate complete app blueprint:
  - UI/UX design plan
  - Data model
  - AI features
  - Monetization strategy
  - Launch checklist
  - Compliance requirements

### 6. About (소개)

Information about the platform and free signup option.

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | No | User registration |
| `/api/auth/login` | POST | No | User login, returns token |
| `/api/auth/logout` | POST | Yes | Logout, invalidates session |
| `/api/auth/me` | GET | Yes | Get current user info |
| `/api/templates` | GET | No | List app templates |
| `/api/ask` | POST | Optional | Evidence AI query |
| `/api/generate` | POST | Optional | Generate app blueprint |
| `/api/chat` | POST | Yes | Health chatbot |
| `/api/exercises` | GET | No | List all exercises |
| `/api/exercises/plan` | POST | Yes | Generate exercise plan |
| `/api/medication` | POST | Yes | Search medication info |

---

## File Structure & Code Explanation

```
C:\Users\ohbry\webapp\
├── src/
│   ├── index.tsx          # Main application server
│   └── renderer.tsx       # HTML template renderer
├── public/
│   └── static/
│       ├── app.js         # Client-side JavaScript
│       └── style.css      # All CSS styles
├── package.json           # Dependencies & scripts
├── wrangler.jsonc         # Cloudflare configuration
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript configuration
├── memory.md              # Session memory for development
└── healthapp.md           # This documentation file
```

---

### `src/index.tsx` — Main Server (Core Application)

**Size:** ~1,100 lines
**Purpose:** Contains all backend logic, API routes, and the landing page JSX.

#### Sections:

**1. Type Bindings (Lines 1-15)**
```typescript
type Bindings = {
  USERS: KVNamespace      // User data storage
  SESSIONS: KVNamespace   // Session token storage
  GEMINI_API_KEY: string  // AI API key
  JWT_SECRET: string      // Token signing secret
}
```

**2. Crypto Helpers (Lines 17-94)**
- `arrayBufferToBase64Url()` / `base64UrlToArrayBuffer()` — Base64 encoding utilities
- `hashPassword()` — PBKDF2 password hashing (100,000 iterations, SHA-256)
- `verifyPassword()` — Password verification
- `createToken()` / `verifyToken()` — HMAC-SHA256 session tokens

**3. Auth Middleware (Lines 96-116)**
- `getUser()` — Extract user session from Authorization header

**4. Template Library (Lines 118-168)**
- 3 medical app templates with Korean/English names, descriptions, screen designs, entities, and AI features

**5. Evidence Database (Lines 170-310)**
- Pre-built evidence responses for common medical topics:
  - Diabetes (당뇨병)
  - Hypertension (고혈압)
  - Thyroid nodules (갑상선 결절)
  - HbA1c targets (당화혈색소)
- Each response includes: answer, citations, confidence level, related questions

**6. Exercise Data (Lines 312-380)**
```typescript
const exercises = [
  { id: "IND_001", name: "Push-ups", name_ko: "팔굽혀펴기", ... },
  { id: "IND_002", name: "Plank", name_ko: "플랭크", ... },
  // ... 7 total exercises
]
```
- Categories: indoor, gym, outdoor
- Types: strength, core, cardio, plyometric
- Includes: sets, reps, rest time, calories, instructions (Korean)

**7. Medical Knowledge Base (Lines 382-410)**
```typescript
const medicalKnowledge = [
  { id: "K001", title: "고혈압 약물과 운동 주의사항", ... },
  { id: "K002", title: "단백질 흡수 극대화 전략", ... },
  // ... 4 total entries
]
```
- Categories: Medication, Nutrition, Disease, Recovery
- Used for grounding AI responses with verified medical information

**8. API Routes (Lines 412-754)**

| Route | Function |
|-------|----------|
| `POST /api/auth/signup` | Create new user account |
| `POST /api/auth/login` | Authenticate and create session |
| `POST /api/auth/logout` | Delete session |
| `GET /api/auth/me` | Get current user |
| `GET /api/templates` | Return template library |
| `POST /api/ask` | Evidence AI search |
| `POST /api/generate` | Generate app blueprint via Gemini |
| `POST /api/chat` | Health chatbot with Gemini |
| `GET /api/exercises` | Return exercise library |
| `POST /api/exercises/plan` | Generate 7-day exercise plan |
| `POST /api/medication` | Search medication info |

**9. Gemini AI Integration**
```typescript
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

// Request format
const response = await fetch(GEMINI_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7 }
  })
})
```

**10. Landing Page JSX (Lines 756-1100)**
- Navigation with auth buttons
- Hero section with gradient badge
- Tab panels for each feature:
  - Evidence AI with search input and quick chips
  - Health chatbot with message bubbles
  - Exercise grid with filter chips
  - Medication search
  - App Forge form
  - About section
- Footer with links
- Auth modal for login/signup

---

### `src/renderer.tsx` — HTML Template

**Purpose:** Wraps page content in HTML document structure.

```typescript
export const renderer = createMiddleware(async (c, next) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8"/>
      <title>Endo App Forge - AI 임상 근거 플랫폼</title>
      <link href="https://fonts.googleapis.com/css2?family=Pretendard..." />
      <link href="/static/style.css" rel="stylesheet"/>
    </head>
    <body>
      ${content}
      <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})
```

---

### `public/static/app.js` — Client-Side JavaScript

**Size:** ~900 lines
**Purpose:** All frontend interactivity.

#### Main Components:

**1. State Management**
```javascript
let templates = [];           // App templates
let authToken = localStorage.getItem('auth_token');
let currentUser = null;
let chatHistory = [];         // Chat conversation memory
let exercisesData = [];       // Exercise library
let currentFilter = 'all';    // Exercise filter
```

**2. Tab Switching**
- `initTabs()` — Bind click handlers to tabs and nav links
- `switchTab(tabId)` — Show/hide tab panels

**3. Evidence AI**
- `initEvidenceAI()` — Setup search input and quick chips
- `submitQuestion()` — Send query to `/api/ask`
- `renderEvidenceResult()` — Display citations and related questions

**4. Health Chat**
- `initHealthChat()` — Setup chat input and quick chips
- `sendChatMessage()` — Send message to `/api/chat` with history
- Creates chat bubbles with typing indicator animation

**5. Exercises**
- `initExercises()` — Fetch exercises, setup filters
- `renderExercises()` — Display exercise cards with details
- `generateExercisePlan()` — Call `/api/exercises/plan`

**6. Medication**
- `initMedication()` — Setup search input
- `searchMedication()` — Query `/api/medication`

**7. App Forge**
- `initAppForge()` — Setup form submission
- `fetchTemplates()` — Load templates from `/api/templates`
- `submitBlueprint()` — Generate blueprint via `/api/generate`
- `renderBlueprint()` — Display generated blueprint sections

**8. Authentication**
- `initAuth()` — Setup modal, form handlers, logout
- `checkSession()` — Verify token on page load
- `updateAuthUI()` — Toggle auth button vs user menu

**9. Utilities**
- `escapeHtml()` — Prevent XSS attacks

---

### `public/static/style.css` — Styles

**Size:** ~600 lines
**Purpose:** Complete visual design.

#### Design System:

**CSS Variables (Root)**
```css
:root {
  --bg: #020617;                    /* Dark background */
  --surface: rgba(255,255,255,0.04); /* Card backgrounds */
  --border: rgba(255,255,255,0.08);  /* Borders */
  --blue: #3b82f6;                   /* Primary accent */
  --blue-glow: rgba(59,130,246,0.15);
  --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  --gradient-accent: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  /* ... more variables */
}
```

**Key Style Sections:**

| Section | Description |
|---------|-------------|
| Base Reset | Box-sizing, margins, body styles |
| Ambient Background | Gradient mesh with blue/purple/cyan glows |
| Navigation | Flexbox nav with brand and links |
| Hero | Gradient text, glow effects, badge animation |
| Tabs | Pill-style segment control with glass-morphism |
| Cards | Glass-morphism with blur, hover lift effect |
| Forms | Custom inputs with inner shadows, focus glow |
| Buttons | Gradient fills, hover/active states |
| Chat UI | Message bubbles, typing animation |
| Exercise UI | Grid layout, filter chips, detail panels |
| Medication UI | Result cards, source citations |
| Animations | Entrance animations, loading states |
| Responsive | Mobile breakpoints |

---

### `package.json` — Dependencies

```json
{
  "name": "endo-app-forge",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "wrangler pages dev dist",
    "deploy": "npm run build && wrangler pages deploy dist --project-name endo-app-forge"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/vite-dev-server": "^0.18.0"
  },
  "devDependencies": {
    "vite": "^6.3.0",
    "wrangler": "^4.4.0",
    "typescript": "^5.7.0",
    "@cloudflare/workers-types": "^4.20250109.0"
  }
}
```

**Dependencies:**
- `hono` — Lightweight web framework for edge computing
- `@hono/vite-dev-server` — Vite integration for Hono

**Dev Dependencies:**
- `vite` — Fast build tool
- `wrangler` — Cloudflare CLI
- `typescript` — Type safety
- `@cloudflare/workers-types` — Cloudflare type definitions

---

### `wrangler.jsonc` — Cloudflare Configuration

```jsonc
{
  "name": "endo-app-forge",
  "compatibility_date": "2025-01-01",
  "pages_build_output_dir": "dist",
  "kv_namespaces": [
    { "binding": "USERS", "id": "f506da6d5d4e4c63ab72cdf5e6f82f7e" },
    { "binding": "SESSIONS", "id": "9a5028ea2020479ca605444d8140e64e" }
  ]
}
```

**KV Namespaces:**
- `USERS` — Stores user accounts (email, password hash, created date)
- `SESSIONS` — Stores active session tokens

**Environment Secrets (set in Cloudflare dashboard):**
- `GEMINI_API_KEY` — Google AI API key
- `JWT_SECRET` — Token signing secret

---

### `vite.config.ts` — Build Configuration

```typescript
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/index.tsx'
    })
  ],
  build: {
    ssr: 'src/index.tsx'
  }
})
```

---

### `tsconfig.json` — TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "strict": true
  }
}
```

- Uses Hono's JSX runtime (not React)
- ES2022 target for modern JavaScript features

---

## Security Considerations

### Password Hashing
- PBKDF2 with 100,000 iterations
- SHA-256 hash function
- Random 16-byte salt per password

### Session Tokens
- HMAC-SHA256 signed tokens
- Stored in Cloudflare KV with user data
- Sent via Authorization header

### Input Validation
- HTML escaping to prevent XSS
- JSON parsing with error handling
- API error messages in Korean

### Disclaimers
- Medical information disclaimer on chatbot
- Medication info disclaimer
- "For reference only, consult a professional"

---

## Deployment

### Deploy Command
```bash
cd C:\Users\ohbry\webapp
npm run deploy
```

Or manually:
```bash
npm run build
export CLOUDFLARE_API_TOKEN=<token>
npx wrangler pages deploy dist --project-name=endo-app-forge
```

### Environment Variables (Cloudflare Pages)
- `GEMINI_API_KEY` — Google AI API key
- `JWT_SECRET` — Session token secret

---

## Future Improvements

1. **Google AdSense Integration** — Connect real ads (currently placeholders)
2. **More Exercises** — Expand from 7 to 50+ exercises
3. **Medical Knowledge Base** — Add more entries for better AI grounding
4. **Sleep Analysis** — Integrate sleep scoring service (code exists in original app)
5. **User Profiles** — Save preferences, exercise history, health metrics
6. **Mobile App** — Convert to PWA or native app
7. **Multi-language** — Add English support
8. **Analytics** — Track usage patterns

---

## Credits

- **Developer:** Built with Claude AI assistance
- **AI:** Google Gemini 2.0 Flash
- **Hosting:** Cloudflare Pages
- **Framework:** Hono.js
- **Original Healthcare App:** 오늘건강 (Today's Health)

---

*Last Updated: January 2026*

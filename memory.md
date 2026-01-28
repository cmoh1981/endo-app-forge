# Endo App Forge - Session Memory

## Project Overview
**Endo App Forge** - AI-powered medical platform (Korean-language) hosted on Cloudflare Pages + Hono SSR.
- **Live URL**: https://endo-app-forge.pages.dev
- **GitHub**: https://github.com/cmoh1981/endo-app-forge (branch: master)
- **Working directory**: `C:\Users\ohbry\webapp`

## Tech Stack
- **Framework**: Hono (SSR on Cloudflare Workers)
- **Build**: Vite
- **Hosting**: Cloudflare Pages
- **Storage**: Cloudflare KV (USERS, SESSIONS)
- **AI**: Google Gemini 2.0 Flash (REST API)
- **Auth**: PBKDF2 password hashing + HMAC-SHA256 session tokens via Web Crypto API

## Cloudflare Config
- **Account ID**: `5c36e3b9d924d0e280b05621e6f2cd45`
- **API Token**: `BdIs19Gyk4ei9rb3W2ng6jdOr1ipePSl7mmTXYDU`
- **KV USERS**: `f506da6d5d4e4c63ab72cdf5e6f82f7e`
- **KV SESSIONS**: `9a5028ea2020479ca605444d8140e64e`
- **Env Secrets on Pages**: GEMINI_API_KEY, JWT_SECRET (old PADDLE/ZHIPU keys removed)

## API Keys
- **Gemini API Key**: `AIzaSyDnrTQNMTNaPglo1HGet5CTq-9xP-JZcvE`

## Deploy Command
```bash
cd C:/Users/ohbry/webapp
export CLOUDFLARE_API_TOKEN=BdIs19Gyk4ei9rb3W2ng6jdOr1ipePSl7mmTXYDU && npx wrangler pages deploy dist --project-name=endo-app-forge
```
Or: `npm run deploy` (builds + deploys)

## File Structure
```
webapp/
├── src/
│   ├── index.tsx        # Main server: auth, all API routes, landing page JSX
│   └── renderer.tsx     # HTML renderer
├── public/static/
│   ├── app.js           # Client-side JS (chat, exercises, medication UI)
│   └── style.css        # All styles
├── wrangler.jsonc       # Cloudflare config with KV bindings
└── package.json
```

## Features (6 Tabs)
1. **Evidence AI** - Clinical evidence search powered by Gemini
2. **건강 챗봇** (Health Chat) - Conversational health chatbot with memory
3. **운동 가이드** (Exercise Guide) - 7 exercises with category filters + AI-generated 7-day plans
4. **약물 정보** (Medication Info) - Drug search with local knowledge base + Gemini
5. **App Forge** - AI app blueprint generator
6. **소개** (About) - App info

## API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | User registration |
| `/api/auth/login` | POST | No | Login, returns token |
| `/api/auth/me` | GET | Yes | Current user info |
| `/api/ask` | POST | Yes | Evidence AI query |
| `/api/chat` | POST | Yes | Health chatbot |
| `/api/exercises` | GET | No | Exercise library |
| `/api/exercises/plan` | POST | Yes | AI exercise plan |
| `/api/medication` | POST | Yes | Drug info search |
| `/api/generate` | POST | Yes | App blueprint generator |

## Revenue Model
- All features free (ad-supported model)
- Ad placeholder banners in place (no AdSense connected yet)

## Git History
```
f534db2 feat: add healthcare services from 오늘건강 app
55c2e33 refactor: switch to free model with Gemini AI, remove Paddle
25a319c feat: add auth, Paddle payments, GLM-4 AI integration
7fb801a feat: bootstrap Endo App Forge - AI clinical evidence + app blueprint generator
```

## Known Issues / Notes
- Gemini sometimes wraps JSON responses in markdown fences (handled with regex stripping)
- Curl with `$TOKEN` bash variable can corrupt tokens with special chars; use inline values
- Korean text in curl can get mangled; works fine from browser
- All user-facing text is in Korean

## Previous Healthcare App Reference
Source files read from: `C:\Users\ohbry\Downloads\오늘건강-(today's-health) (2)/`
- Exercise data (7 items), medical knowledge (4 entries), sleep analysis, retrieval service
- Services were adapted from React client-side (@google/genai SDK) to Hono server-side (REST API)

## What Could Be Done Next
- Connect Google AdSense (currently placeholder ads)
- Add more exercises and medical knowledge entries
- Integrate sleep analysis service (sleepAnalysisService.ts - not yet added)
- Add user profile / settings page
- Mobile responsive improvements

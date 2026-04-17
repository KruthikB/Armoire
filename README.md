# Wardrobe AI

AI-powered digital wardrobe and outfit recommendation system.  
Runs entirely on your machine — no database, no cloud storage required.

---

## Stack

| Layer       | Technology |
|-------------|------------|
| Framework   | Next.js 14 (App Router) |
| Styling     | Tailwind CSS |
| Auth        | Custom JWT (`jose`) + bcrypt |
| Storage     | Local JSON files (`data/`) |
| Images      | Local disk (`public/uploads/`) |
| AI          | Google Gemini 1.5 Flash |
| State       | Zustand |

---

## API Call Budget

| Action | Gemini calls |
|--------|-------------|
| Upload a clothing item | **1** (vision analysis, cached forever) |
| Send a chat message | **1** (chat response) |
| Get outfit recommendations | **0** (pure rule-based engine) |
| Everything else | **0** |

---

## Prerequisites

- Node.js 18+
- A free Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

## Setup (2 steps)

### 1. Install dependencies

```bash
cd "Wardrobe AI"
npm install
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
GEMINI_API_KEY=AIza...          # from aistudio.google.com
JWT_SECRET=any-long-random-string-here
```

That's it. No database setup, no cloud accounts.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start uploading clothes.

---

## Where your data lives

```
Wardrobe AI/
├── data/
│   ├── users.json              ← user accounts (email + bcrypt hash)
│   ├── wardrobe/{userId}.json  ← clothing items + AI analysis
│   ├── chats/{userId}.json     ← chat sessions + message history
│   ├── outfits/{userId}.json   ← saved outfit combinations
│   └── preferences/{userId}.json
│
└── public/uploads/{userId}/    ← your clothing images (JPEG, resized)
```

Everything is on your machine. Nothing is sent anywhere except the Gemini API for analysis.

---

## How a clothing upload works

```
You drop an image
  ↓
Browser → base64 → POST /api/wardrobe
  ↓
1. Image saved to public/uploads/{userId}/{uuid}.jpg   (disk, no API)
2. Gemini 1.5 Flash analyses the image                 (1 API call)
   → returns: name, category, style, colors, tags,
              season, occasion, material, pattern
3. Result written to data/wardrobe/{userId}.json       (disk, no API)
   and cached in memory for the session
  ↓
Image appears in your wardrobe grid instantly
```

The analysis result is stored permanently — re-opening the app never re-calls Gemini for existing items.

---

## How the chat + outfit engine works

```
You type: "What should I wear for dinner tonight?"
  ↓
1. Intent detected locally (keyword rules)            (no API)
2. Wardrobe loaded from JSON file                     (no API)
3. Rule-based engine scores all Top×Bottom×Shoe combos:
   - Color compatibility (neutral + complement rules)
   - Style matrix (FORMAL+FORMAL=1.0, FORMAL+SPORTY=0.0)
   - Occasion tag overlap
   - Season filter
   → Top 3 outfits selected, named, explained         (no API)
4. Outfits are saved to data/outfits/{userId}.json     (no API)
5. Gemini 1.5 Flash writes a natural response
   with the pre-computed outfits injected as context   (1 API call)
  ↓
Aria responds + outfit cards appear in the chat
```

---

## Project Structure

```
app/
├── (auth)/login + signup        Auth pages
├── (dashboard)/
│   ├── wardrobe/                Clothing grid + upload
│   ├── chat/                    AI chat interface
│   ├── outfits/                 Saved outfit history
│   └── favorites/               Favorited items
└── api/
    ├── auth/login|logout|signup|me
    ├── wardrobe/[id]
    ├── chat/sessions/[id]/messages
    ├── outfits/
    └── feedback/

lib/
├── storage/
│   ├── fileStore.ts    JSON r/w with in-memory cache
│   └── imageStore.ts   Local image save/delete/read
├── auth/session.ts     JWT sign/verify/cookie
└── ai/
    ├── gemini.ts       Vision analysis + chat
    └── recommendations.ts  Pure rule-based engine (0 API calls)

components/
├── layout/Sidebar.tsx
├── wardrobe/           WardrobeClient, ClothingCard, UploadModal
├── chat/               ChatClient, MessageBubble, ChatInput, OutfitCarousel
└── outfits/            OutfitsClient

store/
├── useWardrobeStore.ts   Zustand wardrobe state
└── useChatStore.ts       Zustand chat state

data/                   ← auto-created, gitignored
public/uploads/         ← auto-created, gitignored
```

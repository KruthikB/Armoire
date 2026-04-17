# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

There are no tests in this project.

## Environment Variables

Create a `.env.local` file with:
```
GEMINI_API_KEY=       # From aistudio.google.com — NOT Google Cloud (free tier requires a project without billing)
JWT_SECRET=           # Random string ≥ 32 chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Gemini API key gotcha:** The key must come from [aistudio.google.com](https://aistudio.google.com) using "Create API key in new project". Keys from Google Cloud projects with billing enabled set the free-tier quota to 0 and will 429 immediately.

## Architecture

### Storage — flat JSON files, no database

All data lives in `/data/` (gitignored) as per-user JSON files:

```
data/
├── users.json                  ← { [userId]: StoredUser }
├── wardrobe/{userId}.json      ← ClothingItem[]
├── chats/{userId}.json         ← { sessions: [], messages: {} }
├── outfits/{userId}.json       ← StoredOutfit[]
└── preferences/{userId}.json
```

Images are saved to `public/uploads/{userId}/{uuid}.jpg`.

`lib/storage/fileStore.ts` is the single access layer. It keeps an in-memory Map cache per file — **always use sequential `for` loops (never `Promise.all`) when writing multiple items to the same file**, or reads between writes will return a stale snapshot and the last write overwrites previous ones.

Chat sessions older than 20 days are auto-purged on every `getChatSessions()` call. Outfits are deduplicated by item fingerprint (`items.map(i => i.itemId).sort().join("|")`).

### Auth — JWT in httpOnly cookie

`lib/auth/session.ts` signs HS256 JWTs (7-day expiry) using `jose` (Edge-compatible). The cookie is named `auth_token`. `getSession()` is used in Server Components and API routes; `getSessionFromRequest(req)` is used in middleware.

`middleware.ts` protects all routes except `/`, `/login`, `/signup`, `/api/auth/*`, `/_next/*`, and `/uploads/*`. Unauthenticated requests are redirected to `/login?callbackUrl=...`; authenticated users hitting auth pages are redirected to `/wardrobe`.

### AI — exactly 1 Gemini call per operation

`lib/ai/gemini.ts` has two entry points:

- **`analyzeClothingImages(base64Array[])`** — batch vision analysis, 1 call for up to 4 images. Returns `ClothingAnalysis[]` via JSON response mode.
- **`chatWithAria(message, history, wardrobeSummary, outfits, context)`** — conversational AI. Always uses `responseMimeType: "application/json"` and always returns a structured `AriaResponse`. `systemInstruction` must be passed to `getGenerativeModel`, not `startChat`. Chat history uses `role: "model"` (not `"assistant"`) and `parts: [{ text }]` (not `content: string`).

Current model: `gemini-3-flash-preview`. Change in both `analyzeClothingImages` and `chatWithAria`.

### Outfit recommendations — zero API calls

`lib/ai/recommendations.ts` is a pure local scoring engine. `generateOutfits(req)` scores every top × bottom × footwear combination in the wardrobe across:

- Occasion match (0.35 weight) — `classifyOccasion()` maps user text to occasion types via keyword lists in `OCCASION_MAP`
- Traditional clothing tag bonus (+0.30) — detects kurta/saree/lehenga/etc. in item name or tags
- Ceremony color bonus (+0.40) — haldi→yellow, wedding→red/maroon, mehndi→green, etc. via `CEREMONY_COLOR_PREF`
- Style coherence (0.20), color compatibility (0.20), time-of-day color fit (+0.08), season filter, user color preferences (+0.05)
- Color exclusions: hard-filter items with excluded colors; falls back to −0.30 soft penalty if the filtered pool drops below 3 items

### Chat message flow — `app/api/chat/sessions/[id]/messages/route.ts`

Every POST follows this sequence, spending exactly 1 Gemini call:

1. Pre-compute 8 outfit candidates locally (0 API calls) using the full user message as occasion text
2. Inject all candidates into the Gemini prompt as wardrobe context
3. **Single Gemini call** → returns `AriaResponse` (structured JSON)
4. If `needsOutfits: true`:
   - For simple requests: use `requestedCount` to slice/re-run candidates; reorder by `preferredOutfitIndex`
   - For itinerary/multi-context: loop over `outfitContexts[]`, each with a `precomputedIndex` that maps to a specific pre-computed candidate (carousel shows exactly what Gemini referenced in its reply); fallback to local re-generation for slots with no valid index
   - Luggage constraint detection (`hasLuggageConstraint`): when a weight/luggage limit is mentioned, only exclude tops (not bottoms) between slots so the same pants/shoes can appear across multiple itinerary slots
5. Persist outfits to `data/outfits/{userId}.json` (deduplication by fingerprint applies)
6. Save assistant message with `outfits` array

**`AriaResponse` fields:** `reply`, `needsOutfits`, `occasion`, `preferredColors`, `excludedColors`, `preferredOutfitIndex`, `requestedCount`, `outfitContexts: OutfitContext[]`

**`OutfitContext` fields:** `label` (e.g. "Day 1 — Haldi Ceremony"), `count`, `occasion`, `precomputedIndex`

### Frontend state

Two Zustand stores:
- `store/useWardrobeStore.ts` — wardrobe items, optimistic add/update/delete
- `store/useChatStore.ts` — sessions, messages, streaming state, `pendingOutfits`

When a chat response arrives, the text is simulated-streamed word-by-word (`appendStreamChunk`), then `finalizeStreamingMessage()` assembles the final `ChatMessageDTO` with `metadata.outfits`. On session reload (`loadSession`), raw stored messages must be remapped: `role: "assistant"` → `"ASSISTANT"` and top-level `outfits` array → `metadata.outfits`.

### Stored vs DTO shape mismatch

Stored messages (`StoredChatMessage`) use lowercase roles (`"user"/"assistant"`) and a top-level `outfits` field. The frontend DTOs (`ChatMessageDTO`) use uppercase roles (`"USER"/"ASSISTANT"`) and `metadata.outfits`. The remapping happens in `loadSession` inside `ChatClient.tsx`.

### Path alias

`@/` resolves to the project root. All imports use `@/lib`, `@/components`, `@/store`, etc.

### Tailwind design tokens

Dark theme with gold accents. Key custom tokens:
- `brand-*` — gold palette (brand-500 is the primary CTA color)
- `surface-1` through `surface-4` — dark grey scale (#1a1a1a → #383838)
- Custom animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`, `animate-shimmer`
- Glass effect utility: `glass` class (defined in `globals.css`)

/**
 * Google Gemini integration.
 *
 * Two responsibilities:
 *   1. analyzeClothingImage() — vision analysis called ONCE per upload.
 *      Result is cached permanently in the clothing item JSON.
 *      Uses JSON response mode so output is always valid.
 *
 *   2. chatWithAria() — conversational AI for the chat page.
 *      Called ONCE per user message.
 *      Outfit recommendations are computed locally (zero API calls)
 *      and injected into the prompt as context.
 */
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// Safety settings — relax defaults so fashion content isn't over-blocked
const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ── 1. VISION ANALYSIS ────────────────────────────────────────────────────────

export interface ClothingAnalysis {
  name:        string;
  category:    "TOP" | "BOTTOM" | "FOOTWEAR" | "ACCESSORY" | "OUTERWEAR" | "DRESS" | "SUIT";
  style:       "CASUAL" | "FORMAL" | "SMART_CASUAL" | "SPORTY" | "STREETWEAR" | "BOHEMIAN" | "MINIMALIST" | "VINTAGE";
  colors:      string[];
  tags:        string[];
  season:      "SPRING" | "SUMMER" | "AUTUMN" | "WINTER" | "ALL_SEASON";
  occasion:    string[];
  material:    string | null;
  pattern:     string | null;
  description: string;
}

const VISION_PROMPT = `You are a fashion expert AI. Analyse the clothing item in this image.
Return ONLY valid JSON matching this exact structure — no extra text, no markdown:

{
  "name": "short descriptive name, 3-6 words",
  "category": "one of: TOP, BOTTOM, FOOTWEAR, ACCESSORY, OUTERWEAR, DRESS, SUIT",
  "style": "one of: CASUAL, FORMAL, SMART_CASUAL, SPORTY, STREETWEAR, BOHEMIAN, MINIMALIST, VINTAGE",
  "colors": ["primary color", "secondary color if present"],
  "tags": ["up to 8 descriptive tags like slim-fit, cotton, button-down"],
  "season": "one of: SPRING, SUMMER, AUTUMN, WINTER, ALL_SEASON",
  "occasion": ["1 to 4 from: casual, formal, work, dinner, party, sport, beach, wedding, date"],
  "material": "fabric material or null",
  "pattern": "solid, striped, checked, floral, etc. or null",
  "description": "one sentence describing the item and how to style it"
}

Be specific about colors: say 'navy blue' not just 'blue'. If category is DRESS or SUIT, set occasion accordingly.`;

/**
 * Analyse 1–4 clothing images in a SINGLE Gemini call.
 * Pass base64 strings (no data URI prefix). Returns one result per image, in order.
 */
export async function analyzeClothingImages(base64Array: string[]): Promise<ClothingAnalysis[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" },
    safetySettings: SAFETY,
  });

  const imageParts = base64Array.map((data) => ({
    inlineData: { mimeType: "image/jpeg" as const, data },
  }));

  const prompt = `You are a fashion expert AI. Analyse each of the ${base64Array.length} clothing item(s) shown (one per image, in order).

Return ONLY a valid JSON array with exactly ${base64Array.length} object(s) — no extra text, no markdown.
Each object must match this structure exactly:
${VISION_PROMPT.slice(VISION_PROMPT.indexOf("{"), VISION_PROMPT.lastIndexOf("}") + 1)}

The response MUST start with '[' and end with ']'.`;

  const result = await model.generateContent([...imageParts, prompt]);
  const text   = result.response.text();
  return JSON.parse(text) as ClothingAnalysis[];
}

// ── 2. CHAT ───────────────────────────────────────────────────────────────────

export interface OutfitSuggestion {
  name:        string;
  explanation: string;
  score:       number;
  top:         ItemRef | null;
  bottom:      ItemRef | null;
  footwear:    ItemRef | null;
  accessory?:  ItemRef | null;
}

export interface ItemRef {
  id:          string;
  name:        string;
  thumbnailUrl: string | null;
  colors:      string[];
  category:    string;
}

export interface ChatHistoryItem {
  role:  "user" | "model";
  parts: [{ text: string }];
}

export interface OutfitContext {
  label:              string;   // e.g. "Day 1 — Haldi Ceremony"
  count:              number;   // outfits for this context (almost always 1)
  occasion:           string;   // occasion keyword passed to generateOutfits()
  precomputedIndex:   number;   // which pre-computed outfit to show (-1 = generate a new one)
}

export interface AriaResponse {
  reply:                string;           // natural language response shown to the user
  needsOutfits:         boolean;          // true when the user wants outfit suggestions
  occasion:             string | null;
  preferredColors:      string[];
  excludedColors:       string[];         // colors the user wants to avoid (semantically expanded)
  preferredOutfitIndex: number;           // 0-based index of Aria's top pick (simple flow only)
  requestedCount:       number;           // how many outfits the user wants (1–10, default 1)
  outfitContexts:       OutfitContext[];  // non-empty for multi-occasion trip planning
}

export interface UserProfile {
  skinTone?: string | null;
  gender?:   string | null;
  city?:     string | null;
}

export interface WeatherContext {
  temp:      number;
  condition: string;
  city:      string;
}

/**
 * Send a user message to Gemini and get Aria's response.
 *
 * @param userMessage       — the user's text
 * @param history           — last N message pairs (kept short to save tokens)
 * @param wardrobeSummary   — a one-line summary of the user's wardrobe
 * @param outfits           — pre-computed outfit suggestions (from rule-based engine, zero API calls)
 * @param context           — current chat context (occasion, excluded items, etc.)
 * @param userProfile       — optional user profile (skin tone, gender, city)
 * @param weather           — optional current weather data
 */
export async function chatWithAria(
  userMessage:     string,
  history:         ChatHistoryItem[],
  wardrobeSummary: string,
  outfits:         OutfitSuggestion[],
  context:         { lastOccasion?: string; excludedItemIds?: string[]; preferredColors?: string[]; excludedColors?: string[] },
  userProfile?:    UserProfile,
  weather?:        WeatherContext
): Promise<AriaResponse> {
  // JSON mode so Gemini always returns a structured, parseable response.
  // systemInstruction must be passed to getGenerativeModel, not startChat.
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" },
    safetySettings: SAFETY,
    systemInstruction: buildSystemInstruction(wardrobeSummary, {
      lastOccasion:    context.lastOccasion,
      preferredColors: context.preferredColors,
      excludedColors:  context.excludedColors,
    }, userProfile, weather),
  });

  // Inject pre-computed outfit context so Gemini understands what's in the wardrobe.
  // For simple requests: Gemini can reference them by name in the reply.
  // For itinerary/multi-day requests: Gemini uses them as wardrobe inventory context
  // when generating outfitContexts — it does NOT need to map them 1-to-1.
  let augmentedMessage = userMessage;
  if (outfits.length > 0) {
    const hasPartial = outfits.some((o) => !o.top || !o.bottom);
    const outfitLines = outfits.map((o, i) =>
      `Outfit ${i + 1} — "${o.name}": ${o.explanation}` +
      ` (${[o.top, o.bottom, o.footwear].filter(Boolean).map((item) => item!.name).join(", ")})`
    ).join("\n");

    const partialNote = hasPartial
      ? `NOTE: These are PARTIAL outfit suggestions — the wardrobe is currently missing some ` +
        `categories (e.g. tops exist but no bottoms, or vice versa). ` +
        `The carousel will show these individual items. In your reply, name the shown item, ` +
        `acknowledge it is a great starting point for the occasion, and warmly encourage ` +
        `uploading the missing piece to complete the look. Still set needsOutfits:true.\n`
      : ``;

    augmentedMessage =
      userMessage +
      `\n\n[SYSTEM CONTEXT — DO NOT MENTION TO USER]\n` +
      partialNote +
      `Available outfit combinations pre-computed from this wardrobe:\n` +
      outfitLines + `\n` +
      `For simple requests: reference these by name in your reply and set needsOutfits:true.\n` +
      `For multi-day itineraries: use these to understand what's available, then generate a ` +
      `complete outfitContexts array covering EVERY activity slot across ALL days mentioned. ` +
      `Do not stop after the first day. One outfitContext entry per activity slot.`;
  }

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(augmentedMessage);
  const raw    = result.response.text();

  try {
    const parsed = JSON.parse(raw) as AriaResponse;
    return {
      reply:                parsed.reply                ?? "I'm here to help with your wardrobe!",
      needsOutfits:         parsed.needsOutfits         ?? false,
      occasion:             parsed.occasion             ?? null,
      preferredColors:      parsed.preferredColors      ?? [],
      excludedColors:       parsed.excludedColors       ?? [],
      preferredOutfitIndex: parsed.preferredOutfitIndex ?? 0,
      requestedCount:       Math.min(10, Math.max(1, parsed.requestedCount ?? 1)),
      outfitContexts:       Array.isArray(parsed.outfitContexts)
        ? parsed.outfitContexts.map((c: OutfitContext) => ({ ...c, precomputedIndex: c.precomputedIndex ?? -1 }))
        : [],
    };
  } catch {
    return {
      reply: raw, needsOutfits: false, occasion: null,
      preferredColors: [], excludedColors: [], preferredOutfitIndex: 0,
      requestedCount: 1, outfitContexts: [],
    };
  }
}

function buildSystemInstruction(
  wardrobeSummary: string,
  context: { lastOccasion?: string; preferredColors?: string[]; excludedColors?: string[] },
  userProfile?: UserProfile,
  weather?: WeatherContext
): string {
  const occasionNote    = context.lastOccasion
    ? `The user was last asking about: ${context.lastOccasion} outfits.`
    : "";
  const colorPrefNote   = context.preferredColors?.length
    ? `The user prefers these colors: ${context.preferredColors.join(", ")}.`
    : "";
  const colorExcludeNote = context.excludedColors?.length
    ? `The user wants to AVOID these colors: ${context.excludedColors.join(", ")}.`
    : "";

  const skinToneNote = userProfile?.skinTone
    ? `The user has a ${userProfile.skinTone.toLowerCase()} skin tone — favour colours that complement it (avoid washing out the user's complexion).`
    : "";
  const genderNote = userProfile?.gender && userProfile.gender !== "PREFER_NOT"
    ? `The user identifies as ${userProfile.gender.toLowerCase()}.`
    : "";
  const weatherNote = weather
    ? `Current weather in ${weather.city}: ${weather.temp}°C, ${weather.condition}. Recommend outfits appropriate for this temperature — ` +
      (weather.temp < 10 ? "suggest warm layers and heavier fabrics." :
       weather.temp > 28 ? "suggest light, breathable fabrics." :
       "comfortable transitional pieces are ideal.")
    : "";

  return `You are Aria, a friendly personal stylist AI for Wardrobe AI.
Help users build outfits from their wardrobe. Keep responses concise (2-4 sentences), warm, and practical.

WARDROBE SUMMARY: ${wardrobeSummary}
${occasionNote}
${colorPrefNote}
${colorExcludeNote}
${skinToneNote}
${genderNote}
${weatherNote}

IMPORTANT — You MUST always respond with valid JSON matching this exact structure:
{
  "reply": "your natural language response to the user (2-4 sentences max)",
  "needsOutfits": true or false,
  "occasion": "extracted occasion keyword like dinner/work/casual/wedding/traditional or null",
  "preferredColors": ["colors the user explicitly likes this message, or []"],
  "excludedColors": ["colors the user wants to avoid — expand semantically. Examples: 'dark colors' → ['black','navy','charcoal','dark grey','burgundy','dark brown'], 'bright colors' → ['red','orange','yellow','hot pink','lime green'], 'no white' → ['white','off-white','cream','ivory'], 'nothing red' → ['red','crimson','scarlet','maroon','burgundy']. Return [] if no exclusions mentioned."],
  "preferredOutfitIndex": 0,
  "requestedCount": 1,
  "outfitContexts": []
}

requestedCount: How many outfits the user wants.
  "5 days" → 5 | "show me 3 outfits" → 3 | "plan a week" → 7 | "what should I wear" → 1
  Clamp to 1–10. Default 1.

outfitContexts: Use for ANY request with multiple distinct occasions, a multi-day itinerary, or a trip plan.
  Each entry represents ONE activity slot:
  { "label": "Day N — Event", "count": 1, "occasion": "keyword", "precomputedIndex": N }
  count is almost always 1. Only set count > 1 if user explicitly asks for multiple options per slot.
  sum(all counts) must equal requestedCount.

  LABEL FORMAT: "Day N — Activity Name" for itineraries. Examples:
    "Day 1 — Haldi Ceremony", "Day 1 — Casual Dinner", "Day 2 — City Sightseeing",
    "Day 2 — Hotel Night", "Day 3 — Travel Day"

  OCCASION KEYWORDS to use (choose the most specific one):
    Traditional/ceremonies: sangeet, haldi, mehndi, wedding, reception, baraat, garba, pooja
    Formal: formal dinner, gala, cocktail party
    Casual: casual, sightseeing, shopping, brunch, relaxed
    Lounge/sleep: casual lounge, comfortable home, sleepwear
    Travel: casual travel
    Work/meetings: work, business
    Party/night out: party, night out, club

  precomputedIndex: CRITICAL — Set this to the 0-based index of the pre-computed outfit from the
  SYSTEM CONTEXT section that best matches this activity slot. This is the EXACT outfit that will
  appear in the carousel card, so your reply MUST reference the items from that outfit.
  Rules:
  - Assign each pre-computed index to at most ONE slot (no duplicates)
  - Pick the best match by occasion and style (e.g. traditional for haldi, casual for sightseeing)
  - If you have more slots than pre-computed outfits, use -1 for the extra slots (a new outfit will be generated)
  - When writing your reply, only mention items that appear in the outfit you assigned to that slot

  ITINERARY PARSING EXAMPLE:
  User: "Day 1: haldi, casual dinner. Day 2: city sightseeing, hotel night. Day 3: travel home."
  With 5 pre-computed outfits available (indices 0-4):
  → outfitContexts: [
      { "label": "Day 1 — Haldi Ceremony",   "count": 1, "occasion": "haldi",          "precomputedIndex": 2 },
      { "label": "Day 1 — Casual Dinner",    "count": 1, "occasion": "casual dinner",   "precomputedIndex": 0 },
      { "label": "Day 2 — City Sightseeing", "count": 1, "occasion": "casual",          "precomputedIndex": 1 },
      { "label": "Day 2 — Hotel Night",      "count": 1, "occasion": "casual lounge",   "precomputedIndex": 3 },
      { "label": "Day 3 — Travel Day",       "count": 1, "occasion": "casual travel",   "precomputedIndex": 4 }
    ]
  → requestedCount: 5

  For simple single-occasion requests (e.g. "what to wear for dinner?") → outfitContexts MUST be [].
  When outfitContexts is non-empty, set preferredOutfitIndex to 0.

  ⚠️ COMPLETENESS RULE: When a multi-day itinerary is provided, you MUST produce one outfitContext
  entry for EVERY activity mentioned across EVERY day — all in this single response.
  Never stop after Day 1. Never omit any slot. 3 days with 5 activities = 5 outfitContext entries.

preferredOutfitIndex: 0-based index of your top pick from the injected outfit context (simple flow only). Default 0.

Set needsOutfits to TRUE when the user is asking what to wear, requesting outfit suggestions, describing an event/occasion, sharing a trip itinerary, or asking you to style them.
Set needsOutfits to FALSE for general fashion questions, compliments, small talk, wardrobe management questions, etc.

LUGGAGE / PACKING CONSTRAINTS:
When the user mentions a weight or luggage limit, acknowledge it in your reply and reassure them
that the plan shares key pieces across looks (e.g. same jeans or shoes across multiple days).
Example reply: "Since you're packing to 7kg, I've planned outfits that share versatile pieces —
one pair of pants does double duty across different looks!"

RULES:
- Never mention JSON, technical terms, embeddings, or rule-based algorithms in your reply.
- For itinerary planning: give a warm 3-5 sentence overview of the full plan, do NOT list every outfit.
- For simple requests: reference the pre-computed outfit names naturally in your reply.
- If the wardrobe is empty, encourage uploading more items (needsOutfits: false).
- Partial outfit cards: If the SYSTEM CONTEXT NOTE says outfits are partial (missing tops or bottoms), name the item shown in the card, describe how it fits the occasion, and encourage adding the missing category — but keep the tone warm and helpful, not critical. Set needsOutfits: true.
- You know about color theory, occasion dressing, traditional Indian ceremonies, and style compatibility.`;
}

/**
 * Pure rule-based outfit recommendation engine.
 * Zero AI API calls — all logic runs locally.
 *
 * Scoring factors (total normalised to 0–1):
 *   1. Occasion match      — heavy weight, includes traditional/ethnic
 *   2. Occasion-style fit  — bonus for styles that suit the occasion
 *   3. Color compatibility — complementary / neutral palette
 *   4. Style coherence     — top × bottom style matrix
 *   5. Time-of-day fit     — evening → darker/formal, morning → lighter
 *   6. Season match        — soft filter
 *   7. Color preference    — user-stated preference bonus
 */
import { StoredClothingItem } from "@/lib/storage/fileStore";
import { OutfitSuggestion, ItemRef } from "@/lib/ai/gemini";

// ── Color compatibility ───────────────────────────────────────────────────────

const NEUTRALS = new Set([
  "white", "black", "grey", "gray", "beige", "cream", "navy",
  "khaki", "nude", "off-white", "ivory", "charcoal",
]);

const COMPLEMENTS: Record<string, string[]> = {
  navy:      ["white", "grey", "beige", "camel", "burgundy", "light blue", "gold"],
  white:     ["navy", "black", "grey", "camel", "olive", "any"],
  black:     ["white", "grey", "camel", "burgundy", "olive", "gold", "any"],
  grey:      ["navy", "white", "black", "burgundy", "camel", "pink"],
  camel:     ["navy", "black", "white", "burgundy", "brown"],
  burgundy:  ["navy", "grey", "camel", "white", "gold"],
  olive:     ["white", "black", "camel", "khaki", "brown"],
  blue:      ["white", "grey", "camel", "brown", "navy"],
  brown:     ["beige", "white", "camel", "olive", "cream"],
  green:     ["white", "beige", "camel", "brown", "navy", "gold"],
  red:       ["white", "black", "navy", "grey", "gold"],
  gold:      ["black", "white", "navy", "burgundy", "green", "maroon"],
  maroon:    ["gold", "beige", "white", "black", "navy"],
  pink:      ["white", "grey", "navy", "camel"],
  orange:    ["white", "black", "navy", "brown"],
};

function colorsCompatible(a: string[], b: string[]): boolean {
  for (const ca of a) {
    const lower = ca.toLowerCase();
    if (NEUTRALS.has(lower)) return true;
    for (const cb of b) {
      const lowerB = cb.toLowerCase();
      if (NEUTRALS.has(lowerB)) return true;
      const matches = COMPLEMENTS[lower] ?? [];
      if (matches.includes("any")) return true;
      if (matches.some((m) => lowerB.includes(m) || m.includes(lowerB))) return true;
    }
  }
  return false;
}

// ── Style compatibility matrix ────────────────────────────────────────────────

const STYLE_COMPAT: Record<string, Record<string, number>> = {
  CASUAL:       { CASUAL: 1.0, SPORTY: 0.8, STREETWEAR: 0.7, SMART_CASUAL: 0.6, MINIMALIST: 0.7, BOHEMIAN: 0.5, VINTAGE: 0.5, FORMAL: 0.1 },
  FORMAL:       { FORMAL: 1.0, SMART_CASUAL: 0.5, MINIMALIST: 0.6, CASUAL: 0.1, SPORTY: 0.0, STREETWEAR: 0.0, BOHEMIAN: 0.1, VINTAGE: 0.2 },
  SMART_CASUAL: { SMART_CASUAL: 1.0, CASUAL: 0.7, FORMAL: 0.5, MINIMALIST: 0.8, VINTAGE: 0.5, BOHEMIAN: 0.4, SPORTY: 0.2, STREETWEAR: 0.3 },
  SPORTY:       { SPORTY: 1.0, CASUAL: 0.8, STREETWEAR: 0.7, SMART_CASUAL: 0.2, MINIMALIST: 0.4, BOHEMIAN: 0.1, VINTAGE: 0.1, FORMAL: 0.0 },
  STREETWEAR:   { STREETWEAR: 1.0, CASUAL: 0.7, SPORTY: 0.7, VINTAGE: 0.5, SMART_CASUAL: 0.3, MINIMALIST: 0.4, BOHEMIAN: 0.2, FORMAL: 0.0 },
  BOHEMIAN:     { BOHEMIAN: 1.0, CASUAL: 0.6, VINTAGE: 0.7, SMART_CASUAL: 0.4, MINIMALIST: 0.3, STREETWEAR: 0.2, SPORTY: 0.1, FORMAL: 0.0 },
  MINIMALIST:   { MINIMALIST: 1.0, SMART_CASUAL: 0.8, FORMAL: 0.6, CASUAL: 0.7, BOHEMIAN: 0.3, VINTAGE: 0.4, SPORTY: 0.4, STREETWEAR: 0.4 },
  VINTAGE:      { VINTAGE: 1.0, BOHEMIAN: 0.7, CASUAL: 0.6, STREETWEAR: 0.5, SMART_CASUAL: 0.5, MINIMALIST: 0.4, SPORTY: 0.1, FORMAL: 0.2 },
};

function styleScore(a: string, b: string): number {
  return STYLE_COMPAT[a]?.[b] ?? 0.5;
}

// ── Occasion classifier ───────────────────────────────────────────────────────

const OCCASION_MAP: Record<string, string[]> = {
  traditional: [
    // Generic
    "traditional", "ethnic", "cultural", "religious", "ceremony", "function",
    // Indian ceremonies
    "haldi", "mehndi", "sangeet", "reception", "pooja", "puja",
    "garba", "dandiya", "navratri", "durga", "diwali", "holi",
    "lohri", "onam", "karva", "baisakhi", "ganesh",
    // Weddings
    "wedding", "engagement", "bride", "groom", "baraat",
    // General
    "festival", "celebration",
  ],
  formal:  ["dinner", "gala", "interview", "presentation", "formal", "date night", "black tie"],
  work:    ["office", "meeting", "work", "business", "conference", "professional"],
  casual:  ["casual", "weekend", "home", "brunch", "shopping", "everyday", "relaxed"],
  sport:   ["gym", "sport", "workout", "run", "hiking", "fitness", "yoga", "exercise"],
  party:   ["party", "club", "night out", "bar", "dancing", "event"],
  beach:   ["beach", "pool", "vacation", "holiday", "summer trip"],
  date:    ["date", "romantic", "dinner date", "first date"],
};

export function classifyOccasion(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [occ, keywords] of Object.entries(OCCASION_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) found.push(occ);
  }
  return found.length ? found : ["casual"];
}

// ── Per-occasion style preferences ───────────────────────────────────────────
// Styles that FIT this occasion well — used for bonus scoring.

const OCCASION_STYLE_PREF: Record<string, string[]> = {
  traditional: ["BOHEMIAN", "VINTAGE", "FORMAL"],
  formal:      ["FORMAL", "MINIMALIST", "SMART_CASUAL"],
  work:        ["FORMAL", "SMART_CASUAL", "MINIMALIST"],
  party:       ["STREETWEAR", "CASUAL", "VINTAGE", "SMART_CASUAL"],
  sport:       ["SPORTY", "CASUAL"],
  casual:      ["CASUAL", "SMART_CASUAL", "MINIMALIST", "STREETWEAR", "BOHEMIAN"],
  beach:       ["CASUAL", "BOHEMIAN", "SPORTY"],
  date:        ["SMART_CASUAL", "FORMAL", "MINIMALIST"],
};

// Styles that CLASH with this occasion — penalised.
const OCCASION_STYLE_CLASH: Record<string, string[]> = {
  traditional: ["SPORTY", "STREETWEAR"],
  formal:      ["SPORTY", "STREETWEAR", "BOHEMIAN"],
  work:        ["SPORTY", "STREETWEAR", "BOHEMIAN"],
  sport:       ["FORMAL"],
};

// ── Time-of-day detector ──────────────────────────────────────────────────────

type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | null;

function detectTimeOfDay(text: string): TimeOfDay {
  const t = text.toLowerCase();
  if (/\b(morning|breakfast|brunch|am\b|\d+\s*am)\b/.test(t))  return "morning";
  if (/\b(afternoon|lunch|noon|midday)\b/.test(t))               return "afternoon";
  if (/\b(evening|dinner|sunset|\d+\s*pm|dusk|tonight)\b/.test(t)) return "evening";
  if (/\b(night|midnight|club|late night|after party)\b/.test(t))  return "night";
  return null;
}

// Colors favoured by time of day
const TIME_COLORS: Record<string, string[]> = {
  morning:   ["white", "cream", "beige", "light blue", "pink", "lavender"],
  afternoon: ["beige", "camel", "olive", "blue", "white"],
  evening:   ["navy", "black", "burgundy", "gold", "maroon", "emerald"],
  night:     ["black", "navy", "burgundy", "gold", "deep red"],
};

function timeColorBonus(colors: string[], time: TimeOfDay): number {
  if (!time) return 0;
  const preferred = TIME_COLORS[time] ?? [];
  return colors.some((c) =>
    preferred.some((p) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()))
  ) ? 0.08 : 0;
}

// ── Traditional clothing detector ────────────────────────────────────────────
// Items with these words in name or tags get a large bonus for traditional occasions,
// regardless of what `occasion` tags the AI assigned at upload time.

const TRADITIONAL_CLOTHING_TAGS = new Set([
  "kurta", "kurti", "saree", "sari", "salwar", "kameez", "lehenga",
  "sherwani", "dhoti", "dupatta", "anarkali", "churidar", "pajama",
  "pathani", "bandhgala", "indo-western", "ethnic", "chikankari",
  "bandhani", "block print", "embroidery", "zari", "mirror work",
  "traditional", "cultural", "festive", "handloom", "silk",
]);

function hasTraditionalClothing(item: StoredClothingItem): boolean {
  const searchText = [item.name, ...(item.tags ?? [])].join(" ").toLowerCase();
  return Array.from(TRADITIONAL_CLOTHING_TAGS).some((t) => searchText.includes(t));
}

// ── Ceremony-specific color preferences ──────────────────────────────────────
// When a specific ceremony keyword appears in the user's message, items with
// matching colors get a large bonus to float to the top of recommendations.

const CEREMONY_COLOR_PREF: Record<string, string[]> = {
  haldi:      ["yellow", "orange", "saffron", "turmeric", "golden", "mustard", "gold"],
  mehndi:     ["green", "orange", "yellow", "lime"],
  sangeet:    ["pink", "yellow", "orange", "magenta", "hot pink", "coral"],
  wedding:    ["red", "maroon", "gold", "pink", "magenta", "crimson"],
  reception:  ["gold", "silver", "black", "navy", "royal blue"],
  garba:      ["orange", "red", "yellow", "pink", "multicolor"],
  dandiya:    ["orange", "red", "yellow", "pink", "multicolor"],
  navratri:   ["yellow", "green", "red", "pink", "orange", "white", "blue"],
  diwali:     ["gold", "maroon", "red", "orange", "yellow"],
  holi:       ["white"],
};

function ceremonyColorBonus(item: StoredClothingItem, userText: string): number {
  const lower = userText.toLowerCase();
  for (const [ceremony, colors] of Object.entries(CEREMONY_COLOR_PREF)) {
    if (lower.includes(ceremony)) {
      const itemColors = item.colors.map((c) => c.toLowerCase());
      const match = itemColors.some((ic) =>
        colors.some((p) => ic.includes(p) || p.includes(ic))
      );
      if (match) return 0.40;
    }
  }
  return 0;
}

// ── Skin-tone color compatibility ─────────────────────────────────────────────
// Colors known to complement each skin tone. A partial match gives a small bonus.

const SKIN_TONE_COLORS: Record<string, string[]> = {
  FAIR:   ["navy", "burgundy", "emerald", "forest green", "cobalt", "ruby", "jewel", "deep purple", "sapphire", "wine"],
  LIGHT:  ["pastel", "lavender", "blush", "mint", "sky blue", "rose", "peach", "soft pink", "powder blue", "coral"],
  MEDIUM: ["camel", "rust", "terracotta", "olive", "teal", "warm orange", "mustard", "earth", "warm brown", "copper"],
  OLIVE:  ["burgundy", "forest green", "rust", "warm orange", "olive", "earth brown", "wine", "burnt sienna", "warm red"],
  TAN:    ["warm red", "orange", "yellow", "olive", "warm green", "copper", "caramel", "coral", "golden", "saffron"],
  DARK:   ["cobalt blue", "white", "lime", "hot pink", "magenta", "bright red", "royal blue", "vivid", "electric blue", "cream"],
};

function skinToneBonus(colors: string[], skinTone: string): number {
  const preferred = SKIN_TONE_COLORS[skinTone.toUpperCase()] ?? [];
  if (!preferred.length) return 0;
  const match = colors.some((c) =>
    preferred.some((p) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()))
  );
  return match ? 0.10 : 0;
}

// ── Outfit freshness ──────────────────────────────────────────────────────────
// Penalise combinations the user recently wore so they get variety.

function freshnessPenalty(itemIds: string[], recentlyWorn: Map<string, number>): number {
  const fingerprint = [...itemIds].sort().join("|");
  const daysAgo = recentlyWorn.get(fingerprint);
  if (daysAgo === undefined) return 0;
  if (daysAgo <= 3)  return -0.80;
  if (daysAgo <= 7)  return -0.50;
  if (daysAgo <= 14) return -0.20;
  return 0;
}

// ── Weather-based scoring ─────────────────────────────────────────────────────

const HEAVY_MATERIALS = ["wool", "fleece", "leather", "denim", "cashmere", "thick", "knit", "tweed"];
const LIGHT_MATERIALS = ["linen", "chiffon", "silk", "voile", "gauze", "light cotton"];

function weatherBonus(item: StoredClothingItem, temp: number): number {
  const mat = (item.material ?? "").toLowerCase();
  if (temp < 10) {
    if (HEAVY_MATERIALS.some((m) => mat.includes(m))) return  0.10;
    if (item.season === "SUMMER")                      return -0.20;
    if (LIGHT_MATERIALS.some((m) => mat.includes(m))) return -0.10;
    return 0;
  }
  if (temp > 28) {
    if (LIGHT_MATERIALS.some((m) => mat.includes(m))) return  0.10;
    if (item.season === "WINTER")                      return -0.15;
    if (HEAVY_MATERIALS.some((m) => mat.includes(m))) return -0.10;
    return 0;
  }
  return 0;
}

// ── Season helper ─────────────────────────────────────────────────────────────

function currentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5)  return "SPRING";
  if (m >= 6 && m <= 8)  return "SUMMER";
  if (m >= 9 && m <= 11) return "AUTUMN";
  return "WINTER";
}

// ── Outfit name + explanation ─────────────────────────────────────────────────

function buildOutfitName(occasion: string, style: string, colors: string[]): string {
  const occasionLabel: Record<string, string> = {
    traditional: "Traditional", formal: "Formal", work: "Work",
    casual: "Casual", sport: "Sport", party: "Party",
    beach: "Beach", date: "Date Night",
  };
  const styleLabel: Record<string, string> = {
    CASUAL: "Casual", FORMAL: "Formal", SMART_CASUAL: "Smart Casual",
    SPORTY: "Sporty", STREETWEAR: "Street", BOHEMIAN: "Boho",
    MINIMALIST: "Minimal", VINTAGE: "Vintage",
  };
  const col = colors[0]
    ? colors[0].charAt(0).toUpperCase() + colors[0].slice(1) + " "
    : "";
  const occ = occasionLabel[occasion] ?? occasion.charAt(0).toUpperCase() + occasion.slice(1);
  const sty = styleLabel[style] ?? style;
  return `${col}${occ} — ${sty} Look`;
}

function buildExplanation(
  top:     StoredClothingItem | null,
  bottom:  StoredClothingItem | null,
  shoes:   StoredClothingItem | null,
  occasion: string,
  time:    TimeOfDay
): string {
  const parts: string[] = [];
  if (top)    parts.push(top.name);
  if (bottom) parts.push(bottom.name);
  if (shoes)  parts.push(shoes.name);

  const occLabel  = occasion.charAt(0).toUpperCase() + occasion.slice(1);
  const timeLabel = time ? ` for the ${time}` : "";
  return `${parts.join(", ")} — a well-matched ${occLabel} combination${timeLabel}, chosen for color harmony and style compatibility.`;
}

// ── Main engine ───────────────────────────────────────────────────────────────

export interface RecommendationRequest {
  wardrobe:             StoredClothingItem[];
  occasion:             string;
  excludeItemIds?:      string[];
  preferColors?:        string[];
  excludeColors?:       string[];
  maxResults?:          number;
  skinTone?:            string;              // e.g. "FAIR", "MEDIUM", "DARK"
  recentlyWorn?:        Map<string, number>; // fingerprint → daysAgo
  weatherTemp?:         number;              // celsius, undefined = ignore
}

export function generateOutfits(req: RecommendationRequest): OutfitSuggestion[] {
  const {
    wardrobe,
    occasion,
    excludeItemIds = [],
    preferColors   = [],
    excludeColors  = [],
    maxResults     = 2,
    skinTone,
    recentlyWorn   = new Map(),
    weatherTemp,
  } = req;

  const occasions = classifyOccasion(occasion);
  const time      = detectTimeOfDay(occasion);
  const season    = currentSeason();

  // ── Color exclusion setup ────────────────────────────────────────────────────
  const basePool             = wardrobe.filter((i) => !excludeItemIds.includes(i.id));
  const excludeColorsLower   = excludeColors.map((c) => c.toLowerCase());

  function itemHasExcludedColor(item: StoredClothingItem): boolean {
    if (!excludeColorsLower.length) return false;
    return item.colors.some((c) =>
      excludeColorsLower.some((ex) =>
        c.toLowerCase().includes(ex) || ex.includes(c.toLowerCase())
      )
    );
  }

  // Hard-filter first; fall back to soft penalty if pool shrinks below 3
  const hardFiltered   = basePool.filter((i) => !itemHasExcludedColor(i));
  const useSoftPenalty = hardFiltered.length < 3 && basePool.length >= 1;
  const pool           = useSoftPenalty ? basePool : hardFiltered;

  function colorExclusionPenalty(item: StoredClothingItem): number {
    if (!useSoftPenalty) return 0;
    return itemHasExcludedColor(item) ? -0.30 : 0;
  }

  // Season filter (soft — fall back to full pool if not enough)
  const seasonPool = pool.filter(
    (i) => i.season === "ALL_SEASON" || i.season === season
  );
  const items = seasonPool.length >= 3 ? seasonPool : pool;

  // Bucket by category
  const tops     = items.filter((i) => i.category === "TOP");
  const bottoms  = items.filter((i) => i.category === "BOTTOM");
  const footwear = items.filter((i) => i.category === "FOOTWEAR");
  const dresses  = items.filter((i) => i.category === "DRESS" || i.category === "SUIT");

  const scored: Array<{
    top:           StoredClothingItem | null;
    bottom:        StoredClothingItem | null;
    shoes:         StoredClothingItem | null;
    score:         number;
    primaryStyle:  string;
    primaryColors: string[];
  }> = [];

  const isTraditional = occasions.includes("traditional");

  // Helper: compute occasion + style score for a single item
  function itemOccScore(item: StoredClothingItem): number {
    const itemOcc  = item.occasion ?? [];
    const occMatch = occasions.some((o) => itemOcc.includes(o));

    const preferred = occasions.flatMap((o) => OCCASION_STYLE_PREF[o]  ?? []);
    const clashing  = occasions.flatMap((o) => OCCASION_STYLE_CLASH[o] ?? []);

    const styleBonus  = preferred.includes(item.style) ?  0.15 : 0;
    const styleClash  = clashing.includes(item.style)  ? -0.25 : 0;
    const occBonus    = occMatch ? 0.35 : 0;

    // Traditional clothing bonus: kurta/saree/etc. always win for traditional occasions
    const tradBonus = (isTraditional && hasTraditionalClothing(item)) ? 0.30 : 0;

    // Ceremony-specific color bonus (e.g. yellow for haldi)
    const ceremonyBonus = ceremonyColorBonus(item, occasion);

    return occBonus + styleBonus + styleClash + tradBonus + ceremonyBonus;
  }

  // ── Top + Bottom combinations ─────────────────────────────────────────────
  for (const top of tops) {
    for (const bottom of bottoms) {
      const colorOk  = colorsCompatible(top.colors, bottom.colors);
      const colorPts = colorOk ? 0.2 : 0.0;
      const stylePts = styleScore(top.style, bottom.style) * 0.2;

      // Occasion + style fit (heaviest weight)
      const topOccPts = itemOccScore(top);
      const botOccPts = itemOccScore(bottom);
      const occPts    = (topOccPts + botOccPts) / 2;

      // Color preference bonus
      const allColors = [...top.colors, ...bottom.colors];
      const prefPts = preferColors.some((c) =>
        allColors.some((tc) => tc.toLowerCase().includes(c.toLowerCase()))
      ) ? 0.05 : 0;

      // Skin tone bonus
      const skinPts = skinTone ? skinToneBonus(allColors, skinTone) : 0;

      // Time-of-day color bonus
      const timePts = timeColorBonus(allColors, time);

      // Weather bonus
      const wxPts = weatherTemp !== undefined
        ? (weatherBonus(top, weatherTemp) + weatherBonus(bottom, weatherTemp)) / 2
        : 0;

      // Best matching shoes
      const bestShoe = footwear
        .map((sh) => ({
          sh,
          pts:
            (colorsCompatible(bottom.colors, sh.colors) ? 0.1 : 0) +
            styleScore(bottom.style, sh.style) * 0.1 +
            itemOccScore(sh) * 0.05 +
            (weatherTemp !== undefined ? weatherBonus(sh, weatherTemp) * 0.05 : 0),
        }))
        .sort((a, b) => b.pts - a.pts)[0];

      const shPts = bestShoe?.pts ?? 0;

      // Freshness penalty — don't re-suggest what was recently worn
      const itemIds    = [top.id, bottom.id, bestShoe?.sh.id].filter(Boolean) as string[];
      const freshPts   = freshnessPenalty(itemIds, recentlyWorn);

      const total = Math.max(0, Math.min(1,
        colorPts + stylePts + occPts + prefPts + skinPts + timePts + wxPts + shPts + freshPts
        + colorExclusionPenalty(top) + colorExclusionPenalty(bottom)
      ));

      scored.push({
        top, bottom,
        shoes:         bestShoe?.sh ?? null,
        score:         total,
        primaryStyle:  top.style,
        primaryColors: [...new Set([...top.colors, ...bottom.colors])],
      });
    }
  }

  // ── Dress / Suit ──────────────────────────────────────────────────────────
  for (const dress of dresses) {
    const dressOcc = itemOccScore(dress);
    const timePts  = timeColorBonus(dress.colors, time);
    const skinPts  = skinTone ? skinToneBonus(dress.colors, skinTone) : 0;
    const wxPts    = weatherTemp !== undefined ? weatherBonus(dress, weatherTemp) : 0;

    const bestShoe = footwear
      .map((sh) => ({
        sh,
        pts: styleScore(dress.style, sh.style) * 0.2 +
             (colorsCompatible(dress.colors, sh.colors) ? 0.1 : 0) +
             itemOccScore(sh) * 0.05,
      }))
      .sort((a, b) => b.pts - a.pts)[0];

    const itemIds  = [dress.id, bestShoe?.sh.id].filter(Boolean) as string[];
    const freshPts = freshnessPenalty(itemIds, recentlyWorn);

    scored.push({
      top: null,
      bottom: dress,
      shoes:         bestShoe?.sh ?? null,
      score:         Math.max(0, Math.min(1,
        0.2 + dressOcc + timePts + skinPts + wxPts + (bestShoe?.pts ?? 0) + freshPts + colorExclusionPenalty(dress)
      )),
      primaryStyle:  dress.style,
      primaryColors: dress.colors,
    });
  }

  // Sort by score, deduplicate (same top+bottom key), take top N
  const seen = new Set<string>();
  const results = scored
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      const key = `${c.top?.id ?? "none"}-${c.bottom?.id ?? "none"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxResults);

  // ── Single-item fallback ──────────────────────────────────────────────────
  // When no complete TOP+BOTTOM/DRESS combos exist (e.g. wardrobe only has
  // tops uploaded so far), surface the best individual items as outfit starters
  // so the carousel is never empty when items do exist.
  if (results.length === 0 && (tops.length > 0 || bottoms.length > 0)) {
    const singles = [...tops, ...bottoms]
      .map((item) => ({
        item,
        score: Math.max(0, Math.min(1,
          0.15 + itemOccScore(item) + timeColorBonus(item.colors, time) + colorExclusionPenalty(item)
        )),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return singles.map(({ item, score }) => {
      const isTop   = item.category === "TOP";
      const bestShoe = footwear
        .map((sh) => ({ sh, pts: itemOccScore(sh) * 0.05 + timeColorBonus(sh.colors, time) }))
        .sort((a, b) => b.pts - a.pts)[0];
      return {
        name:        buildOutfitName(occasions[0], item.style, item.colors),
        explanation: buildExplanation(
          isTop ? item : null,
          isTop ? null : item,
          bestShoe?.sh ?? null,
          occasions[0],
          time
        ),
        score,
        top:      isTop ? toRef(item) : null,
        bottom:   isTop ? null        : toRef(item),
        footwear: bestShoe ? toRef(bestShoe.sh) : null,
      };
    });
  }

  return results.map((c) => ({
    name:        buildOutfitName(occasions[0], c.primaryStyle, c.primaryColors),
    explanation: buildExplanation(c.top, c.bottom, c.shoes, occasions[0], time),
    score:       Math.round(c.score * 100) / 100,
    top:         c.top    ? toRef(c.top)    : null,
    bottom:      c.bottom ? toRef(c.bottom) : null,
    footwear:    c.shoes  ? toRef(c.shoes)  : null,
  }));
}

function toRef(item: StoredClothingItem): ItemRef {
  return {
    id:           item.id,
    name:         item.name,
    thumbnailUrl: item.imageUrl,
    colors:       item.colors,
    category:     item.category,
  };
}

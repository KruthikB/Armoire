/**
 * GET  /api/chat/sessions/[id]/messages  — load message history
 * POST /api/chat/sessions/[id]/messages  — send message, get AI response
 *
 * API call budget per POST: exactly 1 Gemini call.
 *   - Outfit recommendations are computed locally (0 API calls)
 *   - Outfits are injected as context into the single Gemini call
 */
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth/session";
import {
  getChatSessions,
  getMessages,
  addMessage,
  updateChatSession,
  getWardrobe,
  addOutfit,
  getPreferences,
  getRecentlyWornOutfits,
  type ChatContext,
  type StoredChatMessage,
} from "@/lib/storage/fileStore";
import { generateOutfits } from "@/lib/ai/recommendations";
import { chatWithAria, type ChatHistoryItem, type OutfitSuggestion } from "@/lib/ai/gemini";
import { getWeatherForCity } from "@/lib/weather";

// ── Local helpers (0 API calls) ──────────────────────────────────────────────

/**
 * Detect a luggage/packing constraint in the message.
 * Only this one regex is kept — it's a clear, bounded signal with no false-positive risk.
 * All other intent (count, contexts, occasions) is handled by Gemini.
 */
function hasLuggageConstraint(text: string): boolean {
  return /\b\d+\s*(kg|kilo|kilogram|pound|lb)s?\b/i.test(text) ||
         /\bluggage\b/i.test(text) ||
         /\bpack(ing)?\s*(light|small|minimal)\b/i.test(text);
}

// ── GET: load history ─────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the session belongs to this user
  const sessions = await getChatSessions(user.id);
  const session  = sessions.find((s) => s.id === params.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await getMessages(user.id, params.id);
  return NextResponse.json({ data: messages });
}

// ── POST: send message ────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Verify session ownership
  const sessions   = await getChatSessions(user.id);
  const chatSession = sessions.find((s) => s.id === params.id);
  if (!chatSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sessionId = params.id;
  const context   = (chatSession.context ?? {}) as ChatContext;

  // Save user message
  const userMsg: StoredChatMessage = {
    id:        uuidv4(),
    sessionId,
    role:      "user",
    content:   message,
    createdAt: new Date().toISOString(),
  };
  await addMessage(user.id, userMsg);

  // ── Step 1: Pre-compute outfit candidates (0 API calls) ──────────────────────
  const [wardrobe, prefs, recentlyWornOutfits] = await Promise.all([
    getWardrobe(user.id),
    getPreferences(user.id).catch(() => null),
    getRecentlyWornOutfits(user.id, 14).catch(() => []),
  ]);

  // Build fingerprint → daysAgo map from recently worn outfits
  const recentlyWornMap = new Map<string, number>();
  for (const outfit of recentlyWornOutfits) {
    if (outfit.lastWorn) {
      const fp = outfit.items.map((i) => i.itemId).sort().join("|");
      const daysAgo = Math.floor((Date.now() - new Date(outfit.lastWorn).getTime()) / 86_400_000);
      recentlyWornMap.set(fp, Math.min(daysAgo, recentlyWornMap.get(fp) ?? Infinity));
    }
  }

  // Fetch weather for the user's city (best-effort — won't block request on failure)
  let weather = undefined;
  if (prefs?.city) {
    try { weather = (await getWeatherForCity(prefs.city)) ?? undefined; } catch { /* ignore */ }
  }

  const outfitCandidates: OutfitSuggestion[] = wardrobe.length >= 2
    ? generateOutfits({
        wardrobe,
        occasion:       message,
        excludeItemIds: context.excludedItemIds ?? [],
        preferColors:   context.preferredColors  ?? [],
        excludeColors:  context.excludedColors   ?? [],
        maxResults:     8,
        skinTone:       prefs?.skinTone ?? undefined,
        recentlyWorn:   recentlyWornMap,
        weatherTemp:    weather?.temp,
      })
    : [];

  // ── Step 2: Build wardrobe summary for Gemini system prompt ────────────────
  const byCat = wardrobe.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1;
    return acc;
  }, {});
  const wardrobeSummary = wardrobe.length === 0
    ? "Empty wardrobe — user has no items yet."
    : `${wardrobe.length} items: ${Object.entries(byCat).map(([k, v]) => `${v} ${k.toLowerCase()}(s)`).join(", ")}.`;

  // ── Step 3: Build short history for Gemini (last 8 messages = 4 exchanges) ──
  const allMessages = await getMessages(user.id, sessionId);
  const recentHistory: ChatHistoryItem[] = allMessages
    .slice(-8)
    .filter((m) => m.id !== userMsg.id)
    .map((m) => ({ role: (m.role === "assistant" ? "model" : m.role) as "user" | "model", parts: [{ text: m.content }] }));

  // ── Step 4: ONE Gemini call — Gemini decides intent + writes response ───────
  const userProfile = prefs
    ? { skinTone: prefs.skinTone, gender: prefs.gender, city: prefs.city }
    : undefined;

  let ariaResponse;
  try {
    ariaResponse = await chatWithAria(
      message, recentHistory, wardrobeSummary, outfitCandidates, context,
      userProfile ?? undefined,
      weather ?? undefined
    );
  } catch (err) {
    console.error("[Gemini chat error]", err);
    ariaResponse = {
      reply:                "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      needsOutfits:         false,
      occasion:             null,
      preferredColors:      [],
      excludedColors:       [],
      preferredOutfitIndex: 0,
      requestedCount:       1,
      outfitContexts:       [],
    };
  }

  // ── Step 5: Finalize and persist outfits ─────────────────────────────────────
  const outfits: OutfitSuggestion[] = [];

  if (ariaResponse.needsOutfits) {

    // 5a. Accumulate context from this turn
    if (ariaResponse.occasion) context.lastOccasion = ariaResponse.occasion;
    if (ariaResponse.preferredColors.length) {
      context.preferredColors = [...new Set([...(context.preferredColors ?? []), ...ariaResponse.preferredColors])];
    }
    if (ariaResponse.excludedColors.length) {
      context.excludedColors = [...new Set([...(context.excludedColors ?? []), ...ariaResponse.excludedColors])];
    }

    const isMultiContext = ariaResponse.outfitContexts.length > 0;

    if (isMultiContext) {
      // 5b-MULTI: Gemini assigns each context slot to a specific pre-computed outfit
      // (precomputedIndex). This guarantees the carousel shows exactly what Gemini referenced
      // in its reply. For slots with no valid index, the local engine fills in the gap.
      const packingLight         = hasLuggageConstraint(message);
      const usedPrecomputedIdxs  = new Set<number>();
      const usedItemIds: string[] = [...(context.excludedItemIds ?? [])];

      for (const ctx of ariaResponse.outfitContexts) {
        const idx = ctx.precomputedIndex ?? -1;
        const canUsePrecomputed = idx >= 0 && idx < outfitCandidates.length && !usedPrecomputedIdxs.has(idx);

        if (canUsePrecomputed) {
          // Use the exact pre-computed outfit Gemini referenced in its reply
          const o = { ...outfitCandidates[idx] };
          o.name = ctx.label;
          usedPrecomputedIdxs.add(idx);
          if (o.top?.id) usedItemIds.push(o.top.id);
          if (!packingLight && o.bottom?.id) usedItemIds.push(o.bottom.id);
          outfits.push(o);
        } else {
          // Fallback: generate a fresh outfit for this slot
          const ctxOutfits = generateOutfits({
            wardrobe,
            occasion:       ctx.occasion,
            excludeItemIds: usedItemIds,
            preferColors:   context.preferredColors ?? [],
            excludeColors:  context.excludedColors  ?? [],
            maxResults:     Math.min(10, Math.max(1, ctx.count)),
            skinTone:       prefs?.skinTone ?? undefined,
            recentlyWorn:   recentlyWornMap,
            weatherTemp:    weather?.temp,
          });
          ctxOutfits.forEach((o) => {
            o.name = ctx.label;
            if (o.top?.id) usedItemIds.push(o.top.id);
            if (!packingLight && o.bottom?.id) usedItemIds.push(o.bottom.id);
          });
          outfits.push(...ctxOutfits);
        }
      }

    } else {
      // 5b-SIMPLE: respect requestedCount; re-run locally if we need more than pre-computed
      const finalCount = Math.min(10, Math.max(1, ariaResponse.requestedCount ?? 1));
      let candidates   = outfitCandidates;

      if (finalCount > candidates.length && wardrobe.length >= 2) {
        candidates = generateOutfits({
          wardrobe,
          occasion:       ariaResponse.occasion ?? message,
          excludeItemIds: context.excludedItemIds ?? [],
          preferColors:   context.preferredColors ?? [],
          excludeColors:  context.excludedColors  ?? [],
          maxResults:     finalCount,
          skinTone:       prefs?.skinTone ?? undefined,
          recentlyWorn:   recentlyWornMap,
          weatherTemp:    weather?.temp,
        });
      }

      // Reorder so Gemini's top pick is first card in the carousel
      const preferredIdx = ariaResponse.preferredOutfitIndex ?? 0;
      const ordered = preferredIdx > 0 && preferredIdx < candidates.length
        ? [candidates[preferredIdx], ...candidates.filter((_, i) => i !== preferredIdx)]
        : candidates;

      outfits.push(...ordered.slice(0, finalCount));
    }

    // 5c. Minimum-1 guarantee: if nothing was produced, relax all filters
    if (outfits.length === 0 && wardrobe.length >= 1) {
      const fallback = generateOutfits({
        wardrobe,
        occasion:       ariaResponse.occasion ?? context.lastOccasion ?? "casual",
        excludeItemIds: [],
        preferColors:   [],
        excludeColors:  [],
        maxResults:     1,
      });
      outfits.push(...fallback);
    }

    // 5d. Persist each outfit to storage; assign the generated ID back onto the
    //     suggestion object so the carousel can use it for worn/like/dislike feedback.
    for (const s of outfits) {
      const id = uuidv4();
      (s as OutfitSuggestion & { id: string }).id = id;

      const outfit = {
        id,
        userId:        user.id,
        name:          s.name,
        description:   s.explanation,
        occasion:      context.lastOccasion ?? "casual",
        style:         s.top?.category === "DRESS" ? "FORMAL" : (wardrobe.find((i) => i.id === s.top?.id)?.style ?? "CASUAL"),
        score:         s.score,
        wearCount:     0,
        lastWorn:      null,
        isAiGenerated: true,
        items: [s.top, s.bottom, s.footwear, s.accessory]
          .filter(Boolean)
          .map((item) => ({
            role:         item!.category.toLowerCase(),
            itemId:       item!.id,
            itemName:     item!.name,
            thumbnailUrl: item!.thumbnailUrl,
            colors:       item!.colors,
            category:     item!.category,
          })),
        createdAt: new Date().toISOString(),
      };
      await addOutfit(outfit);
    }
  }

  // Save assistant message (store only the reply text, not the raw JSON)
  const assistantMsg: StoredChatMessage = {
    id:        uuidv4(),
    sessionId,
    role:      "assistant",
    content:   ariaResponse.reply,
    outfits:   outfits.length > 0 ? outfits : undefined,
    createdAt: new Date().toISOString(),
  };
  await addMessage(user.id, assistantMsg);

  // Update session context + auto-title on first message
  const isFirstMessage = allMessages.filter((m) => m.role === "user").length <= 1;
  await updateChatSession(user.id, sessionId, {
    context,
    ...(isFirstMessage && {
      title: message.length > 45 ? message.slice(0, 42) + "…" : message,
    }),
  });

  return NextResponse.json({
    data: {
      message: ariaResponse.reply,
      outfits,
      messageId: assistantMsg.id,
    },
  });
}

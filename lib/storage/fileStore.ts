import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

// ── USERS ─────────────────────────────────────────────────────────────────────

export interface StoredUser {
  id:           string;
  email:        string;
  name:         string;
  passwordHash: string;
  createdAt:    string;
}

function mapUser(u: { id: string; email: string; name: string; passwordHash: string; createdAt: Date }): StoredUser {
  return { ...u, createdAt: u.createdAt.toISOString() };
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? mapUser(u) : null;
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const u = await prisma.user.findUnique({ where: { email } });
  return u ? mapUser(u) : null;
}

export async function createUser(user: StoredUser): Promise<void> {
  await prisma.user.create({
    data: {
      id:           user.id,
      email:        user.email,
      name:         user.name,
      passwordHash: user.passwordHash,
      createdAt:    new Date(user.createdAt),
    },
  });
}

export async function updateUser(
  id: string,
  data: Partial<Pick<StoredUser, "name" | "email" | "passwordHash">>
): Promise<void> {
  await prisma.user.update({ where: { id }, data });
}

// ── CLOTHING ITEMS ────────────────────────────────────────────────────────────

export interface StoredClothingItem {
  id:          string;
  userId:      string;
  name:        string;
  imageUrl:    string;
  category:    string;
  style:       string;
  colors:      string[];
  tags:        string[];
  season:      string;
  occasion:    string[];
  material:    string | null;
  pattern:     string | null;
  brand:       string | null;
  description: string | null;
  notes:       string | null;
  isFavorite:  boolean;
  wearCount:   number;
  lastWorn:    string | null;
  createdAt:   string;
  updatedAt:   string;
}

type DbClothingItem = {
  id: string; userId: string; name: string; imageUrl: string;
  category: string; style: string; colors: string[]; tags: string[];
  season: string; occasion: string[]; material: string | null;
  pattern: string | null; brand: string | null; description: string | null;
  notes: string | null; isFavorite: boolean; wearCount: number;
  lastWorn: Date | null; createdAt: Date; updatedAt: Date;
};

function mapItem(i: DbClothingItem): StoredClothingItem {
  return {
    ...i,
    lastWorn:  i.lastWorn  ? i.lastWorn.toISOString()  : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export async function getWardrobe(userId: string): Promise<StoredClothingItem[]> {
  const items = await prisma.clothingItem.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
  });
  return items.map(mapItem);
}

export async function getClothingItemById(userId: string, id: string): Promise<StoredClothingItem | null> {
  const item = await prisma.clothingItem.findFirst({ where: { id, userId } });
  return item ? mapItem(item) : null;
}

export async function addClothingItem(item: StoredClothingItem): Promise<void> {
  await prisma.clothingItem.create({
    data: {
      id:          item.id,
      userId:      item.userId,
      name:        item.name,
      imageUrl:    item.imageUrl,
      category:    item.category,
      style:       item.style,
      colors:      item.colors,
      tags:        item.tags,
      season:      item.season,
      occasion:    item.occasion,
      material:    item.material,
      pattern:     item.pattern,
      brand:       item.brand,
      description: item.description,
      notes:       item.notes,
      isFavorite:  item.isFavorite,
      wearCount:   item.wearCount,
      lastWorn:    item.lastWorn ? new Date(item.lastWorn) : null,
      createdAt:   new Date(item.createdAt),
      updatedAt:   new Date(item.updatedAt),
    },
  });
}

export async function updateClothingItem(
  userId: string,
  id: string,
  updates: Partial<StoredClothingItem>
): Promise<StoredClothingItem | null> {
  const existing = await prisma.clothingItem.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Prisma.ClothingItemUpdateInput = { ...updates };
  if (updates.lastWorn !== undefined) {
    data.lastWorn = updates.lastWorn ? new Date(updates.lastWorn) : null;
  }

  const updated = await prisma.clothingItem.update({ where: { id }, data });
  return mapItem(updated);
}

export async function deleteClothingItem(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.clothingItem.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.clothingItem.delete({ where: { id } });
  return true;
}

// ── CHAT ──────────────────────────────────────────────────────────────────────

export interface ChatContext {
  lastOccasion?:    string;
  excludedItemIds?: string[];
  preferredColors?: string[];
  excludedColors?:  string[];
}

export interface StoredChatSession {
  id:        string;
  userId:    string;
  title:     string;
  context:   ChatContext;
  createdAt: string;
  updatedAt: string;
}

export interface StoredChatMessage {
  id:        string;
  sessionId: string;
  role:      "user" | "assistant";
  content:   string;
  outfits?:  unknown[];
  createdAt: string;
}

type DbChatSession = {
  id: string; userId: string; title: string; context: Prisma.JsonValue;
  createdAt: Date; updatedAt: Date;
};

function mapSession(s: DbChatSession): StoredChatSession {
  return {
    id:        s.id,
    userId:    s.userId,
    title:     s.title,
    context:   (s.context as ChatContext) ?? {},
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

const CHAT_TTL_MS = 20 * 24 * 60 * 60 * 1000;

export async function getChatSessions(userId: string): Promise<StoredChatSession[]> {
  const cutoff = new Date(Date.now() - CHAT_TTL_MS);

  // Purge expired sessions (cascade deletes messages)
  await prisma.chatSession.deleteMany({ where: { userId, createdAt: { lt: cutoff } } });

  const sessions = await prisma.chatSession.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
  });
  return sessions.map(mapSession);
}

export async function createChatSession(session: StoredChatSession): Promise<void> {
  await prisma.chatSession.create({
    data: {
      id:        session.id,
      userId:    session.userId,
      title:     session.title,
      context:   session.context as unknown as Prisma.InputJsonValue,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
    },
  });
}

export async function updateChatSession(
  userId: string,
  sessionId: string,
  updates: Partial<StoredChatSession>
): Promise<void> {
  const existing = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  if (!existing) return;

  await prisma.chatSession.update({
    where: { id: sessionId },
    data:  {
      ...(updates.title   !== undefined && { title:   updates.title }),
      ...(updates.context !== undefined && { context: updates.context as unknown as Prisma.InputJsonValue }),
    },
  });
}

export async function deleteChatSession(userId: string, sessionId: string): Promise<void> {
  await prisma.chatSession.deleteMany({ where: { id: sessionId, userId } });
}

export async function getMessages(userId: string, sessionId: string): Promise<StoredChatMessage[]> {
  // Verify session belongs to this user
  const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return [];

  const messages = await prisma.chatMessage.findMany({
    where:   { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id:        m.id,
    sessionId: m.sessionId,
    role:      m.role as "user" | "assistant",
    content:   m.content,
    outfits:   m.outfits ? (m.outfits as unknown[]) : undefined,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function addMessage(userId: string, message: StoredChatMessage): Promise<void> {
  // Bump session updatedAt
  await prisma.chatSession.updateMany({
    where: { id: message.sessionId, userId },
    data:  {},
  });

  await prisma.chatMessage.create({
    data: {
      id:        message.id,
      sessionId: message.sessionId,
      role:      message.role,
      content:   message.content,
      outfits:   message.outfits ? (message.outfits as Prisma.InputJsonValue) : undefined,
      createdAt: new Date(message.createdAt),
    },
  });

  // Explicitly touch updatedAt on session so session list stays sorted correctly
  await prisma.chatSession.updateMany({
    where: { id: message.sessionId, userId },
    data:  { updatedAt: new Date() },
  });
}

// ── OUTFITS ───────────────────────────────────────────────────────────────────

export interface StoredOutfit {
  id:            string;
  userId:        string;
  name:          string;
  description:   string;
  occasion:      string;
  style:         string;
  score:         number;
  wearCount:     number;
  lastWorn:      string | null;
  isAiGenerated: boolean;
  items: {
    role:         string;
    itemId:       string;
    itemName:     string;
    thumbnailUrl: string | null;
    colors:       string[];
    category:     string;
  }[];
  createdAt: string;
}

type DbOutfitWithItems = {
  id: string; userId: string; name: string; description: string;
  occasion: string; style: string; score: number; wearCount: number;
  lastWorn: Date | null; isAiGenerated: boolean; fingerprint: string; createdAt: Date;
  items: {
    clothingItemId: string; role: string; itemName: string;
    thumbnailUrl: string | null; colors: string[]; category: string;
  }[];
};

function mapOutfit(o: DbOutfitWithItems): StoredOutfit {
  return {
    id:            o.id,
    userId:        o.userId,
    name:          o.name,
    description:   o.description,
    occasion:      o.occasion,
    style:         o.style,
    score:         o.score,
    wearCount:     o.wearCount,
    lastWorn:      o.lastWorn ? o.lastWorn.toISOString() : null,
    isAiGenerated: o.isAiGenerated,
    items:         o.items.map((i) => ({
      role:         i.role,
      itemId:       i.clothingItemId,
      itemName:     i.itemName,
      thumbnailUrl: i.thumbnailUrl,
      colors:       i.colors,
      category:     i.category,
    })),
    createdAt: o.createdAt.toISOString(),
  };
}

export async function getOutfits(userId: string): Promise<StoredOutfit[]> {
  const outfits = await prisma.outfit.findMany({
    where:   { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return outfits.map(mapOutfit);
}

export async function addOutfit(outfit: StoredOutfit): Promise<void> {
  const fingerprint = outfit.items.map((i) => i.itemId).sort().join("|");

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.outfit.create({
        data: {
          id:            outfit.id,
          userId:        outfit.userId,
          name:          outfit.name,
          description:   outfit.description,
          occasion:      outfit.occasion,
          style:         outfit.style,
          score:         outfit.score,
          wearCount:     outfit.wearCount,
          isAiGenerated: outfit.isAiGenerated,
          fingerprint,
          createdAt:     new Date(outfit.createdAt),
        },
      });

      await tx.outfitItem.createMany({
        data: outfit.items.map((item) => ({
          outfitId:       created.id,
          clothingItemId: item.itemId,
          role:           item.role,
          itemName:       item.itemName,
          thumbnailUrl:   item.thumbnailUrl,
          colors:         item.colors,
          category:       item.category,
        })),
      });
    });
  } catch (e: unknown) {
    // P2002 = unique constraint violation → duplicate fingerprint, silently skip
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return;
    }
    throw e;
  }
}

export async function updateOutfitScore(userId: string, outfitId: string, score: number): Promise<void> {
  await prisma.outfit.updateMany({ where: { id: outfitId, userId }, data: { score } });
}

export async function updateOutfitWorn(userId: string, outfitId: string): Promise<void> {
  const outfit = await prisma.outfit.findFirst({ where: { id: outfitId, userId } });
  if (!outfit) return;
  await prisma.outfit.update({
    where: { id: outfitId },
    data: { wearCount: outfit.wearCount + 1, lastWorn: new Date() },
  });
}

export async function incrementClothingWearCount(userId: string, itemId: string): Promise<void> {
  await prisma.clothingItem.updateMany({
    where: { id: itemId, userId },
    data:  { wearCount: { increment: 1 }, lastWorn: new Date() },
  });
}

export async function getRecentlyWornOutfits(userId: string, withinDays: number): Promise<StoredOutfit[]> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const outfits = await prisma.outfit.findMany({
    where:   { userId, lastWorn: { gte: cutoff } },
    include: { items: true },
    orderBy: { lastWorn: "desc" },
  });
  return outfits.map(mapOutfit);
}

// ── USER PREFERENCES ─────────────────────────────────────────────────────────

export interface StoredPreferences {
  userId:              string;
  preferredStyles:     string[];
  dislikedColors:      string[];
  preferredOccasions:  string[];
  skinTone:            string | null;
  gender:              string | null;
  city:                string | null;
  onboardingCompleted: boolean;
  updatedAt:           string;
}

export async function getPreferences(userId: string): Promise<StoredPreferences | null> {
  const p = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    userId:              p.userId,
    preferredStyles:     p.preferredStyles,
    dislikedColors:      p.dislikedColors,
    preferredOccasions:  p.preferredOccasions,
    skinTone:            p.skinTone ?? null,
    gender:              p.gender   ?? null,
    city:                p.city     ?? null,
    onboardingCompleted: p.onboardingCompleted,
    updatedAt:           p.updatedAt.toISOString(),
  };
}

export async function savePreferences(prefs: StoredPreferences): Promise<void> {
  await prisma.userPreferences.upsert({
    where:  { userId: prefs.userId },
    update: {
      preferredStyles:     prefs.preferredStyles,
      dislikedColors:      prefs.dislikedColors,
      preferredOccasions:  prefs.preferredOccasions,
      skinTone:            prefs.skinTone,
      gender:              prefs.gender,
      city:                prefs.city,
      onboardingCompleted: prefs.onboardingCompleted,
    },
    create: {
      userId:              prefs.userId,
      preferredStyles:     prefs.preferredStyles,
      dislikedColors:      prefs.dislikedColors,
      preferredOccasions:  prefs.preferredOccasions,
      skinTone:            prefs.skinTone,
      gender:              prefs.gender,
      city:                prefs.city,
      onboardingCompleted: prefs.onboardingCompleted,
    },
  });
}

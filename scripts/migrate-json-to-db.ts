/**
 * One-time migration: flat JSON files → Neon PostgreSQL + Cloudinary
 *
 * Run: npm run migrate
 *
 * Prerequisites:
 *   1. DATABASE_URL and DIRECT_URL set in .env.local
 *   2. `npx prisma db push` already run (tables exist)
 *   3. Cloudinary credentials set in .env.local
 *
 * Idempotent — safe to re-run (uses upsert, skips existing records).
 */

import "dotenv/config";
// Also load .env.local (dotenv/config only reads .env)
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import fs   from "fs/promises";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });
const DATA_DIR = path.join(process.cwd(), "data");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function uploadLocalImage(localUrl: string): Promise<string> {
  // localUrl = /uploads/{userId}/{filename}
  const relativePath = localUrl.replace(/^\//, "");
  const filePath = path.join(process.cwd(), "public", relativePath);
  const parts = relativePath.split("/");
  const userId = parts[1];
  const filenameNoExt = parts[2].replace(/\.[^.]+$/, "");
  const publicId = `wardrobe/${userId}/${filenameNoExt}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { public_id: publicId, overwrite: false },
      (err, result) => {
        if (err || !result) reject(err ?? new Error("Upload failed"));
        else resolve(result.secure_url);
      }
    );
  });
}

// ── Migration steps ───────────────────────────────────────────────────────────

async function migrateUsers() {
  const store = await readJson<Record<string, {
    id: string; email: string; name: string; passwordHash: string; createdAt: string;
  }>>(path.join(DATA_DIR, "users.json")) ?? {};

  for (const user of Object.values(store)) {
    await prisma.user.upsert({
      where:  { id: user.id },
      update: {},
      create: {
        id:           user.id,
        email:        user.email,
        name:         user.name,
        passwordHash: user.passwordHash,
        createdAt:    new Date(user.createdAt),
      },
    });
    console.log(`  ✓ User: ${user.email}`);
  }
}

async function migrateWardrobe(userId: string) {
  const filePath = path.join(DATA_DIR, "wardrobe", `${userId}.json`);
  const items = await readJson<Array<{
    id: string; userId: string; name: string; imageUrl: string;
    category: string; style: string; colors: string[]; tags: string[];
    season: string; occasion: string[]; material: string | null;
    pattern: string | null; brand: string | null; description: string | null;
    notes: string | null; isFavorite: boolean; wearCount: number;
    lastWorn: string | null; createdAt: string; updatedAt: string;
  }>>(filePath) ?? [];

  for (const item of items) {
    let imageUrl = item.imageUrl;
    try {
      imageUrl = await uploadLocalImage(item.imageUrl);
      console.log(`    ↑ Uploaded: ${item.name}`);
    } catch (e) {
      console.warn(`    ⚠ Could not upload image for "${item.name}" — keeping local URL. ${e}`);
    }

    await prisma.clothingItem.upsert({
      where:  { id: item.id },
      update: {},
      create: {
        id:          item.id,
        userId:      item.userId,
        name:        item.name,
        imageUrl,
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
  console.log(`  ✓ Wardrobe: ${items.length} items`);
}

async function migrateChats(userId: string) {
  const filePath = path.join(DATA_DIR, "chats", `${userId}.json`);
  const store = await readJson<{
    sessions: Array<{
      id: string; userId: string; title: string; context: object;
      createdAt: string; updatedAt: string;
    }>;
    messages: Record<string, Array<{
      id: string; sessionId: string; role: string; content: string;
      outfits?: unknown[]; createdAt: string;
    }>>;
  }>(filePath) ?? { sessions: [], messages: {} };

  for (const session of store.sessions) {
    await prisma.chatSession.upsert({
      where:  { id: session.id },
      update: {},
      create: {
        id:        session.id,
        userId:    session.userId,
        title:     session.title,
        context:   session.context,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      },
    });

    const msgs = store.messages[session.id] ?? [];
    for (const msg of msgs) {
      await prisma.chatMessage.upsert({
        where:  { id: msg.id },
        update: {},
        create: {
          id:        msg.id,
          sessionId: msg.sessionId,
          role:      msg.role,
          content:   msg.content,
          outfits:   msg.outfits ? (msg.outfits as object[]) : undefined,
          createdAt: new Date(msg.createdAt),
        },
      });
    }
  }
  console.log(`  ✓ Chats: ${store.sessions.length} sessions`);
}

async function migrateOutfits(userId: string) {
  const filePath = path.join(DATA_DIR, "outfits", `${userId}.json`);
  const outfits = await readJson<Array<{
    id: string; userId: string; name: string; description: string;
    occasion: string; style: string; score: number; wearCount: number;
    isAiGenerated: boolean; createdAt: string;
    items: Array<{
      role: string; itemId: string; itemName: string;
      thumbnailUrl: string | null; colors: string[]; category: string;
    }>;
  }>>(filePath) ?? [];

  for (const outfit of outfits) {
    const fingerprint = outfit.items.map((i) => i.itemId).sort().join("|");

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.outfit.findFirst({ where: { userId, fingerprint } });
        if (existing) return;

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
          skipDuplicates: true,
        });
      });
    } catch (e) {
      console.warn(`  ⚠ Skipped outfit "${outfit.name}": ${e}`);
    }
  }
  console.log(`  ✓ Outfits: ${outfits.length} total (duplicates skipped)`);
}

async function migratePreferences(userId: string) {
  const filePath = path.join(DATA_DIR, "preferences", `${userId}.json`);
  const prefs = await readJson<{
    userId: string; preferredStyles: string[];
    dislikedColors: string[]; preferredOccasions: string[]; updatedAt: string;
  }>(filePath);

  if (!prefs) return;

  await prisma.userPreferences.upsert({
    where:  { userId },
    update: {},
    create: {
      userId:             prefs.userId,
      preferredStyles:    prefs.preferredStyles,
      dislikedColors:     prefs.dislikedColors,
      preferredOccasions: prefs.preferredOccasions,
      updatedAt:          new Date(prefs.updatedAt),
    },
  });
  console.log(`  ✓ Preferences migrated`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting migration: JSON files → Neon PostgreSQL + Cloudinary\n");

  console.log("Migrating users...");
  await migrateUsers();

  const usersJson = await readJson<Record<string, { id: string }>>(
    path.join(DATA_DIR, "users.json")
  ) ?? {};
  const userIds = Object.keys(usersJson);

  if (userIds.length === 0) {
    console.log("No users found in data/users.json — nothing to migrate.");
  }

  for (const userId of userIds) {
    console.log(`\nMigrating data for user ${userId}...`);
    await migrateWardrobe(userId);
    await migrateChats(userId);
    await migrateOutfits(userId);
    await migratePreferences(userId);
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

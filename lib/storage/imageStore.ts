import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set IMAGE_STORAGE=local in .env.local to use disk (corporate network / offline dev)
// Defaults to Cloudinary when the var is absent or set to anything else
const USE_LOCAL = process.env.IMAGE_STORAGE === "local";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export interface SavedImage {
  url:      string;
  filePath: string;
  filename: string;
}

async function processImage(base64DataUri: string): Promise<Buffer> {
  const base64 = base64DataUri.replace(/^data:[^;]+;base64,/, "");
  return sharp(Buffer.from(base64, "base64"))
    .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// ── Local disk (offline / corporate network) ──────────────────────────────────

async function saveImageLocal(processed: Buffer, userId: string): Promise<SavedImage> {
  const filename = `${uuidv4()}.jpg`;
  const userDir  = path.join(UPLOADS_DIR, userId);
  const filePath = path.join(userDir, filename);
  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(filePath, processed);
  return { url: `/uploads/${userId}/${filename}`, filePath, filename };
}

async function deleteImageLocal(url: string): Promise<void> {
  try {
    await fs.unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch { /* silent */ }
}

async function readImageLocal(url: string): Promise<string | null> {
  try {
    return (await fs.readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")))).toString("base64");
  } catch { return null; }
}

// ── Cloudinary ────────────────────────────────────────────────────────────────

async function saveImageCloudinary(processed: Buffer, userId: string): Promise<SavedImage> {
  const publicId = `Wardrobe AI/${userId}/${uuidv4()}`;
  const dataUri  = `data:image/jpeg;base64,${processed.toString("base64")}`;
  const result   = await cloudinary.uploader.upload(dataUri, {
    public_id:     publicId,
    resource_type: "image",
    overwrite:     false,
  });
  return { url: result.secure_url, filePath: "", filename: result.public_id };
}

async function deleteImageCloudinary(url: string): Promise<void> {
  try {
    // Extracts public_id from: https://res.cloudinary.com/<cloud>/image/upload/v123/Wardrobe AI/<userId>/<uuid>.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    if (!match) return;
    await cloudinary.uploader.destroy(match[1]);
  } catch { /* silent */ }
}

async function readImageCloudinary(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer()).toString("base64");
  } catch { return null; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveImage(base64DataUri: string, userId: string): Promise<SavedImage> {
  const processed = await processImage(base64DataUri);
  return USE_LOCAL ? saveImageLocal(processed, userId) : saveImageCloudinary(processed, userId);
}

export async function deleteImage(url: string): Promise<void> {
  return USE_LOCAL ? deleteImageLocal(url) : deleteImageCloudinary(url);
}

export async function readImageAsBase64(url: string): Promise<string | null> {
  return USE_LOCAL ? readImageLocal(url) : readImageCloudinary(url);
}

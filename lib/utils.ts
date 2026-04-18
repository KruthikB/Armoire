/**
 * Shared utility functions used across the app.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merging ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return formatDate(dateString);
}

// ── Image helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a File object to a base64 data URI for API upload.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file to a JPEG data URI.
 * Resizes to fit within MAX_DIM and re-encodes at QUALITY to keep the
 * request body under Vercel's 4.5 MB serverless limit — phone camera
 * photos routinely exceed this as raw base64.
 */
export function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width  = maxDim;
          } else {
            width  = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validate that an uploaded file is an acceptable image.
 */
export function validateImageFile(file: File): string | null {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, or GIF images are supported.";
  }
  if (file.size > MAX_SIZE) {
    return "Image must be smaller than 10 MB.";
  }
  return null;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_HEX_MAP: Record<string, string> = {
  white:   "#ffffff",
  black:   "#1a1a1a",
  grey:    "#9ca3af",
  gray:    "#9ca3af",
  navy:    "#1e3a5f",
  blue:    "#3b82f6",
  red:     "#ef4444",
  green:   "#22c55e",
  yellow:  "#eab308",
  orange:  "#f97316",
  purple:  "#a855f7",
  pink:    "#ec4899",
  brown:   "#92400e",
  camel:   "#c19a6b",
  beige:   "#f5f5dc",
  cream:   "#fffdd0",
  burgundy:"#800020",
  olive:   "#708238",
  khaki:   "#c3b091",
  indigo:  "#4338ca",
  teal:    "#0d9488",
};

export function colorToHex(colorName: string): string {
  return COLOR_HEX_MAP[colorName.toLowerCase()] ?? "#6b7280";
}

// ── String helpers ────────────────────────────────────────────────────────────

export function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatEnum(value: string): string {
  return value
    .split("_")
    .map((w) => capitalise(w))
    .join(" ");
}

// ── API fetch wrapper ─────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return json as T;
}

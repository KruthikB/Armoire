/**
 * Shared TypeScript types used across API routes and frontend components.
 */

// ── API response wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────

export type ClothingCategory = "TOP" | "BOTTOM" | "FOOTWEAR" | "ACCESSORY" | "OUTERWEAR" | "DRESS" | "SUIT";
export type ClothingStyle = "CASUAL" | "FORMAL" | "SMART_CASUAL" | "SPORTY" | "STREETWEAR" | "BOHEMIAN" | "MINIMALIST" | "VINTAGE";
export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER" | "ALL_SEASON";

export interface ClothingItemDTO {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  category: ClothingCategory;
  style: ClothingStyle;
  colors: string[];
  tags: string[];
  season: Season;
  occasion: string[];
  material: string | null;
  pattern: string | null;
  brand: string | null;
  description: string | null;
  isFavorite: boolean;
  wearCount: number;
  lastWorn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadClothingResponse {
  item: ClothingItemDTO;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatSessionDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface ChatMessageDTO {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata?: ChatMessageMetadata;
  createdAt: string;
}

export interface ChatMessageMetadata {
  outfits?: OutfitPayloadDTO[];
  intent?: string;
}

// ── Outfits ───────────────────────────────────────────────────────────────────

export interface OutfitPayloadDTO {
  id?: string;
  name: string;
  explanation: string;
  score: number;
  top: ItemPreviewDTO | null;
  bottom: ItemPreviewDTO | null;
  footwear: ItemPreviewDTO | null;
  accessory?: ItemPreviewDTO | null;
  outerwear?: ItemPreviewDTO | null;
}

export interface ItemPreviewDTO {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  colors: string[];
  category: string;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export interface FeedbackPayload {
  type: "LIKE" | "DISLIKE" | "WORN" | "SAVED";
  outfitId?: string;
  clothingItemId?: string;
  comment?: string;
}

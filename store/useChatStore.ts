/**
 * Zustand store for chat state — sessions, messages, streaming.
 */
import { create } from "zustand";
import { ChatMessageDTO, ChatSessionDTO, OutfitPayloadDTO } from "@/types";

interface ChatState {
  sessions: ChatSessionDTO[];
  activeSessionId: string | null;
  messages: ChatMessageDTO[];
  isStreaming: boolean;
  streamingContent: string;
  pendingOutfits: OutfitPayloadDTO[];

  // Actions
  setSessions: (sessions: ChatSessionDTO[]) => void;
  addSession: (session: ChatSessionDTO) => void;
  setActiveSession: (id: string | null) => void;
  setMessages: (messages: ChatMessageDTO[]) => void;
  addMessage: (message: ChatMessageDTO) => void;
  setStreaming: (isStreaming: boolean, content?: string) => void;
  appendStreamChunk: (chunk: string) => void;
  setPendingOutfits: (outfits: OutfitPayloadDTO[]) => void;
  finalizeStreamingMessage: (role?: "USER" | "ASSISTANT") => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  pendingOutfits: [],

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  setActiveSession: (activeSessionId) => set({ activeSessionId, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setStreaming: (isStreaming, streamingContent = "") =>
    set({ isStreaming, streamingContent }),

  appendStreamChunk: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  setPendingOutfits: (pendingOutfits) => set({ pendingOutfits }),

  finalizeStreamingMessage: () => {
    const { streamingContent, pendingOutfits } = get();
    if (!streamingContent) return;

    const finalMessage: ChatMessageDTO = {
      id: `temp-${Date.now()}`,
      role: "ASSISTANT",
      content: streamingContent,
      metadata: pendingOutfits.length ? { outfits: pendingOutfits } : undefined,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, finalMessage],
      isStreaming: false,
      streamingContent: "",
      pendingOutfits: [],
    }));
  },
}));

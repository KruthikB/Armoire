"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, MessageSquare, Sparkles, PanelLeft, X, Trash2 } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { ChatSessionDTO, ChatMessageDTO, OutfitPayloadDTO } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import OutfitCarousel from "./OutfitCarousel";
import toast from "react-hot-toast";

interface ChatClientProps {
  initialSessions: ChatSessionDTO[];
}

const STARTER_PROMPTS = [
  "What should I wear for a dinner date tonight?",
  "Suggest a casual weekend outfit",
  "I have an office presentation — what looks professional?",
  "Put together something smart-casual for brunch",
];

export default function ChatClient({ initialSessions }: ChatClientProps) {
  const {
    sessions, activeSessionId, messages, isStreaming, streamingContent,
    setSessions, addSession, setActiveSession, setMessages,
    addMessage, setStreaming, appendStreamChunk, finalizeStreamingMessage, setPendingOutfits,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showSessions, setShowSessions]     = useState(false);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions, setSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function createNewSession() {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    const { data } = await res.json();
    addSession(data);
    setActiveSession(data.id);
    setMessages([]);
  }

  async function loadSession(id: string) {
    setActiveSession(id);
    const res = await fetch(`/api/chat/sessions/${id}/messages`);
    const { data } = await res.json();

    const mapped: ChatMessageDTO[] = (data as Array<{
      id: string;
      role: string;
      content: string;
      outfits?: OutfitPayloadDTO[];
      createdAt: string;
    }>).map((m) => ({
      id:        m.id,
      role:      (m.role === "assistant" ? "ASSISTANT" : "USER") as ChatMessageDTO["role"],
      content:   m.content,
      createdAt: m.createdAt,
      ...(m.outfits?.length ? { metadata: { outfits: m.outfits } } : {}),
    }));

    setMessages(mapped);
  }

  async function deleteSession(id: string) {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions(sessions.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSession(null);
      setMessages([]);
    }
  }

  async function sendMessage(content: string) {
    if (!activeSessionId || !content.trim() || sendingMessage) return;

    setSendingMessage(true);

    const userMsg: ChatMessageDTO = {
      id: `temp-user-${Date.now()}`,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);
    setStreaming(true, "");

    try {
      const res = await fetch(
        `/api/chat/sessions/${activeSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        }
      );

      if (!res.ok) throw new Error("Request failed");

      const { data } = await res.json();

      const words = data.message.split(" ");
      for (let i = 0; i < words.length; i++) {
        appendStreamChunk(words[i] + (i < words.length - 1 ? " " : ""));
        await new Promise((r) => setTimeout(r, 18));
      }

      if (data.outfits?.length) {
        setPendingOutfits(data.outfits);
      }

      finalizeStreamingMessage();

      if (messages.length <= 1) {
        setSessions(sessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, title: content.length > 40 ? content.slice(0, 37) + "…" : content }
            : s
        ));
      }
    } catch {
      setStreaming(false);
      toast.error("Failed to get a response. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex h-full relative">
      {/* Mobile sessions overlay */}
      {showSessions && (
        <div
          className="fixed inset-0 bg-ink/30 z-20 md:hidden"
          onClick={() => setShowSessions(false)}
        />
      )}

      {/* Session sidebar */}
      <div className={cn(
        "flex-shrink-0 border-r border-ink/[0.07] flex flex-col bg-surface-1",
        "absolute inset-y-0 left-0 z-30 w-64 transition-transform duration-300",
        "md:static md:w-56 md:translate-x-0",
        showSessions ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-3 flex gap-2">
          <button
            onClick={createNewSession}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
          <button
            onClick={() => setShowSessions(false)}
            className="md:hidden p-2.5 rounded-xl text-ink/40 hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 ? (
            <p className="text-xs text-ink/30 px-3 py-2">No conversations yet</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-1 rounded-xl text-sm transition-all",
                  s.id === activeSessionId
                    ? "bg-brand-500/10 text-brand-600"
                    : "text-ink/50 hover:text-ink hover:bg-surface-2"
                )}
              >
                <button
                  onClick={() => { loadSession(s.id); setShowSessions(false); }}
                  className="flex-1 text-left px-3 py-2.5 min-w-0"
                >
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs text-ink/30 mt-0.5 truncate">
                    {formatRelativeTime(s.updatedAt)}
                  </p>
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="flex-shrink-0 p-1.5 mr-1 rounded-lg opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!activeSessionId ? (
          <WelcomeScreen onStartChat={createNewSession} onPrompt={async (p) => {
            await createNewSession();
            setTimeout(() => sendMessage(p), 300);
          }} />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 md:px-6 py-4 border-b border-ink/[0.07] flex-shrink-0">
              <button
                onClick={() => setShowSessions(true)}
                className="md:hidden p-1.5 -ml-1 rounded-lg text-ink/40 hover:text-ink hover:bg-surface-2 transition-colors"
                aria-label="Show conversations"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <MessageSquare className="w-4 h-4 text-ink/40" />
              <span className="text-sm font-medium text-ink truncate">
                {activeSession?.title ?? "Chat"}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-12">
                  <Sparkles className="w-8 h-8 text-brand-500/40 mx-auto mb-3" />
                  <p className="text-ink/40 text-sm">
                    Ask Aria anything about your wardrobe…
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  <MessageBubble message={msg} />
                  {msg.metadata?.outfits && msg.metadata.outfits.length > 0 && (
                    <OutfitCarousel outfits={msg.metadata.outfits} />
                  )}
                </div>
              ))}

              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "ASSISTANT",
                    content: streamingContent,
                    createdAt: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              onSend={sendMessage}
              disabled={sendingMessage || isStreaming}
            />
          </>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen({
  onStartChat,
  onPrompt,
}: {
  onStartChat: () => void;
  onPrompt: (p: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="text-2xl font-semibold text-ink">Meet Aria</h2>
        <p className="text-ink/50 max-w-sm text-sm leading-relaxed">
          Your AI personal stylist, powered by Armoire AI. Ask me to create outfits from your wardrobe
          for any occasion, then refine them through conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="text-left p-3.5 rounded-xl bg-surface-1 hover:bg-surface-2 border border-ink/[0.08] hover:border-brand-500/20 text-sm text-ink/60 hover:text-ink transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      <button
        onClick={onStartChat}
        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
      >
        Start a new chat
      </button>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const QUICK_REPLIES = [
  "I don't like this",
  "Make it more casual",
  "Something with black",
  "More formal please",
  "What about shoes?",
];

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [message]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-ink/[0.07] px-6 py-4 flex-shrink-0 space-y-3 bg-surface">
      {/* Quick reply chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {QUICK_REPLIES.map((r) => (
          <button
            key={r}
            onClick={() => { setMessage(r); textareaRef.current?.focus(); }}
            disabled={disabled}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-ink/[0.10] text-ink/40 hover:text-ink/70 hover:border-brand-500/30 transition-colors disabled:opacity-30"
          >
            {r}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1 relative bg-white border border-ink/[0.12] rounded-2xl overflow-hidden focus-within:border-brand-500/60 transition-colors shadow-sm shadow-ink/[0.04]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            rows={1}
            placeholder="Ask Aria about your wardrobe…"
            className="w-full bg-transparent px-4 py-3 text-sm text-ink placeholder-ink/30 resize-none focus:outline-none min-h-[44px] max-h-40"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
            message.trim() && !disabled
              ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
              : "bg-surface-3 text-ink/25 cursor-not-allowed"
          )}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      <p className="text-[11px] text-ink/20 text-center">
        Aria can make mistakes. Double-check outfit combinations.
      </p>
    </div>
  );
}

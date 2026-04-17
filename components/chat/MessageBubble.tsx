"use client";

import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessageDTO } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessageDTO;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
        </div>
      )}

      <div className={cn("max-w-[72%] space-y-1", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-brand-500 text-white rounded-tr-sm"
              : "bg-white text-ink/80 rounded-tl-sm border border-ink/[0.08] shadow-sm shadow-ink/[0.04]"
          )}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
                li: ({ children }) => <li className="text-ink/75">{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-brand-500 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>

        {!isStreaming && (
          <p className="text-[11px] text-ink/25 px-1">
            {formatRelativeTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

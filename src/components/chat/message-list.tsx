"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage, ReuseSettings } from "./chat-view";

interface MessageListProps {
  messages: ChatMessage[];
  onReuse: (settings: ReuseSettings) => void;
}

export function MessageList({ messages, onReuse }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            nextMessage={index < messages.length - 1 ? messages[index + 1] : undefined}
            onReuse={onReuse}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

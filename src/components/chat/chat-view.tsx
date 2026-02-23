"use client";

import { useState, useCallback } from "react";
import { ImagePlus } from "lucide-react";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";
import type { GenerationType, ProviderName } from "@/lib/providers/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  mediaAssets: {
    id: string;
    type: "image" | "video";
    filePath: string;
    mimeType: string;
    prompt: string;
  }[];
  generationJobs: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    generationType: GenerationType;
    model: string | null;
    provider: ProviderName;
    error: string | null;
  }[];
}

export interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ReuseSettings {
  generationType: GenerationType;
  provider: ProviderName;
  modelId: string;
  prompt: string;
  referenceImageUrl?: string;
  referenceImageMimeType?: string;
}

interface ChatViewProps {
  chatId: string | null;
  messages: ChatMessage[];
}

function processFile(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type, name: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatView({ chatId, messages: initialMessages }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [reuseSettings, setReuseSettings] = useState<ReuseSettings | null>(null);

  const handleNewMessage = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  };

  const handleFileDrop = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const image = await processFile(file);
    setUploadedImage(image);
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((c) => c + 1);
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragging(true);
      }
    },
    []
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((c) => {
        const next = c - 1;
        if (next <= 0) {
          setIsDragging(false);
          return 0;
        }
        return next;
      });
    },
    []
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileDrop(file);
      }
    },
    [handleFileDrop]
  );

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-primary">
            <ImagePlus className="h-12 w-12" />
            <p className="text-lg font-medium">Drop image here</p>
            <p className="text-sm text-muted-foreground">
              Image will be used as reference for generation
            </p>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <h1 className="text-2xl font-semibold">Generative Media</h1>
            <p className="text-muted-foreground">
              Generate images and videos using AI. Choose a model and
              generation type below to get started.
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop an image anywhere to use as reference.
            </p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} onReuse={setReuseSettings} />
      )}
      <ChatInput
        chatId={chatId}
        messages={messages}
        onMessagesUpdate={handleNewMessage}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        uploadedImage={uploadedImage}
        onUploadedImageChange={setUploadedImage}
        reuseSettings={reuseSettings}
        onReuseSettingsConsumed={() => setReuseSettings(null)}
      />
    </div>
  );
}

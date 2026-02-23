"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerationControls } from "./generation-controls";
import { sendMessage, getChat } from "@/lib/actions";
import { useJobPolling } from "@/hooks/use-job-polling";
import type { GenerationType } from "@/lib/providers/types";
import {
  getDefaultModel,
  getModelById,
  type ModelDefinition,
} from "@/lib/models";
import type { ChatMessage, UploadedImage, ReuseSettings } from "./chat-view";

interface ChatInputProps {
  chatId: string | null;
  messages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  uploadedImage: UploadedImage | null;
  onUploadedImageChange: (image: UploadedImage | null) => void;
  reuseSettings?: ReuseSettings | null;
  onReuseSettingsConsumed?: () => void;
}

export function ChatInput({
  chatId,
  messages: currentMessages,
  onMessagesUpdate,
  isLoading,
  setIsLoading,
  uploadedImage,
  onUploadedImageChange,
  reuseSettings,
  onReuseSettingsConsumed,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [generationType, setGenerationType] =
    useState<GenerationType>("text-to-image");
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(
    getDefaultModel("text-to-image")
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-switch to image-to-video when an image is uploaded
  useEffect(() => {
    if (uploadedImage && generationType !== "image-to-video") {
      setGenerationType("image-to-video");
      setSelectedModel(getDefaultModel("image-to-video"));
    }
  }, [uploadedImage]);

  // Apply reuse settings from a previous message
  useEffect(() => {
    if (!reuseSettings) return;

    setGenerationType(reuseSettings.generationType);

    const model = getModelById(
      reuseSettings.modelId,
      reuseSettings.generationType
    );
    setSelectedModel(model ?? getDefaultModel(reuseSettings.generationType));

    setContent(reuseSettings.prompt);

    if (reuseSettings.referenceImageUrl && reuseSettings.referenceImageMimeType) {
      const imageUrl = reuseSettings.referenceImageUrl.startsWith("http")
        ? `/api/media-proxy?url=${encodeURIComponent(reuseSettings.referenceImageUrl)}`
        : reuseSettings.referenceImageUrl;
      fetch(imageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            onUploadedImageChange({
              base64,
              mimeType: reuseSettings.referenceImageMimeType!,
              name: "reference.png",
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    } else {
      onUploadedImageChange(null);
    }

    onReuseSettingsConsumed?.();
  }, [reuseSettings]);

  const refreshChat = useCallback(
    async (cId: string) => {
      const chat = await getChat(cId);
      if (chat) {
        onMessagesUpdate(chat.messages as unknown as ChatMessage[]);
      }
    },
    [onMessagesUpdate]
  );

  const { startPolling } = useJobPolling(refreshChat);

  // Resume polling for any active jobs when loading an existing chat
  useEffect(() => {
    if (!chatId) return;
    for (const msg of currentMessages) {
      for (const job of msg.generationJobs ?? []) {
        if (job.status === "pending" || job.status === "processing") {
          startPolling(job.id, chatId);
        }
      }
    }
  }, [chatId]); // Only on mount / chatId change

  const handleGenerationTypeChange = (newType: GenerationType) => {
    setGenerationType(newType);
    setSelectedModel(getDefaultModel(newType));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      onUploadedImageChange({
        base64,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    const prompt = content;
    setContent("");

    try {
      let activeChatId = chatId;

      if (!activeChatId) {
        const response = await fetch("/api/chats", { method: "POST" });
        const data = await response.json();
        activeChatId = data.id;
        router.push(`/chat/${activeChatId}`);
        await new Promise((r) => setTimeout(r, 100));
      }

      // Upload image via API route first to avoid passing large base64 through server action serialization
      let uploadFilePath: string | undefined;
      let uploadMimeType: string | undefined;
      if (uploadedImage) {
        const byteString = atob(uploadedImage.base64);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          bytes[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: uploadedImage.mimeType });
        const formData = new FormData();
        formData.append("file", blob, uploadedImage.name);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        uploadFilePath = uploadData.filePath;
        uploadMimeType = uploadData.mimeType;
      }

      const result = await sendMessage(
        activeChatId!,
        prompt,
        selectedModel.provider,
        generationType,
        selectedModel.id,
        uploadFilePath,
        uploadMimeType
      );

      onUploadedImageChange(null);

      await refreshChat(activeChatId!);

      if (
        generationType === "text-to-video" ||
        generationType === "image-to-video"
      ) {
        startPolling(result.jobId, activeChatId!);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-3">
        <GenerationControls
          generationType={generationType}
          selectedModelId={selectedModel.id}
          onGenerationTypeChange={handleGenerationTypeChange}
          onModelChange={setSelectedModel}
        />

        {uploadedImage && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {uploadedImage.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={() => onUploadedImageChange(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload reference image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadedImage
                ? "Describe the motion or what to generate from this image..."
                : "Describe what you want to generate..."
            }
            className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-md border border-input bg-transparent px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={1}
            disabled={isLoading}
          />

          <Button
            onClick={handleSubmit}
            size="icon"
            className="shrink-0"
            disabled={!content.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

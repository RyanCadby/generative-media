"use client";

import { useState, useCallback, useMemo } from "react";
import { ImagePlus } from "lucide-react";
import { GenerationFeed } from "./generation-feed";
import { GenerationInput } from "./generation-input";
import type { GenerationType, ProviderName } from "@/lib/providers/types";

export interface Generation {
  id: string;
  prompt: string;
  provider: ProviderName;
  generationType: GenerationType;
  model: string;
  referenceImagePath: string | null;
  referenceImageMimeType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  mediaAssets: {
    id: string;
    type: "image" | "video";
    filePath: string;
    thumbnailPath: string | null;
    mimeType: string;
    prompt: string;
    width: number | null;
    height: number | null;
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

// How a reference image should be used by the model. "reference" means no
// specific role — the model decides from the prompt.
export type ImageRole = "reference" | "subject" | "style" | "composition";

export interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
  role: ImageRole;
}

export interface ReuseSettings {
  generationType: GenerationType;
  provider: ProviderName;
  modelId: string;
  prompt: string;
  referenceImageUrl?: string;
  referenceImageMimeType?: string;
}

interface CreateViewProps {
  projectId: string | null;
  generations: Generation[];
}

function processFile(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type, name: file.name, role: "reference" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CreateView({ projectId, generations: initialGenerations }: CreateViewProps) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  // In-flight submissions shown as loading rows, kept separate from server
  // state so concurrent submissions can't wipe each other's placeholders
  const [optimisticGenerations, setOptimisticGenerations] = useState<Generation[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [reuseSettings, setReuseSettings] = useState<ReuseSettings | null>(null);
  const [rerunRequest, setRerunRequest] = useState<Generation | null>(null);
  const [promptToLoad, setPromptToLoad] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<Record<string, number>>({});

  const handleNewGenerations = (newGenerations: Generation[]) => {
    setGenerations(newGenerations);
  };

  const handleJobProgress = useCallback((jobId: string, progress: number) => {
    setJobProgress((prev) => ({ ...prev, [jobId]: progress }));
  }, []);

  const handleFileDrop = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const images = await Promise.all(imageFiles.map(processFile));
    setUploadedImages((prev) => [...prev, ...images]);
  }, []);

  // One-click: pull a previously generated image into the prompt as a reference
  const handleUseAsReference = useCallback(
    async (asset: { id: string; filePath: string; mimeType: string }) => {
      const url = asset.filePath.startsWith("http")
        ? `/api/media-proxy?url=${encodeURIComponent(asset.filePath)}`
        : asset.filePath;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setUploadedImages((prev) => [
            ...prev,
            {
              base64,
              mimeType: asset.mimeType,
              name: `generated-${asset.id.slice(0, 8)}`,
              role: "reference",
            },
          ]);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Failed to load image as reference:", error);
      }
    },
    []
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => c + 1);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
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
  }, []);

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

      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length > 0) {
        handleFileDrop(files);
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

      {/* Input at top */}
      <GenerationInput
        projectId={projectId}
        generations={generations}
        onGenerationsUpdate={handleNewGenerations}
        onOptimisticChange={setOptimisticGenerations}
        uploadedImages={uploadedImages}
        onUploadedImagesChange={setUploadedImages}
        reuseSettings={reuseSettings}
        onReuseSettingsConsumed={() => setReuseSettings(null)}
        rerunRequest={rerunRequest}
        onRerunRequestConsumed={() => setRerunRequest(null)}
        promptToLoad={promptToLoad}
        onPromptToLoadConsumed={() => setPromptToLoad(null)}
        onJobProgress={handleJobProgress}
      />

      {/* Generation feed */}
      {optimisticGenerations.length === 0 && generations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <h1 className="text-2xl font-semibold">Generative Media</h1>
            <p className="text-muted-foreground">
              Generate images and videos using AI. Choose a model and
              generation type above to get started.
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop an image anywhere to use as reference.
            </p>
          </div>
        </div>
      ) : (
        <GenerationFeed
          generations={[...optimisticGenerations, ...generations]}
          onReuse={setReuseSettings}
          onRerun={setRerunRequest}
          onUsePrompt={setPromptToLoad}
          onUseAsReference={handleUseAsReference}
          jobProgress={jobProgress}
        />
      )}
    </div>
  );
}

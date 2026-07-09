"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GenerationTypeButtons, providerColors, providerLabels } from "./generation-controls";
import { submitGeneration, rerunGeneration, getProject } from "@/lib/actions";
import { useJobPolling } from "@/hooks/use-job-polling";
import type { GenerationType } from "@/lib/providers/types";
import {
  getDefaultModel,
  getModelById,
  getModelsByType,
  type ModelDefinition,
} from "@/lib/models";
import { ModelMegaMenu } from "./model-mega-menu";
import { UpscaleParamsPanel } from "./upscale-params-panel";
import { getDefaultUpscaleParams } from "@/lib/upscale-params";
import {
  SEEDANCE_TIERS,
  DEFAULT_SEEDANCE_TIER,
  DEFAULT_SEEDANCE_RESOLUTION,
  formatResolution,
  isSeedanceModelId,
} from "@/lib/seedance-resolutions";
import type { Generation, UploadedImage, ReuseSettings, ImageRole } from "./create-view";

const IMAGE_ROLES: ImageRole[] = ["reference", "subject", "style", "composition"];
const ROLE_LABELS: Record<ImageRole, string> = {
  reference: "Auto",
  subject: "Subject",
  style: "Style",
  composition: "Composition",
};

interface GenerationInputProps {
  projectId: string | null;
  generations: Generation[];
  onGenerationsUpdate: (generations: Generation[]) => void;
  onOptimisticChange: React.Dispatch<React.SetStateAction<Generation[]>>;
  uploadedImages: UploadedImage[];
  onUploadedImagesChange: (
    images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])
  ) => void;
  reuseSettings?: ReuseSettings | null;
  onReuseSettingsConsumed?: () => void;
  rerunRequest?: Generation | null;
  onRerunRequestConsumed?: () => void;
  promptToLoad?: string | null;
  onPromptToLoadConsumed?: () => void;
  onJobProgress?: (jobId: string, progress: number) => void;
}

export function GenerationInput({
  projectId,
  generations: currentGenerations,
  onGenerationsUpdate,
  onOptimisticChange,
  uploadedImages,
  onUploadedImagesChange,
  reuseSettings,
  onReuseSettingsConsumed,
  rerunRequest,
  onRerunRequestConsumed,
  promptToLoad,
  onPromptToLoadConsumed,
  onJobProgress,
}: GenerationInputProps) {
  const [content, setContent] = useState("");
  const [generationType, setGenerationType] =
    useState<GenerationType>("text-to-image");
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(
    getDefaultModel("text-to-image")
  );
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [numImages, setNumImages] = useState<number>(1);
  const [seedanceTier, setSeedanceTier] = useState<string>(DEFAULT_SEEDANCE_TIER);
  const [seedanceResolution, setSeedanceResolution] = useState<string>(DEFAULT_SEEDANCE_RESOLUTION);
  const [scaleFactor, setScaleFactor] = useState<string>("2");
  const [upscaleParams, setUpscaleParams] = useState<Record<string, unknown>>(
    () => getDefaultUpscaleParams(getDefaultModel("image-upscale").id)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Remembers a project created mid-session so rapid successive submissions
  // on a brand-new project don't each create their own project
  const createdProjectIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Apply reuse settings from a previous generation
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
            onUploadedImagesChange([
              {
                base64,
                mimeType: reuseSettings.referenceImageMimeType!,
                name: "reference.png",
                role: "reference",
              },
            ]);
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    } else {
      onUploadedImagesChange([]);
    }

    onReuseSettingsConsumed?.();
  }, [reuseSettings]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [content]);

  // Load prompt text without changing other settings
  useEffect(() => {
    if (promptToLoad == null) return;
    setContent(promptToLoad);
    onPromptToLoadConsumed?.();
  }, [promptToLoad]);

  const refreshProject = useCallback(
    async (pId: string) => {
      const project = await getProject(pId);
      if (project) {
        onGenerationsUpdate(project.generations as unknown as Generation[]);
      }
    },
    [onGenerationsUpdate]
  );

  const handleProgress = useCallback(
    ({ jobId, progress }: { jobId: string; progress: number | null }) => {
      if (progress != null) onJobProgress?.(jobId, progress);
    },
    [onJobProgress]
  );

  const { startPolling } = useJobPolling(refreshProject, handleProgress);

  // Resume polling for any active jobs when loading an existing project
  useEffect(() => {
    if (!projectId) return;
    for (const gen of currentGenerations) {
      for (const job of gen.generationJobs ?? []) {
        if (job.status === "pending" || job.status === "processing") {
          startPolling(job.id, projectId);
        }
      }
    }
  }, [projectId]);

  // Nano Banana models accept up to 14 reference images; video and upscale
  // flows use a single reference frame
  const maxImages = generationType === "text-to-image" ? 14 : 1;

  const handleGenerationTypeChange = (newType: GenerationType) => {
    setGenerationType(newType);
    const defaultModel = getDefaultModel(newType);
    setSelectedModel(defaultModel);
    setAspectRatio(newType === "text-to-image" ? "1:1" : "16:9");
    if (newType !== "text-to-image" && uploadedImages.length > 1) {
      onUploadedImagesChange((prev) => prev.slice(0, 1));
    }
    if (newType === "image-upscale") {
      setUpscaleParams(getDefaultUpscaleParams(defaultModel.id));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        const image: UploadedImage = {
          base64,
          mimeType: file.type,
          name: file.name,
          role: "reference",
        };
        onUploadedImagesChange((prev) =>
          maxImages === 1 ? [image] : [...prev, image].slice(0, maxImages)
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const cycleImageRole = (index: number) => {
    onUploadedImagesChange((prev) =>
      prev.map((img, i) => {
        if (i !== index) return img;
        const next =
          IMAGE_ROLES[(IMAGE_ROLES.indexOf(img.role) + 1) % IMAGE_ROLES.length];
        return { ...img, role: next };
      })
    );
  };

  const isUpscale = generationType === "image-upscale";
  const isSeedance = isSeedanceModelId(selectedModel.id);
  const currentTierResolutions = SEEDANCE_TIERS.find(t => t.id === seedanceTier)?.resolutions ?? [];

  const handleSeedanceTierChange = (tierId: string) => {
    setSeedanceTier(tierId);
    const tier = SEEDANCE_TIERS.find(t => t.id === tierId);
    if (tier && tier.resolutions.length > 0) {
      setSeedanceResolution(formatResolution(tier.resolutions[0].width, tier.resolutions[0].height));
    }
  };

  const handleModelChange = (modelId: string) => {
    const availableModels = getModelsByType(generationType);
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      if (generationType === "image-upscale") {
        setUpscaleParams(getDefaultUpscaleParams(modelId));
      }
    }
  };
  const availableModels = getModelsByType(generationType);

  const handleSubmit = async () => {
    if (isUpscale) {
      if (uploadedImages.length === 0) return;
    } else {
      if (!content.trim()) return;
    }

    // Capture inputs and clear immediately so the next prompt can be
    // composed and fired while this one is still generating
    const prompt = content;
    const images = uploadedImages;
    const submitType = generationType;
    const submitModel = selectedModel;
    const submitCount = submitType === "text-to-image" ? numImages : 1;
    setContent("");
    onUploadedImagesChange([]);

    // Optimistic loading row in the feed while the request is in flight
    const placeholderId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const placeholder: Generation = {
      id: placeholderId,
      prompt,
      provider: submitModel.provider,
      generationType: submitType,
      model: submitModel.id,
      referenceImagePath: images[0]
        ? `data:${images[0].mimeType};base64,${images[0].base64}`
        : null,
      referenceImageMimeType: images[0]?.mimeType ?? null,
      metadata: submitCount > 1 ? { numberOfImages: submitCount } : null,
      createdAt: new Date(),
      mediaAssets: [],
      generationJobs: [
        {
          id: `${placeholderId}-job`,
          status: "processing",
          generationType: submitType,
          model: submitModel.id,
          provider: submitModel.provider,
          error: null,
        },
      ],
    };
    onOptimisticChange((prev) => [placeholder, ...prev]);

    try {
      let activeProjectId = projectId ?? createdProjectIdRef.current;

      if (!activeProjectId) {
        const response = await fetch("/api/projects", { method: "POST" });
        const data = await response.json();
        activeProjectId = data.id as string;
        createdProjectIdRef.current = activeProjectId;
        router.push(`/create/${activeProjectId}`);
        await new Promise((r) => setTimeout(r, 100));
      }

      let uploads: { filePath: string; mimeType: string }[] | undefined;
      if (images.length > 0) {
        uploads = await Promise.all(
          images.map(async (image) => {
            const byteString = atob(image.base64);
            const bytes = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              bytes[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: image.mimeType });
            const formData = new FormData();
            formData.append("file", blob, image.name);

            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            return {
              filePath: uploadData.filePath as string,
              mimeType: uploadData.mimeType as string,
              role: image.role,
            };
          })
        );
      }

      const result = await submitGeneration(
        activeProjectId!,
        prompt,
        submitModel.provider,
        submitType,
        submitModel.id,
        uploads,
        submitType === "image-upscale" ? parseInt(scaleFactor, 10) : undefined,
        submitType === "image-upscale" ? upscaleParams : undefined,
        submitType === "text-to-image"
          ? aspectRatio
          : (submitType === "text-to-video" || submitType === "image-to-video")
            ? (isSeedance ? seedanceResolution : aspectRatio)
            : undefined,
        submitCount > 1 ? submitCount : undefined
      );

      await refreshProject(activeProjectId!);

      if (
        submitType === "text-to-video" ||
        submitType === "image-to-video" ||
        submitType === "image-upscale"
      ) {
        startPolling(result.jobId, activeProjectId!);
      }

      // Server state now includes this generation; drop the placeholder
      onOptimisticChange((prev) => prev.filter((g) => g.id !== placeholderId));
    } catch (error) {
      console.error("Failed to submit generation:", error);
      // Flip the optimistic row to a failed state so the error is visible
      onOptimisticChange((prev) =>
        prev.map((g) =>
          g.id === placeholderId
            ? {
                ...g,
                generationJobs: g.generationJobs.map((job) => ({
                  ...job,
                  status: "failed" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Failed to submit generation",
                })),
              }
            : g
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Re-run a previous generation server-side with its original settings
  const handleRerun = useCallback(
    async (generation: Generation) => {
      const placeholderId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const placeholder: Generation = {
        ...generation,
        id: placeholderId,
        createdAt: new Date(),
        mediaAssets: [],
        generationJobs: [
          {
            id: `${placeholderId}-job`,
            status: "processing",
            generationType: generation.generationType,
            model: generation.model,
            provider: generation.provider,
            error: null,
          },
        ],
      };
      onOptimisticChange((prev) => [placeholder, ...prev]);

      try {
        const result = await rerunGeneration(generation.id);
        await refreshProject(result.projectId);
        if (generation.generationType !== "text-to-image") {
          startPolling(result.jobId, result.projectId);
        }
        onOptimisticChange((prev) => prev.filter((g) => g.id !== placeholderId));
      } catch (error) {
        console.error("Failed to re-run generation:", error);
        onOptimisticChange((prev) =>
          prev.map((g) =>
            g.id === placeholderId
              ? {
                  ...g,
                  generationJobs: g.generationJobs.map((job) => ({
                    ...job,
                    status: "failed" as const,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Failed to re-run generation",
                  })),
                }
              : g
          )
        );
      }
    },
    [onOptimisticChange, refreshProject, startPolling]
  );

  useEffect(() => {
    if (!rerunRequest) return;
    const generation = rerunRequest;
    onRerunRequestConsumed?.();
    handleRerun(generation);
  }, [rerunRequest]);

  return (
    <div className="border-b bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        <GenerationTypeButtons
          generationType={generationType}
          onGenerationTypeChange={handleGenerationTypeChange}
        />

        {(generationType === "text-to-image" ||
          generationType === "text-to-video" ||
          generationType === "image-to-video") && (
          isSeedance ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {SEEDANCE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSeedanceTierChange(tier.id)}
                    className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                      seedanceTier === tier.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
              <Select value={seedanceResolution} onValueChange={setSeedanceResolution}>
                <SelectTrigger className="h-7 w-auto min-w-[160px] border-0 bg-muted text-xs px-2 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentTierResolutions.map((res) => {
                    const value = formatResolution(res.width, res.height);
                    return (
                      <SelectItem key={value} value={value}>
                        {res.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {["16:9", "9:16", "1:1"].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                    aspectRatio === ratio
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {ratio}
                </button>
              ))}
              {generationType === "text-to-image" && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setNumImages(count)}
                      title={`Generate ${count} image${count > 1 ? "s" : ""}`}
                      className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                        numImages === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {count}×
                    </button>
                  ))}
                </>
              )}
            </div>
          )
        )}

        {isUpscale && (
          <>
            <div className="flex items-center gap-1.5">
              {["1", "2", "4", "6", "8"].map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => setScaleFactor(factor)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                    scaleFactor === factor
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {factor}x
                </button>
              ))}
            </div>
            <UpscaleParamsPanel
              modelId={selectedModel.id}
              params={upscaleParams}
              onParamsChange={setUpscaleParams}
            />
          </>
        )}

        {/* Claude-style input card */}
        <div className="rounded-2xl border border-input bg-muted/30 overflow-hidden">
          {/* Uploaded image pills */}
          {uploadedImages.length > 0 && (
            <div className="flex items-center gap-2 px-4 pt-3 flex-wrap">
              {uploadedImages.map((image, index) => (
                <span
                  key={`${image.name}-${index}`}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1"
                >
                  <img
                    src={`data:${image.mimeType};base64,${image.base64}`}
                    alt={image.name}
                    className="h-4 w-4 rounded-sm object-cover"
                  />
                  {image.name}
                  {generationType === "text-to-image" && (
                    <button
                      type="button"
                      onClick={() => cycleImageRole(index)}
                      title="How this image is used — click to cycle: Auto / Subject / Style / Composition"
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        image.role !== "reference"
                          ? "bg-primary/15 text-primary"
                          : "bg-background/80 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ROLE_LABELS[image.role]}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onUploadedImagesChange((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {generationType === "text-to-image" && uploadedImages.length > 1 && (
                <span className="text-[10px] text-muted-foreground">
                  {uploadedImages.length}/{maxImages} references
                </span>
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isUpscale
                ? "Optional: describe desired enhancements..."
                : uploadedImages.length > 0
                  ? generationType === "text-to-image"
                    ? "Describe what to generate using the reference image(s)..."
                    : "Describe the motion or what to generate from this image..."
                  : "Describe what you want to generate..."
            }
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[200px] overflow-y-auto"
            rows={1}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left: attach */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                title="Attach image"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Right: model dropdown + send */}
            <div className="flex items-center gap-2">
              {isUpscale ? (
                <ModelMegaMenu
                  models={availableModels}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                />
              ) : (
                <Select value={selectedModel.id} onValueChange={handleModelChange}>
                  <SelectTrigger className="h-8 border-0 bg-transparent shadow-none text-xs text-muted-foreground hover:text-foreground gap-1 px-2 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 font-medium ${providerColors[model.provider] ?? ""}`}
                          >
                            {providerLabels[model.provider] ?? model.provider}
                          </Badge>
                          {model.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isUpscale ? uploadedImages.length === 0 : !content.trim()}
                className="h-8 w-8 shrink-0 aspect-square flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GenerationTypeButtons, providerColors, providerLabels } from "./generation-controls";
import { submitGeneration, getProject } from "@/lib/actions";
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
import type { Generation, UploadedImage, ReuseSettings } from "./create-view";

interface GenerationInputProps {
  projectId: string | null;
  generations: Generation[];
  onGenerationsUpdate: (generations: Generation[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  uploadedImage: UploadedImage | null;
  onUploadedImageChange: (image: UploadedImage | null) => void;
  reuseSettings?: ReuseSettings | null;
  onReuseSettingsConsumed?: () => void;
  promptToLoad?: string | null;
  onPromptToLoadConsumed?: () => void;
  onJobProgress?: (jobId: string, progress: number) => void;
}

export function GenerationInput({
  projectId,
  generations: currentGenerations,
  onGenerationsUpdate,
  isLoading,
  setIsLoading,
  uploadedImage,
  onUploadedImageChange,
  reuseSettings,
  onReuseSettingsConsumed,
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
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [seedanceTier, setSeedanceTier] = useState<string>(DEFAULT_SEEDANCE_TIER);
  const [seedanceResolution, setSeedanceResolution] = useState<string>(DEFAULT_SEEDANCE_RESOLUTION);
  const [scaleFactor, setScaleFactor] = useState<string>("2");
  const [upscaleParams, setUpscaleParams] = useState<Record<string, unknown>>(
    () => getDefaultUpscaleParams(getDefaultModel("image-upscale").id)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Auto-switch to image-to-video when an image is uploaded (unless already on an image-requiring type)
  useEffect(() => {
    if (uploadedImage && generationType !== "image-to-video" && generationType !== "image-upscale") {
      setGenerationType("image-to-video");
      setSelectedModel(getDefaultModel("image-to-video"));
    }
  }, [uploadedImage]);

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

  const handleGenerationTypeChange = (newType: GenerationType) => {
    setGenerationType(newType);
    const defaultModel = getDefaultModel(newType);
    setSelectedModel(defaultModel);
    if (newType === "image-upscale") {
      setUpscaleParams(getDefaultUpscaleParams(defaultModel.id));
    }
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
      if (!uploadedImage || isLoading) return;
    } else {
      if (!content.trim() || isLoading) return;
    }

    setIsLoading(true);
    const prompt = content;
    setContent("");

    try {
      let activeProjectId = projectId;

      if (!activeProjectId) {
        const response = await fetch("/api/projects", { method: "POST" });
        const data = await response.json();
        activeProjectId = data.id;
        router.push(`/create/${activeProjectId}`);
        await new Promise((r) => setTimeout(r, 100));
      }

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

      const result = await submitGeneration(
        activeProjectId!,
        prompt,
        selectedModel.provider,
        generationType,
        selectedModel.id,
        uploadFilePath,
        uploadMimeType,
        isUpscale ? parseInt(scaleFactor, 10) : undefined,
        isUpscale ? upscaleParams : undefined,
        (generationType === "text-to-video" || generationType === "image-to-video")
          ? (isSeedance ? seedanceResolution : aspectRatio)
          : undefined
      );

      onUploadedImageChange(null);

      await refreshProject(activeProjectId!);

      if (
        generationType === "text-to-video" ||
        generationType === "image-to-video" ||
        generationType === "image-upscale"
      ) {
        startPolling(result.jobId, activeProjectId!);
      }
    } catch (error) {
      console.error("Failed to submit generation:", error);
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
    <div className="border-b bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        <GenerationTypeButtons
          generationType={generationType}
          onGenerationTypeChange={handleGenerationTypeChange}
        />

        {(generationType === "text-to-video" || generationType === "image-to-video") && (
          isSeedance ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {SEEDANCE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSeedanceTierChange(tier.id)}
                    disabled={isLoading}
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
                  disabled={isLoading}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                    aspectRatio === ratio
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {ratio}
                </button>
              ))}
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
                  disabled={isLoading}
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
              disabled={isLoading}
            />
          </>
        )}

        {/* Claude-style input card */}
        <div className="rounded-2xl border border-input bg-muted/30 overflow-hidden">
          {/* Uploaded image pill */}
          {uploadedImage && (
            <div className="flex items-center gap-2 px-4 pt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                {uploadedImage.name}
                <button
                  type="button"
                  onClick={() => onUploadedImageChange(null)}
                  className="hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
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
                : uploadedImage
                  ? "Describe the motion or what to generate from this image..."
                  : "Describe what you want to generate..."
            }
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[200px] overflow-y-auto"
            rows={1}
            disabled={isLoading}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left: attach */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
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
                  disabled={isLoading}
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
                disabled={isUpscale ? (!uploadedImage || isLoading) : (!content.trim() || isLoading)}
                className="h-8 w-8 shrink-0 aspect-square flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { RotateCcw, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaThumbnailGrid } from "./media-thumbnail-grid";
import { GenerationDetails } from "./generation-details";
import { JobStatus } from "@/components/media/job-status";
import type { Generation, ReuseSettings } from "./create-view";

interface GenerationRowProps {
  generation: Generation;
  onReuse: (settings: ReuseSettings) => void;
  onUsePrompt: (prompt: string) => void;
  onAssetClick?: (assetId: string) => void;
  jobProgress?: Record<string, number>;
}

export function GenerationRow({ generation, onReuse, onUsePrompt, onAssetClick, jobProgress }: GenerationRowProps) {
  const outputAssets = generation.mediaAssets;
  const activeJobs = generation.generationJobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );
  const failedJobs = generation.generationJobs.filter(
    (j) => j.status === "failed"
  );
  const isGenerating = activeJobs.length > 0;

  const handleReuse = () => {
    onReuse({
      generationType: generation.generationType,
      provider: generation.provider,
      modelId: generation.model,
      prompt: generation.prompt,
      referenceImageUrl: generation.referenceImagePath ?? undefined,
      referenceImageMimeType: generation.referenceImageMimeType ?? undefined,
    });
  };

  return (
    <div className="group relative flex gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      {/* LEFT: Media thumbnail grid */}
      <div className="shrink-0">
        <MediaThumbnailGrid assets={outputAssets} isGenerating={isGenerating} onAssetClick={onAssetClick} />
      </div>

      {/* RIGHT: Generation details */}
      <div className="flex-1 min-w-0 space-y-2 py-1 pr-20">
        <GenerationDetails generation={generation} />

        {activeJobs.map((job) => (
          <JobStatus key={job.id} job={job} progress={jobProgress?.[job.id]} />
        ))}

        {failedJobs.map((job) => (
          <JobStatus key={job.id} job={job} />
        ))}
      </div>

      {/* Hover action buttons */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={handleReuse}
        >
          <RotateCcw className="h-3 w-3" />
          Reuse
        </Button>
        {generation.prompt && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => onUsePrompt(generation.prompt)}
          >
            <MessageSquareText className="h-3 w-3" />
            Prompt
          </Button>
        )}
      </div>
    </div>
  );
}

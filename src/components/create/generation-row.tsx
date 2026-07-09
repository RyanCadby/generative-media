"use client";

import { useState } from "react";
import { RotateCcw, RefreshCw, MessageSquareText, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaThumbnailGrid } from "./media-thumbnail-grid";
import { GenerationDetails } from "./generation-details";
import { JobStatus } from "@/components/media/job-status";
import type { Generation, ReuseSettings } from "./create-view";

interface GenerationRowProps {
  generation: Generation;
  onReuse: (settings: ReuseSettings) => void;
  onRerun: (generation: Generation) => void;
  onUsePrompt: (prompt: string) => void;
  onUseAsReference: (asset: { id: string; filePath: string; mimeType: string }) => void;
  onAssetClick?: (assetId: string) => void;
  jobProgress?: Record<string, number>;
}

export function GenerationRow({ generation, onReuse, onRerun, onUsePrompt, onUseAsReference, onAssetClick, jobProgress }: GenerationRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const outputAssets = generation.mediaAssets;
  const activeJobs = generation.generationJobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );
  const failedJobs = generation.generationJobs.filter(
    (j) => j.status === "failed"
  );
  const isGenerating = activeJobs.length > 0;
  const pendingCount =
    typeof generation.metadata?.numberOfImages === "number"
      ? generation.metadata.numberOfImages
      : 1;

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
    <div className="group relative flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      {/* Media thumbnails side by side */}
      <div className="flex-1 min-w-0 space-y-2">
        <MediaThumbnailGrid
          assets={outputAssets}
          isGenerating={isGenerating}
          pendingCount={pendingCount}
          onAssetClick={onAssetClick}
          onUseAsReference={onUseAsReference}
        />

        {activeJobs.map((job) => (
          <JobStatus key={job.id} job={job} progress={jobProgress?.[job.id]} />
        ))}

        {failedJobs.map((job) => (
          <JobStatus key={job.id} job={job} />
        ))}
      </div>

      {/* Right rail: details toggle always visible, actions on hover */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs text-muted-foreground"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <Info className="h-3 w-3" />
          Details
        </Button>
        <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Optimistic placeholder rows don't exist in the DB yet, so they can't be re-run */}
          {!generation.id.startsWith("optimistic-") && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => onRerun(generation)}
            >
              <RefreshCw className="h-3 w-3" />
              Re-run
            </Button>
          )}
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

      {/* Details panel — expands horizontally over the row from the right */}
      <div
        className={`absolute top-1 right-1 z-10 overflow-hidden transition-[width,opacity] duration-300 ease-out ${
          detailsOpen
            ? "w-[min(56rem,calc(100%-200px))] opacity-100"
            : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative min-h-[100px] max-h-[60vh] min-w-[300px] rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-4 pr-10 overflow-y-auto">
          <GenerationDetails generation={generation} />
          <button
            type="button"
            onClick={() => setDetailsOpen(false)}
            className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close details"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

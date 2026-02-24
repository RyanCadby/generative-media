"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, Copy, Check, SplitSquareHorizontal } from "lucide-react";
import { BeforeAfterSlider } from "./before-after-slider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  providerColors,
  providerLabels,
  generationTypeLabels,
} from "./generation-controls";
import { ALL_MODELS } from "@/lib/models";
import { UPSCALE_MODEL_PARAMS, getDefaultUpscaleParams } from "@/lib/upscale-params";
import type { Generation } from "./create-view";

export interface LightboxAsset {
  asset: Generation["mediaAssets"][number];
  generation: Generation;
}

interface MediaLightboxProps {
  items: LightboxAsset[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveModelName(modelId: string): string {
  const model = ALL_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
}

function getMetadataItems(
  generation: Generation
): { label: string; value: string }[] {
  const meta = generation.metadata;
  if (!meta) return [];

  const items: { label: string; value: string }[] = [];

  if (meta.scaleFactor !== undefined) {
    items.push({ label: "Scale", value: `${meta.scaleFactor}x` });
  }

  const descriptors = UPSCALE_MODEL_PARAMS[generation.model] ?? [];
  const defaults = getDefaultUpscaleParams(generation.model);

  for (const desc of descriptors) {
    const val = meta[desc.key];
    if (val === undefined || val === defaults[desc.key]) continue;

    if (desc.type === "toggle") {
      items.push({ label: desc.label, value: val ? "On" : "Off" });
    } else if (desc.type === "slider") {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      items.push({
        label: desc.label,
        value: desc.step >= 1 ? String(num) : num.toFixed(2),
      });
    } else {
      items.push({ label: desc.label, value: String(val) });
    }
  }

  return items;
}

export function MediaLightbox({
  items,
  initialIndex,
  open,
  onOpenChange,
}: MediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  const current = items[index];
  const hasMultiple = items.length > 1;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
    setCompareMode(false);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
    setCompareMode(false);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, goNext, goPrev, onOpenChange]);

  if (!current) return null;

  const { asset, generation } = current;
  const modelName = resolveModelName(generation.model);
  const metaItems = getMetadataItems(generation);
  const isUpscale =
    generation.generationType === "image-upscale" &&
    !!generation.referenceImagePath &&
    asset.type === "image";

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generation.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(asset.filePath)}`;
    const res = await fetch(proxyUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.id}.${asset.mimeType.split("/")[1] ?? "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => {
          // Close when clicking the dark backdrop area
          const target = e.target as HTMLElement;
          if (target.closest("[data-lightbox-panel]")) {
            e.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>
        <DialogDescription className="sr-only">
          View generated media with details
        </DialogDescription>

        <div
          data-lightbox-panel
          className="relative flex w-[95vw] max-w-7xl h-[90vh] bg-background rounded-xl overflow-hidden shadow-2xl"
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Main media area */}
          <div className="flex-1 relative flex items-center justify-center bg-black/95 min-w-0">
            {/* Nav arrows */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Compare toggle */}
            {isUpscale && (
              <button
                type="button"
                onClick={() => setCompareMode((v) => !v)}
                className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  compareMode
                    ? "bg-white text-black"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                Compare
              </button>
            )}

            {/* Media */}
            {compareMode && isUpscale ? (
              <BeforeAfterSlider
                key={`compare-${asset.id}`}
                beforeSrc={generation.referenceImagePath!}
                afterSrc={asset.filePath}
                afterAlt={asset.prompt}
              />
            ) : asset.type === "video" ? (
              <video
                key={asset.id}
                src={asset.filePath}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img
                key={asset.id}
                src={asset.filePath}
                alt={asset.prompt}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Counter */}
            {hasMultiple && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/60 bg-black/50 rounded-full px-2.5 py-1">
                {index + 1} / {items.length}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-[320px] shrink-0 border-l flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prompt
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy prompt"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-sm leading-relaxed">
                  {generation.prompt || (
                    <span className="text-muted-foreground italic">No prompt</span>
                  )}
                </p>
              </div>

              <Separator />

              {/* Model & Provider */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </h3>
                <div className="space-y-2.5">
                  <DetailRow label="Model" value={modelName} />
                  {asset.width && asset.height && (
                    <DetailRow
                      label="Resolution"
                      value={`${asset.width} × ${asset.height}`}
                    />
                  )}
                  <DetailRow
                    label="Provider"
                    value={
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 font-medium ${providerColors[generation.provider] ?? ""}`}
                      >
                        {providerLabels[generation.provider] ??
                          generation.provider}
                      </Badge>
                    }
                  />
                  <DetailRow
                    label="Type"
                    value={
                      generationTypeLabels[generation.generationType] ??
                      generation.generationType
                    }
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(generation.createdAt)}
                  />
                </div>
              </div>

              {/* Parameters */}
              {metaItems.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Parameters
                    </h3>
                    <div className="space-y-2.5">
                      {metaItems.map((item) => (
                        <DetailRow
                          key={item.label}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Reference image */}
              {generation.referenceImagePath && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reference Image
                    </h3>
                    <img
                      src={generation.referenceImagePath}
                      alt="Reference"
                      className="w-full rounded-md object-cover"
                    />
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}

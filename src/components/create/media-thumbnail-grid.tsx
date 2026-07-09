"use client";

import { Loader2, Play, Download, ImagePlus } from "lucide-react";

interface MediaAsset {
  id: string;
  type: "image" | "video";
  filePath: string;
  thumbnailPath?: string | null;
  mimeType: string;
  prompt: string;
}

interface MediaThumbnailGridProps {
  assets: MediaAsset[];
  isGenerating: boolean;
  /** Expected asset count while generating — renders that many loading tiles */
  pendingCount?: number;
  onAssetClick?: (assetId: string) => void;
  onUseAsReference?: (asset: MediaAsset) => void;
}

async function downloadAsset(asset: MediaAsset) {
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
}

function ThumbActions({
  asset,
  onUseAsReference,
}: {
  asset: MediaAsset;
  onUseAsReference?: (asset: MediaAsset) => void;
}) {
  return (
    <div className="absolute bottom-1 right-1 z-10 flex gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
      {asset.type === "image" && onUseAsReference && (
        <button
          type="button"
          className="h-6 w-6 flex items-center justify-center rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onUseAsReference(asset);
          }}
          title="Use as reference in prompt"
        >
          <ImagePlus className="h-3 w-3" />
        </button>
      )}
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          downloadAsset(asset);
        }}
        title="Download"
      >
        <Download className="h-3 w-3" />
      </button>
    </div>
  );
}

function MediaThumbnail({
  asset,
  onClick,
  onUseAsReference,
}: {
  asset: MediaAsset;
  onClick?: () => void;
  onUseAsReference?: (asset: MediaAsset) => void;
}) {
  const clickable = !!onClick;

  if (asset.type === "video") {
    return (
      <div
        className={`group/thumb relative w-full h-full ${clickable ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        <video
          src={asset.filePath}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-1.5">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        </div>
        <ThumbActions asset={asset} onUseAsReference={onUseAsReference} />
      </div>
    );
  }

  return (
    <div
      className={`group/thumb relative w-full h-full ${clickable ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <img
        src={asset.thumbnailPath ?? asset.filePath}
        alt={asset.prompt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <ThumbActions asset={asset} onUseAsReference={onUseAsReference} />
    </div>
  );
}

export function MediaThumbnailGrid({
  assets,
  isGenerating,
  pendingCount = 1,
  onAssetClick,
  onUseAsReference,
}: MediaThumbnailGridProps) {
  if (assets.length === 0 && isGenerating) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: Math.max(pendingCount, 1) }).map((_, i) => (
          <div
            key={i}
            className="w-[180px] h-[180px] rounded-md bg-muted flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="w-[180px] h-[180px] rounded-md overflow-hidden shrink-0"
        >
          <MediaThumbnail
            asset={asset}
            onClick={onAssetClick ? () => onAssetClick(asset.id) : undefined}
            onUseAsReference={onUseAsReference}
          />
        </div>
      ))}
    </div>
  );
}

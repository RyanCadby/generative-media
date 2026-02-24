"use client";

import { Loader2, Play, Download } from "lucide-react";

interface MediaAsset {
  id: string;
  type: "image" | "video";
  filePath: string;
  mimeType: string;
  prompt: string;
}

interface MediaThumbnailGridProps {
  assets: MediaAsset[];
  isGenerating: boolean;
  onAssetClick?: (assetId: string) => void;
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

function DownloadOverlay({ asset }: { asset: MediaAsset }) {
  return (
    <button
      type="button"
      className="absolute bottom-1 right-1 z-10 h-6 w-6 flex items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover/thumb:opacity-100 hover:bg-black/70 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        downloadAsset(asset);
      }}
      title="Download"
    >
      <Download className="h-3 w-3" />
    </button>
  );
}

function MediaThumbnail({
  asset,
  onClick,
}: {
  asset: MediaAsset;
  onClick?: () => void;
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
        <DownloadOverlay asset={asset} />
      </div>
    );
  }

  return (
    <div
      className={`group/thumb relative w-full h-full ${clickable ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <img
        src={asset.filePath}
        alt={asset.prompt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <DownloadOverlay asset={asset} />
    </div>
  );
}

export function MediaThumbnailGrid({
  assets,
  isGenerating,
  onAssetClick,
}: MediaThumbnailGridProps) {
  if (assets.length === 0 && isGenerating) {
    return (
      <div className="w-[180px] h-[180px] rounded-md bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assets.length === 0) return null;

  if (assets.length === 1) {
    return (
      <div className="w-[180px] h-[180px] rounded-md overflow-hidden">
        <MediaThumbnail
          asset={assets[0]}
          onClick={onAssetClick ? () => onAssetClick(assets[0].id) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 w-[180px] h-[180px]">
      {assets.slice(0, 4).map((asset) => (
        <div key={asset.id} className="rounded-sm overflow-hidden">
          <MediaThumbnail
            asset={asset}
            onClick={
              onAssetClick ? () => onAssetClick(asset.id) : undefined
            }
          />
        </div>
      ))}
    </div>
  );
}

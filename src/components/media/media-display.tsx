"use client";

interface MediaDisplayProps {
  asset: {
    id: string;
    type: "image" | "video";
    filePath: string;
    mimeType: string;
    prompt: string;
  };
}

export function MediaDisplay({ asset }: MediaDisplayProps) {
  if (asset.type === "image") {
    return (
      <div className="rounded-md overflow-hidden">
        <img
          src={asset.filePath}
          alt={asset.prompt}
          className="max-w-full h-auto rounded-md"
          loading="lazy"
        />
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="rounded-md overflow-hidden">
        <video
          src={asset.filePath}
          controls
          className="max-w-full h-auto rounded-md"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return null;
}

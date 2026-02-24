"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerationRow } from "./generation-row";
import { MediaLightbox, type LightboxAsset } from "./media-lightbox";
import type { Generation, ReuseSettings } from "./create-view";

interface GenerationFeedProps {
  generations: Generation[];
  onReuse: (settings: ReuseSettings) => void;
  onUsePrompt: (prompt: string) => void;
  jobProgress?: Record<string, number>;
}

export function GenerationFeed({ generations, onReuse, onUsePrompt, jobProgress }: GenerationFeedProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generations.length]);

  // Flatten all assets with their parent generation for the lightbox
  const allLightboxItems = useMemo<LightboxAsset[]>(() => {
    const items: LightboxAsset[] = [];
    for (const gen of generations) {
      for (const asset of gen.mediaAssets) {
        items.push({ asset, generation: gen });
      }
    }
    return items;
  }, [generations]);

  const handleAssetClick = useCallback(
    (assetId: string) => {
      const idx = allLightboxItems.findIndex((item) => item.asset.id === assetId);
      if (idx >= 0) {
        setLightboxIndex(idx);
        setLightboxOpen(true);
      }
    },
    [allLightboxItems]
  );

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="py-4 px-6 space-y-1">
          <div ref={topRef} />
          {generations.map((generation) => (
            <GenerationRow
              key={generation.id}
              generation={generation}
              onReuse={onReuse}
              onUsePrompt={onUsePrompt}
              onAssetClick={handleAssetClick}
              jobProgress={jobProgress}
            />
          ))}
        </div>
      </ScrollArea>

      <MediaLightbox
        items={allLightboxItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}

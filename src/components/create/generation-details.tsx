"use client";

import { Badge } from "@/components/ui/badge";
import {
  providerColors,
  providerLabels,
  generationTypeLabels,
} from "./generation-controls";
import { ALL_MODELS } from "@/lib/models";
import { UPSCALE_MODEL_PARAMS, getDefaultUpscaleParams } from "@/lib/upscale-params";
import type { Generation } from "./create-view";

interface GenerationDetailsProps {
  generation: Generation;
}

function getModelName(modelId: string): string {
  const model = ALL_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
}

/** Returns label → display value pairs for non-default metadata params */
function getMetadataDisplay(
  generation: Generation
): { label: string; value: string }[] {
  const meta = generation.metadata;
  if (!meta) return [];

  const items: { label: string; value: string }[] = [];

  // Scale factor
  if (meta.scaleFactor !== undefined) {
    items.push({ label: "Scale", value: `${meta.scaleFactor}x` });
  }

  // Get param descriptors for this model to find labels and defaults
  const descriptors = UPSCALE_MODEL_PARAMS[generation.model] ?? [];
  const defaults = getDefaultUpscaleParams(generation.model);

  for (const desc of descriptors) {
    const val = meta[desc.key];
    if (val === undefined) continue;
    // Skip values that match the default
    if (val === defaults[desc.key]) continue;

    // Format the display value
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

export function GenerationDetails({ generation }: GenerationDetailsProps) {
  const modelName = getModelName(generation.model);
  const metaItems = getMetadataDisplay(generation);

  // Get dimensions from the first asset that has them
  const assetWithDims = generation.mediaAssets.find((a) => a.width && a.height);
  const dimensionStr = assetWithDims
    ? `${assetWithDims.width} × ${assetWithDims.height}`
    : null;

  return (
    <div className="space-y-2">
      {generation.prompt && (
        <p className="text-sm text-foreground line-clamp-3">
          {generation.prompt}
        </p>
      )}

      {generation.referenceImagePath && (
        <div className="flex items-center gap-2">
          <img
            src={generation.referenceImagePath}
            alt="Reference"
            className="w-8 h-8 rounded-sm object-cover"
          />
          <span className="text-xs text-muted-foreground">Reference</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 font-medium ${providerColors[generation.provider] ?? ""}`}
        >
          {providerLabels[generation.provider] ?? generation.provider}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {generationTypeLabels[generation.generationType] ?? generation.generationType}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {modelName}
        </Badge>
      </div>

      {(metaItems.length > 0 || dimensionStr) && (
        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] text-muted-foreground">
          {dimensionStr && (
            <span>
              Resolution: <span className="text-foreground">{dimensionStr}</span>
            </span>
          )}
          {metaItems.map((item) => (
            <span key={item.label}>
              {item.label}: <span className="text-foreground">{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

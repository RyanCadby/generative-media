"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GenerationType } from "@/lib/providers/types";

export const providerColors: Record<string, string> = {
  gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  runway: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  together: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  topaz: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

export const providerLabels: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  runway: "Runway",
  together: "Together",
  topaz: "Topaz",
};

export const generationTypeLabels: Record<string, string> = {
  "text-to-image": "Text to Image",
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
  "image-upscale": "Image Upscale",
};

const generationTypes: { value: GenerationType; label: string }[] = [
  { value: "text-to-image", label: "Text to Image" },
  { value: "text-to-video", label: "Text to Video" },
  { value: "image-to-video", label: "Image to Video" },
  { value: "image-upscale", label: "Image Upscale" },
];

interface GenerationTypeButtonsProps {
  generationType: GenerationType;
  onGenerationTypeChange: (value: GenerationType) => void;
}

export function GenerationTypeButtons({
  generationType,
  onGenerationTypeChange,
}: GenerationTypeButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {generationTypes.map((type) => {
        const isActive = generationType === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onGenerationTypeChange(type.value)}
            className={`relative flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {isActive && <Check className="h-3 w-3 text-green-400" />}
            {type.label}
          </button>
        );
      })}
    </div>
  );
}

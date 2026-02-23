"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { GenerationType } from "@/lib/providers/types";
import { getModelsByType, type ModelDefinition } from "@/lib/models";

interface GenerationControlsProps {
  generationType: GenerationType;
  selectedModelId: string;
  onGenerationTypeChange: (value: GenerationType) => void;
  onModelChange: (model: ModelDefinition) => void;
}

const providerColors: Record<string, string> = {
  gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  runway: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  together: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function GenerationControls({
  generationType,
  selectedModelId,
  onGenerationTypeChange,
  onModelChange,
}: GenerationControlsProps) {
  const availableModels = getModelsByType(generationType);

  const handleModelChange = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) onModelChange(model);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={generationType} onValueChange={onGenerationTypeChange}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text-to-image">Text to Image</SelectItem>
          <SelectItem value="text-to-video">Text to Video</SelectItem>
          <SelectItem value="image-to-video">Image to Video</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedModelId} onValueChange={handleModelChange}>
        <SelectTrigger className="w-[220px] h-8 text-xs">
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
                  {model.provider === "gemini" ? "Gemini" : model.provider === "runway" ? "Runway" : model.provider === "together" ? "Together" : "OpenAI"}
                </Badge>
                {model.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

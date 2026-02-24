"use client";

import { useState } from "react";
import { ChevronDown, Check, Sparkles, Layers } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ModelDefinition } from "@/lib/models";

interface ModelMegaMenuProps {
  models: ModelDefinition[];
  selectedModel: ModelDefinition;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

const categoryMeta: Record<string, { label: string; icon: typeof Sparkles; description: string }> = {
  Enhance: {
    label: "Enhance",
    icon: Layers,
    description: "Standard upscaling — fast, predictable results",
  },
  Generative: {
    label: "Generative",
    icon: Sparkles,
    description: "AI-powered — adds realistic detail",
  },
};

export function ModelMegaMenu({
  models,
  selectedModel,
  onModelChange,
  disabled,
}: ModelMegaMenuProps) {
  const [open, setOpen] = useState(false);

  const grouped = models.reduce<Record<string, ModelDefinition[]>>(
    (acc, model) => {
      const cat = model.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(model);
      return acc;
    },
    {}
  );

  const categoryOrder = ["Enhance", "Generative", "Other"];
  const sortedCategories = categoryOrder.filter((c) => grouped[c]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1 h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {selectedModel.name}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[380px] p-0"
      >
        <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
          {sortedCategories.map((category) => {
            const meta = categoryMeta[category];
            const Icon = meta?.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  {Icon && (
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta?.label ?? category}
                  </span>
                </div>
                {meta?.description && (
                  <p className="text-[11px] text-muted-foreground/70 px-1 mb-2">
                    {meta.description}
                  </p>
                )}
                <div className="space-y-0.5">
                  {grouped[category].map((model) => {
                    const isSelected = model.id === selectedModel.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onModelChange(model.id);
                          setOpen(false);
                        }}
                        className={`w-full text-left rounded-md px-2.5 py-2 transition-colors ${
                          isSelected
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {model.name}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            {model.detailedDescription && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {model.detailedDescription}
                              </p>
                            )}
                            {model.bestFor && (
                              <p className="text-[11px] text-muted-foreground/70 mt-1">
                                Best for: {model.bestFor}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

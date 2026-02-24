"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UPSCALE_MODEL_PARAMS,
  type ParamDescriptor,
  type SliderParam,
  type SelectParam,
} from "@/lib/upscale-params";

interface UpscaleParamsPanelProps {
  modelId: string;
  params: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function UpscaleParamsPanel({
  modelId,
  params,
  onParamsChange,
  disabled,
}: UpscaleParamsPanelProps) {
  const [open, setOpen] = useState(false);
  const descriptors = UPSCALE_MODEL_PARAMS[modelId];

  if (!descriptors || descriptors.length === 0) return null;

  const update = (key: string, value: unknown) => {
    onParamsChange({ ...params, [key]: value });
  };

  const faceEnabled = !!params.face_enhancement;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        Advanced Settings
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
          {descriptors.map((desc) => {
            // Hide face sub-params when face_enhancement is off
            if (
              (desc.key === "face_enhancement_strength" ||
                desc.key === "face_enhancement_creativity") &&
              !faceEnabled
            ) {
              return null;
            }

            return (
              <ParamControl
                key={desc.key}
                descriptor={desc}
                value={params[desc.key]}
                onChange={(v) => update(desc.key, v)}
                disabled={disabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParamControl({
  descriptor,
  value,
  onChange,
  disabled,
}: {
  descriptor: ParamDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  switch (descriptor.type) {
    case "toggle":
      return (
        <ToggleControl
          label={descriptor.label}
          value={!!value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "slider":
      return (
        <SliderControl
          descriptor={descriptor}
          value={typeof value === "number" ? value : descriptor.default}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "select":
      return (
        <SelectControl
          descriptor={descriptor}
          value={typeof value === "string" ? value : descriptor.default}
          onChange={onChange}
          disabled={disabled}
        />
      );
  }
}

function ToggleControl({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
          value
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        } disabled:opacity-50`}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

function SliderControl({
  descriptor,
  value,
  onChange,
  disabled,
}: {
  descriptor: SliderParam;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const isInteger = descriptor.step >= 1;
  const displayValue = isInteger ? value : value.toFixed(2);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {descriptor.label}
        </span>
        <span className="text-xs tabular-nums text-foreground">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={descriptor.min}
        max={descriptor.max}
        step={descriptor.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-50 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm"
      />
    </div>
  );
}

function SelectControl({
  descriptor,
  value,
  onChange,
  disabled,
}: {
  descriptor: SelectParam;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        {descriptor.label}
      </span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-6 w-auto min-w-[100px] border-0 bg-muted text-xs px-2 focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {descriptor.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

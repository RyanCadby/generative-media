export type ParamType = "slider" | "toggle" | "select";

interface BaseParam {
  key: string; // maps directly to Topaz API field name
  label: string;
  type: ParamType;
}

export interface SliderParam extends BaseParam {
  type: "slider";
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ToggleParam extends BaseParam {
  type: "toggle";
  default: boolean;
}

export interface SelectParam extends BaseParam {
  type: "select";
  options: { value: string; label: string }[];
  default: string;
}

export type ParamDescriptor = SliderParam | ToggleParam | SelectParam;

// Shared parameter sets
const FACE_PARAMS: ParamDescriptor[] = [
  { key: "face_enhancement", label: "Face Enhancement", type: "toggle", default: false },
  { key: "face_enhancement_strength", label: "Face Strength", type: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
  { key: "face_enhancement_creativity", label: "Face Creativity", type: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
];

const SUBJECT_DETECTION: ParamDescriptor = {
  key: "subject_detection",
  label: "Subject Detection",
  type: "select",
  options: [
    { value: "All", label: "All" },
    { value: "Foreground", label: "Foreground" },
    { value: "Background", label: "Background" },
  ],
  default: "All",
};

const STANDARD_ENHANCE_PARAMS: ParamDescriptor[] = [
  ...FACE_PARAMS,
  SUBJECT_DETECTION,
  { key: "sharpen", label: "Sharpen", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
  { key: "denoise", label: "Denoise", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
  { key: "fix_compression", label: "Fix Compression", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
];

export const UPSCALE_MODEL_PARAMS: Record<string, ParamDescriptor[]> = {
  "Standard V2": STANDARD_ENHANCE_PARAMS,
  "High Fidelity V2": STANDARD_ENHANCE_PARAMS,
  "Low Resolution V2": STANDARD_ENHANCE_PARAMS,

  // CGI: same as standard but no fix_compression
  "CGI": [
    ...FACE_PARAMS,
    SUBJECT_DETECTION,
    { key: "sharpen", label: "Sharpen", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
    { key: "denoise", label: "Denoise", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
  ],

  // Text Refine: standard + strength
  "Text Refine": [
    ...STANDARD_ENHANCE_PARAMS,
    { key: "strength", label: "Strength", type: "slider", min: 0.01, max: 1, step: 0.01, default: 0.5 },
  ],

  // Generative: Redefine
  "Redefine": [
    { key: "creativity", label: "Creativity", type: "slider", min: 1, max: 6, step: 1, default: 3 },
    { key: "texture", label: "Texture", type: "slider", min: 1, max: 5, step: 1, default: 3 },
    { key: "sharpen", label: "Sharpen", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
    { key: "denoise", label: "Denoise", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
  ],

  // Generative: Recovery V2
  "Recovery V2": [
    ...FACE_PARAMS,
    SUBJECT_DETECTION,
    { key: "detail", label: "Detail", type: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
  ],

  // No configurable parameters
  "Standard MAX": [],
  "Wonder": [],
};

export function getDefaultUpscaleParams(modelId: string): Record<string, unknown> {
  const descriptors = UPSCALE_MODEL_PARAMS[modelId] ?? [];
  const defaults: Record<string, unknown> = {};
  for (const d of descriptors) {
    defaults[d.key] = d.default;
  }
  return defaults;
}

import type { ProviderName, GenerationType } from "./providers/types";

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ProviderName;
  generationType: GenerationType;
  description: string;
  detailedDescription?: string;
  bestFor?: string;
  category?: string;
}

export const IMAGE_MODELS: ModelDefinition[] = [
  {
    id: "imagen-4.0-generate-001",
    name: "Imagen 4.0",
    provider: "gemini",
    generationType: "text-to-image",
    description: "Flagship image model, high quality",
  },
  {
    id: "imagen-4.0-fast-generate-001",
    name: "Imagen 4.0 Fast",
    provider: "gemini",
    generationType: "text-to-image",
    description: "Optimized for speed",
  },
  {
    id: "imagen-4.0-ultra-generate-001",
    name: "Imagen 4.0 Ultra",
    provider: "gemini",
    generationType: "text-to-image",
    description: "Highest prompt adherence",
  },
  {
    id: "imagen-3.0-generate-002",
    name: "Imagen 3.0",
    provider: "gemini",
    generationType: "text-to-image",
    description: "Previous generation, still available",
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    provider: "openai",
    generationType: "text-to-image",
    description: "Flagship GPT image model, up to 3840x2160",
  },
  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    provider: "openai",
    generationType: "text-to-image",
    description: "Previous flagship GPT image model",
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    generationType: "text-to-image",
    description: "GPT-native image generation",
  },
  {
    id: "gpt-image-1-mini",
    name: "GPT Image 1 Mini",
    provider: "openai",
    generationType: "text-to-image",
    description: "Lightweight, faster GPT image generation",
  },
  {
    id: "gen4_image",
    name: "Gen-4 Image",
    provider: "runway",
    generationType: "text-to-image",
    description: "Runway Gen-4 image generation",
  },
  {
    id: "gen4_image_turbo",
    name: "Gen-4 Image Turbo",
    provider: "runway",
    generationType: "text-to-image",
    description: "Fast Runway Gen-4 image generation",
  },
];

export const VIDEO_MODELS: ModelDefinition[] = [
  {
    id: "veo-3.1-generate-preview",
    name: "Veo 3.1",
    provider: "gemini",
    generationType: "text-to-video",
    description: "Latest Google video model, highest quality",
  },
  {
    id: "veo-3.1-fast-generate-preview",
    name: "Veo 3.1 Fast",
    provider: "gemini",
    generationType: "text-to-video",
    description: "Faster Veo 3.1 variant",
  },
  {
    id: "veo-3.1-lite-generate-preview",
    name: "Veo 3.1 Lite",
    provider: "gemini",
    generationType: "text-to-video",
    description: "High-efficiency, low-cost Veo 3.1 variant",
  },
  {
    id: "veo-2.0-generate-001",
    name: "Veo 2.0",
    provider: "gemini",
    generationType: "text-to-video",
    description: "Previous generation, stable",
  },
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "openai",
    generationType: "text-to-video",
    description: "Fast video generation, up to 12s",
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "openai",
    generationType: "text-to-video",
    description: "Higher quality, longer videos",
  },
  {
    id: "ByteDance/Seedance-1.0-pro",
    name: "Seedance 1.0 Pro",
    provider: "together",
    generationType: "text-to-video",
    description: "ByteDance cinematic video, 1080p",
  },
  {
    id: "ByteDance/Seedance-1.0-lite",
    name: "Seedance 1.0 Lite",
    provider: "together",
    generationType: "text-to-video",
    description: "Fast ByteDance video generation",
  },
  {
    id: "Wan-AI/Wan2.2-T2V-A14B",
    name: "Wan 2.2 T2V",
    provider: "together",
    generationType: "text-to-video",
    description: "Wan text-to-video with audio",
  },
];

// Image-to-video includes all video models plus Runway image-to-video-only models
export const IMAGE_TO_VIDEO_MODELS: ModelDefinition[] = [
  ...VIDEO_MODELS.map((m) => ({
    ...m,
    generationType: "image-to-video" as GenerationType,
  })),
  {
    id: "gen4_turbo",
    name: "Gen-4 Turbo",
    provider: "runway",
    generationType: "image-to-video" as GenerationType,
    description: "Runway Gen-4 Turbo, image-to-video",
  },
  {
    id: "kwaivgI/kling-2.1-master",
    name: "Kling 2.1 Master",
    provider: "together",
    generationType: "image-to-video" as GenerationType,
    description: "Top-tier Kling model, highest quality",
  },
  {
    id: "kwaivgI/kling-2.1-pro",
    name: "Kling 2.1 Pro",
    provider: "together",
    generationType: "image-to-video" as GenerationType,
    description: "High quality Kling video generation",
  },
  {
    id: "kwaivgI/kling-2.1-standard",
    name: "Kling 2.1 Standard",
    provider: "together",
    generationType: "image-to-video" as GenerationType,
    description: "Fast Kling video generation",
  },
  {
    id: "Wan-AI/Wan2.2-I2V-A14B",
    name: "Wan 2.2 I2V",
    provider: "together",
    generationType: "image-to-video" as GenerationType,
    description: "Wan image-to-video with audio",
  },
];

export const UPSCALE_MODELS: ModelDefinition[] = [
  // Gigapixel (Precision tier) — improve resolution, preserve source characteristics
  {
    id: "Standard V2",
    name: "Gigapixel: Standard 2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "General-purpose enhancement",
    detailedDescription:
      "Balances detail, sharpness, and noise reduction across a wide range of image types. The best starting point for most images.",
    bestFor: "Most images — photos, screenshots, mixed content",
    category: "Gigapixel",
  },
  {
    id: "High Fidelity V2",
    name: "Gigapixel: High Fidelity 2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Professional photography detail",
    detailedDescription:
      "Preserves intricate details in already-sharp professional photography. Ideal when you need pixel-perfect upscaling without artifacts.",
    bestFor: "High-quality photos, professional photography",
    category: "Gigapixel",
  },
  {
    id: "Low Resolution V2",
    name: "Gigapixel: Low Resolution 2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Web graphics and screenshots",
    detailedDescription:
      "Enhances clarity and detail in low-resolution images like web graphics, screenshots, and compressed digital assets.",
    bestFor: "Web images, screenshots, compressed JPEGs",
    category: "Gigapixel",
  },
  {
    id: "CGI",
    name: "Gigapixel: Art & CGI",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Digital art and 3D renders",
    detailedDescription:
      "Optimized for CGI and digital illustrations, enhancing texture and detail in computer-generated images without introducing unwanted artifacts.",
    bestFor: "3D renders, digital art, AI-generated images",
    category: "Gigapixel",
  },
  {
    id: "Text Refine",
    name: "Gigapixel: Text & Shapes",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Text and shape clarity",
    detailedDescription:
      "Designed for images with text and shapes, enhancing clarity and sharpness of typographic and geometric elements.",
    bestFor: "Documents, signage, logos, UI screenshots",
    category: "Gigapixel",
  },

  // Wonder (Generative tier) — add detail and texture while preserving intent
  {
    id: "Standard MAX",
    name: "Wonder: Standard Max",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Photorealistic enhancement",
    detailedDescription:
      "Delivers photorealistic enhancement with clean, natural results. Excels with low-resolution inputs, producing professional-grade output.",
    bestFor: "Low-res photos needing realistic detail",
    category: "Wonder",
  },
  {
    id: "Wonder 2",
    name: "Wonder: Wonder 2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Updated all-purpose generative upscale",
    detailedDescription:
      "Topaz's current default generative upscaler. Stronger detail generation than Wonder v1 across a wide range of input quality.",
    bestFor: "Most images — modern default generative upscale",
    category: "Wonder",
  },
  {
    id: "Wonder 3",
    name: "Wonder: Wonder 3",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Most advanced realism upscaler",
    detailedDescription:
      "Topaz's newest generative upscaler. Improves on Wonder 2 with more natural detail, fewer plastic artifacts, and selectable Low/Medium/High enhancement levels.",
    bestFor: "Portraits, wildlife, and complex textures where realism matters",
    category: "Wonder",
  },
  {
    id: "Redefine",
    name: "Wonder: Redefine",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Prompt-driven creative upscaling",
    detailedDescription:
      "Generative enhancement with prompt-based control. Lower creativity values stay faithful to the source; higher values introduce more interpretive detail.",
    bestFor: "AI art, blurry photos, creative enhancement",
    category: "Wonder",
  },
  {
    id: "Recover 3",
    name: "Wonder: Recover 3",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Heavy degradation recovery",
    detailedDescription:
      "Restores heavily degraded or damaged source images. Successor to Recovery V2 with improved fidelity and detail reconstruction.",
    bestFor: "Severely degraded photos, archival scans, heavy compression",
    category: "Wonder",
  },
  {
    id: "Wonder",
    name: "Wonder: Wonder",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Legacy all-purpose quality boost",
    detailedDescription:
      "Original Wonder model. Wonder 2 is the current recommended replacement, but Wonder remains available for reproducing earlier results.",
    bestFor: "Reproducing prior Wonder outputs",
    category: "Wonder",
  },
  {
    id: "Recovery V2",
    name: "Wonder: Recovery V2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Legacy extreme low-res recovery",
    detailedDescription:
      "Previous-generation recovery model. Recover 3 is the recommended successor, but Recovery V2 remains available.",
    bestFor: "Tiny thumbnails, severely degraded photos (legacy)",
    category: "Wonder",
  },

  // Bloom (Creative tier) — transform with new, creative detail or stylization
  {
    id: "Bloom",
    name: "Bloom: Bloom Creative",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Generative enlargement for AI art",
    detailedDescription:
      "Enlarges AI-generated artwork up to 8× while creatively introducing new detail, texture, and visual elements. Accepts a prompt to guide the result.",
    bestFor: "AI-generated artwork, illustrations needing creative detail",
    category: "Bloom",
  },
  {
    id: "Bloom Realism",
    name: "Bloom: Bloom Realism",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Realistic enhancement for AI art",
    detailedDescription:
      "Removes the plastic, artificial feel of AI-generated images by restoring natural detail and texture across skin, hair, fabrics, and other materials.",
    bestFor: "AI-generated portraits and photoreal scenes",
    category: "Bloom",
  },
];

export const ALL_MODELS: ModelDefinition[] = [
  ...IMAGE_MODELS,
  ...VIDEO_MODELS,
  ...IMAGE_TO_VIDEO_MODELS,
  ...UPSCALE_MODELS,
];

export function getModelsByType(
  generationType: GenerationType
): ModelDefinition[] {
  switch (generationType) {
    case "text-to-image":
      return IMAGE_MODELS;
    case "text-to-video":
      return VIDEO_MODELS;
    case "image-to-video":
      return IMAGE_TO_VIDEO_MODELS;
    case "image-upscale":
      return UPSCALE_MODELS;
  }
}

export function getModelById(
  modelId: string,
  generationType: GenerationType
): ModelDefinition | undefined {
  return getModelsByType(generationType).find((m) => m.id === modelId);
}

export function getDefaultModel(
  generationType: GenerationType
): ModelDefinition {
  return getModelsByType(generationType)[0];
}

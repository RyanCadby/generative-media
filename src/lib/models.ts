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
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    generationType: "text-to-image",
    description: "GPT-native image generation",
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
  // Enhance (Standard) models
  {
    id: "Standard V2",
    name: "Standard V2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "General-purpose enhancement",
    detailedDescription:
      "Balances detail, sharpness, and noise reduction across a wide range of image types. The best starting point for most images.",
    bestFor: "Most images — photos, screenshots, mixed content",
    category: "Enhance",
  },
  {
    id: "High Fidelity V2",
    name: "High Fidelity V2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Professional photography detail",
    detailedDescription:
      "Preserves intricate details in already-sharp professional photography. Ideal when you need pixel-perfect upscaling without artifacts.",
    bestFor: "High-quality photos, professional photography",
    category: "Enhance",
  },
  {
    id: "Low Resolution V2",
    name: "Low Resolution V2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Web graphics and screenshots",
    detailedDescription:
      "Enhances clarity and detail in low-resolution images like web graphics, screenshots, and compressed digital assets.",
    bestFor: "Web images, screenshots, compressed JPEGs",
    category: "Enhance",
  },
  {
    id: "CGI",
    name: "CGI",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Digital art and 3D renders",
    detailedDescription:
      "Optimized for CGI and digital illustrations, enhancing texture and detail in computer-generated images without introducing unwanted artifacts.",
    bestFor: "3D renders, digital art, AI-generated images",
    category: "Enhance",
  },
  {
    id: "Text Refine",
    name: "Text Refine",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Text and shape clarity",
    detailedDescription:
      "Designed for images with text and shapes, enhancing clarity and sharpness of typographic and geometric elements.",
    bestFor: "Documents, signage, logos, UI screenshots",
    category: "Enhance",
  },
  // Enhance Generative models
  {
    id: "Standard MAX",
    name: "Standard MAX",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Photorealistic enhancement",
    detailedDescription:
      "Delivers photorealistic enhancement with clean, natural results. Excels with low-resolution inputs, producing professional-grade output.",
    bestFor: "Low-res photos needing realistic detail",
    category: "Generative",
  },
  {
    id: "Recovery V2",
    name: "Recovery V2",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Extreme low-res recovery",
    detailedDescription:
      "High fidelity upscaling for extremely low-resolution images. Preserves natural detail and sharpness even from heavily degraded sources.",
    bestFor: "Tiny thumbnails, severely degraded photos",
    category: "Generative",
  },
  {
    id: "Redefine",
    name: "Redefine",
    provider: "topaz",
    generationType: "image-upscale",
    description: "Creative upscaling",
    detailedDescription:
      "Elevates creativity with realistic upscaling, balancing fidelity and creative detail. Great for low-resolution, blurry, and AI-generated images.",
    bestFor: "AI art, blurry photos, creative enhancement",
    category: "Generative",
  },
  {
    id: "Wonder",
    name: "Wonder",
    provider: "topaz",
    generationType: "image-upscale",
    description: "All-purpose quality boost",
    detailedDescription:
      "Exceptional outputs across all different types of input quality. A streamlined option for professionals who want great results without parameter tuning.",
    bestFor: "Any image — simple, reliable quality improvement",
    category: "Generative",
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

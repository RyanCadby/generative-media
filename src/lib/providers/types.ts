export type ProviderName = "gemini" | "openai" | "runway" | "together" | "topaz";
export type GenerationType = "text-to-image" | "text-to-video" | "image-to-video" | "image-upscale";

export interface ImageGenerationOptions {
  modelId?: string;
  aspectRatio?: string;
  quality?: string;
  numberOfImages?: number;
}

export interface VideoGenerationOptions {
  modelId?: string;
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  imageUrl?: string;
}

export interface UpscaleOptions {
  modelId?: string;
  scaleFactor?: number;
  outputWidth?: number;
  outputHeight?: number;
  // Standard Enhance params
  face_enhancement?: boolean;
  face_enhancement_strength?: number;
  face_enhancement_creativity?: number;
  subject_detection?: "Foreground" | "Background" | "All";
  sharpen?: number;
  denoise?: number;
  fix_compression?: number;
  // Text Refine
  strength?: number;
  // Redefine (generative)
  creativity?: number;
  texture?: number;
  prompt?: string;
  autoprompt?: boolean;
  // Recovery V2
  detail?: number;
  // Allow additional params without interface updates
  [key: string]: unknown;
}

export interface ImageResult {
  base64: string;
  mimeType: string;
}

export interface VideoJobResult {
  jobId: string;
}

export interface VideoJobStatus {
  status: "processing" | "completed" | "failed";
  videoBuffer?: Buffer;
  mimeType?: string;
  error?: string;
  progress?: number;
}

export interface GenerationProvider {
  name: ProviderName;

  generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult>;

  generateVideo(
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult>;

  imageToVideo(
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult>;

  checkVideoJob(jobId: string): Promise<VideoJobStatus>;

  upscaleImage?(
    imageBase64: string,
    imageMimeType: string,
    options?: UpscaleOptions
  ): Promise<VideoJobResult>;
}

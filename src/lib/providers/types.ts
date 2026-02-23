export type ProviderName = "gemini" | "openai" | "runway" | "together";
export type GenerationType = "text-to-image" | "text-to-video" | "image-to-video";

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
}

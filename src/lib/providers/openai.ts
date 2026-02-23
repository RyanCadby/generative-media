import OpenAI from "openai";
import type {
  GenerationProvider,
  ImageGenerationOptions,
  ImageResult,
  VideoGenerationOptions,
  VideoJobResult,
  VideoJobStatus,
} from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function mapAspectRatioToSize(
  aspectRatio?: string
): "1024x1024" | "1536x1024" | "1024x1536" {
  switch (aspectRatio) {
    case "16:9":
      return "1536x1024";
    case "9:16":
      return "1024x1536";
    default:
      return "1024x1024";
  }
}

type VideoSize = "1280x720" | "720x1280" | "1024x1792" | "1792x1024";
type VideoSeconds = "4" | "8" | "12";

function mapAspectRatioToVideoSize(aspectRatio?: string): VideoSize {
  switch (aspectRatio) {
    case "9:16":
      return "720x1280";
    default:
      return "1280x720";
  }
}

function mapDurationToSeconds(duration?: number): VideoSeconds {
  if (duration && duration >= 10) return "12";
  if (duration && duration >= 6) return "8";
  return "8";
}

export const openaiProvider: GenerationProvider = {
  name: "openai",

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const result = await openai.images.generate({
      model: options?.modelId ?? "gpt-image-1",
      prompt,
      size: mapAspectRatioToSize(options?.aspectRatio),
      quality: (options?.quality as "low" | "medium" | "high") ?? "medium",
      n: 1,
    });

    const imageData = result.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error("OpenAI image generation returned no image data");
    }

    return {
      base64: imageData,
      mimeType: "image/png",
    };
  },

  async generateVideo(
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const videoModel = (options?.modelId ?? "sora-2") as "sora-2" | "sora-2-pro";
    const video = await openai.videos.create({
      model: videoModel,
      prompt,
      size: mapAspectRatioToVideoSize(options?.aspectRatio),
      seconds: mapDurationToSeconds(options?.durationSeconds),
    });

    return { jobId: video.id };
  },

  async imageToVideo(
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    // Convert base64 to a File object for the input_reference
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const ext = imageMimeType.includes("png") ? "png" : "jpg";
    const file = new File([imageBuffer], `input.${ext}`, {
      type: imageMimeType,
    });

    const videoModel = (options?.modelId ?? "sora-2") as "sora-2" | "sora-2-pro";
    const video = await openai.videos.create({
      model: videoModel,
      prompt,
      size: mapAspectRatioToVideoSize(options?.aspectRatio),
      seconds: mapDurationToSeconds(options?.durationSeconds),
      input_reference: file,
    });

    return { jobId: video.id };
  },

  async checkVideoJob(jobId: string): Promise<VideoJobStatus> {
    try {
      const video = await openai.videos.retrieve(jobId);

      if (video.status === "completed") {
        const content = await openai.videos.downloadContent(jobId);
        const arrayBuffer = await content.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);

        return {
          status: "completed",
          videoBuffer,
          mimeType: "video/mp4",
        };
      }

      if (video.status === "failed") {
        return {
          status: "failed",
          error: "Video generation failed",
        };
      }

      return { status: "processing" };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type {
  GenerationProvider,
  ImageGenerationOptions,
  ImageResult,
  VideoGenerationOptions,
  VideoJobResult,
  VideoJobStatus,
} from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });

export const geminiProvider: GenerationProvider = {
  name: "gemini",

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const response = await ai.models.generateImages({
      model: options?.modelId ?? "imagen-4.0-generate-001",
      prompt,
      config: {
        numberOfImages: options?.numberOfImages ?? 1,
        aspectRatio: options?.aspectRatio ?? "1:1",
      },
    });

    const generated = response.generatedImages?.[0];
    if (!generated?.image?.imageBytes) {
      throw new Error("Gemini image generation returned no image data");
    }

    return {
      base64: generated.image.imageBytes,
      mimeType: "image/png",
    };
  },

  async generateVideo(
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const operation = await ai.models.generateVideos({
      model: options?.modelId ?? "veo-2.0-generate-001",
      prompt,
      config: {
        aspectRatio: options?.aspectRatio ?? "16:9",
        durationSeconds: options?.durationSeconds ?? 8,
      },
    });

    if (!operation.name) {
      throw new Error("Gemini video generation returned no operation name");
    }

    return { jobId: operation.name };
  },

  async imageToVideo(
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const operation = await ai.models.generateVideos({
      model: options?.modelId ?? "veo-2.0-generate-001",
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: imageMimeType,
      },
      config: {
        aspectRatio: options?.aspectRatio ?? "16:9",
        durationSeconds: options?.durationSeconds ?? 8,
      },
    });

    if (!operation.name) {
      throw new Error("Gemini video generation returned no operation name");
    }

    return { jobId: operation.name };
  },

  async checkVideoJob(jobId: string): Promise<VideoJobStatus> {
    try {
      // Reconstruct the operation from just the name string
      const operation = new GenerateVideosOperation();
      operation.name = jobId;

      const result = await ai.operations.getVideosOperation({ operation });

      if (!result.done) {
        return { status: "processing" };
      }

      const video = result.response?.generatedVideos?.[0]?.video;
      if (!video) {
        return { status: "failed", error: "No video in response" };
      }

      // Download video to temp file, then read it
      const tmpPath = path.join(tmpdir(), `gemini-video-${Date.now()}.mp4`);
      await ai.files.download({ file: video, downloadPath: tmpPath });
      const videoBuffer = await readFile(tmpPath);
      await unlink(tmpPath).catch(() => {});

      return {
        status: "completed",
        videoBuffer,
        mimeType: "video/mp4",
      };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

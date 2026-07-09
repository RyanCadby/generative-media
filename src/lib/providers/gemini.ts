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

// Gemini Omni jobs poll the Interactions API rather than the Veo operations
// API, so their job ids are prefixed to tell the two apart in checkVideoJob.
const OMNI_JOB_PREFIX = "omni:";

function isOmniModel(model: string): boolean {
  return model.startsWith("gemini-omni");
}

async function startOmniVideo(
  input: string | Array<{ type: "text"; text: string } | { type: "image"; data: string; mime_type: string }>,
  aspectRatio: string
): Promise<VideoJobResult> {
  const interaction = await ai.interactions.create({
    model: "gemini-omni-flash-preview",
    input,
    background: true,
    store: true,
    response_format: { type: "video", aspect_ratio: aspectRatio },
  });

  if (!interaction.id) {
    throw new Error("Gemini Omni returned no interaction id");
  }

  return { jobId: `${OMNI_JOB_PREFIX}${interaction.id}` };
}

async function checkOmniJob(interactionId: string): Promise<VideoJobStatus> {
  const interaction = await ai.interactions.get(interactionId);

  if (
    interaction.status === "in_progress" ||
    interaction.status === "requires_action"
  ) {
    return { status: "processing" };
  }

  if (interaction.status !== "completed") {
    return { status: "failed", error: `Interaction ${interaction.status}` };
  }

  const video = interaction.outputs?.find((o) => o.type === "video");
  if (!video) {
    return { status: "failed", error: "No video in response" };
  }

  const mimeType = video.mime_type ?? "video/mp4";

  if (video.data) {
    return {
      status: "completed",
      videoBuffer: Buffer.from(video.data, "base64"),
      mimeType,
    };
  }

  // Videos over ~4MB are delivered by URI instead of inline base64
  if (video.uri) {
    const res = await fetch(video.uri, {
      headers: { "x-goog-api-key": process.env.GOOGLE_GENAI_API_KEY! },
    });
    if (!res.ok) {
      return {
        status: "failed",
        error: `Video download failed with status ${res.status}`,
      };
    }
    return {
      status: "completed",
      videoBuffer: Buffer.from(await res.arrayBuffer()),
      mimeType,
    };
  }

  return { status: "failed", error: "No video in response" };
}

export const geminiProvider: GenerationProvider = {
  name: "gemini",

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const model = options?.modelId ?? "gemini-3.1-flash-image";
    const references = options?.referenceImages ?? [];

    // Nano Banana (gemini-*) models generate images via generateContent;
    // Imagen models use the dedicated generateImages endpoint.
    if (model.startsWith("gemini-")) {
      const response = await ai.models.generateContent({
        model,
        contents:
          references.length > 0
            ? [
                { text: prompt },
                ...references.map((ref) => ({
                  inlineData: { data: ref.base64, mimeType: ref.mimeType },
                })),
              ]
            : prompt,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: options?.aspectRatio ?? "1:1",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? "image/png",
          };
        }
      }
      throw new Error("Gemini image generation returned no image data");
    }

    if (references.length > 0) {
      throw new Error(
        "Imagen models do not support reference images — use a Nano Banana model instead"
      );
    }

    const response = await ai.models.generateImages({
      model,
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
    const model = options?.modelId ?? "veo-3.1-generate-preview";

    if (isOmniModel(model)) {
      return startOmniVideo(prompt, options?.aspectRatio ?? "16:9");
    }

    const operation = await ai.models.generateVideos({
      model,
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
    const model = options?.modelId ?? "veo-3.1-generate-preview";

    if (isOmniModel(model)) {
      return startOmniVideo(
        [
          { type: "image", data: imageBase64, mime_type: imageMimeType },
          { type: "text", text: prompt },
        ],
        options?.aspectRatio ?? "16:9"
      );
    }

    const operation = await ai.models.generateVideos({
      model,
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
      if (jobId.startsWith(OMNI_JOB_PREFIX)) {
        return await checkOmniJob(jobId.slice(OMNI_JOB_PREFIX.length));
      }

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

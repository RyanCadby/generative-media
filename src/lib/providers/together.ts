import type {
  GenerationProvider,
  ImageGenerationOptions,
  ImageResult,
  VideoGenerationOptions,
  VideoJobResult,
  VideoJobStatus,
} from "./types";

const BASE_URL = "https://api.together.xyz/v2";

function getApiKey(): string {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("TOGETHER_API_KEY is not set");
  return key;
}

interface TogetherVideoResponse {
  id: string;
  status: "in_progress" | "completed" | "failed";
  outputs?: { video_url: string };
  error?: { code: string; message: string };
}

function isKlingModel(modelId?: string): boolean {
  return !!modelId && modelId.toLowerCase().includes("kling");
}

function isSeedanceModel(modelId?: string): boolean {
  return !!modelId && modelId.toLowerCase().includes("seedance");
}

function mapDimensions(
  aspectRatio?: string,
  modelId?: string
): { width: number; height: number } {
  // Direct WIDTHxHEIGHT format from Seedance resolution selector
  if (aspectRatio) {
    const match = aspectRatio.match(/^(\d+)x(\d+)$/);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
  }

  if (isKlingModel(modelId)) {
    switch (aspectRatio) {
      case "9:16":
        return { width: 1080, height: 1920 };
      case "1:1":
        return { width: 1080, height: 1080 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  if (isSeedanceModel(modelId)) {
    switch (aspectRatio) {
      case "9:16":
        return { width: 1088, height: 1920 };
      case "1:1":
        return { width: 1440, height: 1440 };
      default:
        return { width: 1920, height: 1088 };
    }
  }

  switch (aspectRatio) {
    case "9:16":
      return { width: 768, height: 1366 };
    default:
      return { width: 1366, height: 768 };
  }
}

export const togetherProvider: GenerationProvider = {
  name: "together",

  async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    throw new Error(
      "Together.ai video models do not support image generation."
    );
  },

  async generateVideo(
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const { width, height } = mapDimensions(options?.aspectRatio, options?.modelId);

    const res = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.modelId ?? "Wan-AI/Wan2.2-T2V-A14B",
        prompt,
        width,
        height,
        seconds: options?.durationSeconds ?? 5,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Together video creation failed (${res.status}): ${body}`);
    }

    const data: TogetherVideoResponse = await res.json();
    return { jobId: data.id };
  },

  async imageToVideo(
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const { width, height } = mapDimensions(options?.aspectRatio, options?.modelId);

    // Together API requires input_image as a publicly accessible URL
    const imageUrl =
      options?.imageUrl ??
      `data:${imageMimeType};base64,${imageBase64}`;

    const res = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.modelId ?? "Wan-AI/Wan2.2-I2V-A14B",
        prompt,
        width,
        height,
        seconds: options?.durationSeconds ?? 5,
        frame_images: [{ input_image: imageUrl }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Together video creation failed (${res.status}): ${body}`);
    }

    const data: TogetherVideoResponse = await res.json();
    return { jobId: data.id };
  },

  async checkVideoJob(jobId: string): Promise<VideoJobStatus> {
    try {
      const res = await fetch(`${BASE_URL}/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${getApiKey()}` },
      });

      if (!res.ok) {
        return {
          status: "failed",
          error: `Status check failed (${res.status})`,
        };
      }

      const data: TogetherVideoResponse = await res.json();

      if (data.status === "completed" && data.outputs?.video_url) {
        const videoRes = await fetch(data.outputs.video_url);
        const buffer = await videoRes.arrayBuffer();

        return {
          status: "completed",
          videoBuffer: Buffer.from(buffer),
          mimeType: "video/mp4",
        };
      }

      if (data.status === "failed") {
        return {
          status: "failed",
          error: data.error?.message ?? "Video generation failed",
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

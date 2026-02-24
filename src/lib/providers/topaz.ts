import type {
  GenerationProvider,
  ImageResult,
  VideoJobResult,
  VideoJobStatus,
  UpscaleOptions,
} from "./types";
import { getImageDimensions } from "@/lib/image-dimensions";

const TOPAZ_BASE_URL = "https://api.topazlabs.com";

function getApiKey(): string {
  const key = process.env.TOPAZ_API_KEY;
  if (!key) throw new Error("TOPAZ_API_KEY environment variable is not set");
  return key;
}

function getMimeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return map[mimeType] ?? "png";
}

// Generative models use a different API endpoint
const GENERATIVE_MODELS = new Set(["Redefine", "Recovery V2", "Standard MAX", "Wonder"]);

export const topazProvider: GenerationProvider = {
  name: "topaz",

  async generateImage(): Promise<ImageResult> {
    throw new Error("Topaz does not support text-to-image generation");
  },

  async generateVideo(): Promise<VideoJobResult> {
    throw new Error("Topaz does not support video generation");
  },

  async imageToVideo(): Promise<VideoJobResult> {
    throw new Error("Topaz does not support image-to-video generation");
  },

  async upscaleImage(
    imageBase64: string,
    imageMimeType: string,
    options?: UpscaleOptions
  ): Promise<VideoJobResult> {
    const apiKey = getApiKey();
    const buffer = Buffer.from(imageBase64, "base64");
    const ext = getMimeExtension(imageMimeType);
    const blob = new Blob([buffer], { type: imageMimeType });

    const formData = new FormData();
    formData.append("image", blob, `input.${ext}`);
    formData.append("output_format", "png");

    if (options?.modelId) {
      formData.append("model", options.modelId);
    }

    // Scale — generative models ignore scale_multiplier, so compute explicit output dimensions
    const isGen = GENERATIVE_MODELS.has(options?.modelId ?? "");
    if (options?.scaleFactor && options.scaleFactor > 1) {
      formData.append("scale_multiplier", String(options.scaleFactor));
      if (isGen) {
        const dims = getImageDimensions(buffer);
        if (dims) {
          formData.append("output_width", String(Math.round(dims.width * options.scaleFactor)));
          formData.append("output_height", String(Math.round(dims.height * options.scaleFactor)));
        }
      }
    } else {
      if (options?.outputWidth) {
        formData.append("output_width", String(options.outputWidth));
      }
      if (options?.outputHeight) {
        formData.append("output_height", String(options.outputHeight));
      }
    }

    // Face enhancement
    if (options?.face_enhancement !== undefined) {
      formData.append("face_enhancement", String(options.face_enhancement));
    }
    if (options?.face_enhancement_strength !== undefined) {
      formData.append("face_enhancement_strength", String(options.face_enhancement_strength));
    }
    if (options?.face_enhancement_creativity !== undefined) {
      formData.append("face_enhancement_creativity", String(options.face_enhancement_creativity));
    }

    // Subject detection
    if (options?.subject_detection) {
      formData.append("subject_detection", options.subject_detection);
    }

    // Processing
    if (options?.sharpen !== undefined) {
      formData.append("sharpen", String(options.sharpen));
    }
    if (options?.denoise !== undefined) {
      formData.append("denoise", String(options.denoise));
    }
    if (options?.fix_compression !== undefined) {
      formData.append("fix_compression", String(options.fix_compression));
    }

    // Text Refine
    if (options?.strength !== undefined) {
      formData.append("strength", String(options.strength));
    }

    // Redefine (generative)
    if (options?.creativity !== undefined) {
      formData.append("creativity", String(options.creativity));
    }
    if (options?.texture !== undefined) {
      formData.append("texture", String(options.texture));
    }
    if (options?.prompt) {
      formData.append("prompt", options.prompt);
      formData.append("autoprompt", "false");
    } else if (options?.modelId === "Redefine") {
      formData.append("autoprompt", "true");
    }

    // Recovery V2
    if (options?.detail !== undefined) {
      formData.append("detail", String(options.detail));
    }

    const isGenerative = GENERATIVE_MODELS.has(options?.modelId ?? "");
    const endpoint = isGenerative ? "enhance-gen" : "enhance";

    // Log all params being sent (excluding the image blob)
    const logParams: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (key !== "image") logParams[key] = String(value);
    });
    console.log(`[Topaz] POST ${endpoint}/async params:`, JSON.stringify(logParams));

    const response = await fetch(`${TOPAZ_BASE_URL}/image/v1/${endpoint}/async`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Topaz] ${endpoint}/async error (${response.status}):`, errorText);
      throw new Error(`Topaz API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Topaz] ${endpoint}/async response:`, JSON.stringify(data));
    return { jobId: data.process_id };
  },

  async checkVideoJob(processId: string): Promise<VideoJobStatus> {
    const apiKey = getApiKey();

    // Check status
    const statusResponse = await fetch(
      `${TOPAZ_BASE_URL}/image/v1/status/${processId}`,
      {
        headers: { "X-API-Key": apiKey },
      }
    );

    if (!statusResponse.ok) {
      console.error(`[Topaz] Status check error (${statusResponse.status}) for ${processId}`);
      return {
        status: "failed",
        error: `Status check failed (${statusResponse.status})`,
      };
    }

    const statusData = await statusResponse.json();
    console.log(`[Topaz] Status for ${processId}:`, JSON.stringify(statusData));
    const normalizedStatus = String(statusData.status).toLowerCase();

    if (normalizedStatus === "failed" || normalizedStatus === "error") {
      return {
        status: "failed",
        error: statusData.error ?? "Upscaling failed",
      };
    }

    if (normalizedStatus !== "completed") {
      return {
        status: "processing",
        progress: typeof statusData.progress === "number" ? statusData.progress : undefined,
      };
    }

    // Get the download URL from Topaz
    const downloadResponse = await fetch(
      `${TOPAZ_BASE_URL}/image/v1/download/${processId}`,
      {
        headers: { "X-API-Key": apiKey },
      }
    );

    if (!downloadResponse.ok) {
      return {
        status: "failed",
        error: `Download failed (${downloadResponse.status})`,
      };
    }

    const downloadData = await downloadResponse.json();
    console.log(`[Topaz] Download response for ${processId}:`, JSON.stringify(downloadData));
    const imageUrl = downloadData.download_url;
    if (!imageUrl) {
      return {
        status: "failed",
        error: "No download URL in response",
      };
    }

    // Fetch the actual image from the presigned URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return {
        status: "failed",
        error: `Image download failed (${imageResponse.status})`,
      };
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const mimeType =
      imageResponse.headers.get("content-type") ?? "image/png";

    return {
      status: "completed",
      videoBuffer: imageBuffer,
      mimeType,
    };
  },
};

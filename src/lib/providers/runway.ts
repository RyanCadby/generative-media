import RunwayML, { toFile } from "@runwayml/sdk";
import type {
  GenerationProvider,
  ImageGenerationOptions,
  ImageResult,
  VideoGenerationOptions,
  VideoJobResult,
  VideoJobStatus,
} from "./types";

const client = new RunwayML();

type ImageRatio =
  | "1024:1024"
  | "1080:1080"
  | "1168:880"
  | "1360:768"
  | "1440:1080"
  | "1080:1440"
  | "1808:768"
  | "1920:1080"
  | "1080:1920"
  | "2112:912"
  | "1280:720"
  | "720:1280"
  | "720:720"
  | "960:720"
  | "720:960"
  | "1680:720";

type VideoRatio =
  | "1280:720"
  | "720:1280"
  | "1104:832"
  | "832:1104"
  | "960:960"
  | "1584:672";

function mapAspectRatioToImageRatio(aspectRatio?: string): ImageRatio {
  switch (aspectRatio) {
    case "16:9":
      return "1920:1080";
    case "9:16":
      return "1080:1920";
    default:
      return "1024:1024";
  }
}

function mapAspectRatioToVideoRatio(aspectRatio?: string): VideoRatio {
  switch (aspectRatio) {
    case "9:16":
      return "720:1280";
    default:
      return "1280:720";
  }
}

export const runwayProvider: GenerationProvider = {
  name: "runway",

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const ratio = mapAspectRatioToImageRatio(options?.aspectRatio);
    const modelId = options?.modelId ?? "gen4_image";

    const task =
      modelId === "gen4_image_turbo"
        ? await client.textToImage.create({
            model: "gen4_image_turbo",
            promptText: prompt,
            ratio,
            referenceImages: [],
          })
        : await client.textToImage.create({
            model: "gen4_image",
            promptText: prompt,
            ratio,
          });

    const result = await client.tasks.retrieve(task.id).waitForTaskOutput();

    if (result.status !== "SUCCEEDED" || !("output" in result) || !result.output?.[0]) {
      const failure = "failure" in result ? (result.failure as string) : undefined;
      throw new Error(
        `Runway image generation failed: ${failure ?? "no output"}`
      );
    }

    const response = await fetch(result.output[0]);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      base64,
      mimeType: "image/png",
    };
  },

  async generateVideo(
    _prompt: string,
    _options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    throw new Error(
      "Runway models do not support text-to-video. Use image-to-video instead."
    );
  },

  async imageToVideo(
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const ext = imageMimeType.includes("png") ? "png" : "jpg";
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const file = await toFile(imageBuffer, `input.${ext}`, {
      type: imageMimeType,
    });

    const upload = await client.uploads.createEphemeral({ file });

    const task = await client.imageToVideo.create({
      model: (options?.modelId ?? "gen4_turbo") as "gen4_turbo",
      promptImage: upload.uri,
      promptText: prompt,
      ratio: mapAspectRatioToVideoRatio(options?.aspectRatio),
      duration: options?.durationSeconds ?? 5,
    });

    return { jobId: task.id };
  },

  async checkVideoJob(jobId: string): Promise<VideoJobStatus> {
    try {
      const task = await client.tasks.retrieve(jobId);

      if (task.status === "SUCCEEDED" && task.output?.[0]) {
        const response = await fetch(task.output[0]);
        const buffer = await response.arrayBuffer();

        return {
          status: "completed",
          videoBuffer: Buffer.from(buffer),
          mimeType: "video/mp4",
        };
      }

      if (task.status === "FAILED") {
        return {
          status: "failed",
          error: (task as { failure?: string }).failure ?? "Video generation failed",
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

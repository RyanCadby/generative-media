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

// Gen-4.5 requires an integer duration between 2 and 10 seconds
function clampGen45Duration(durationSeconds?: number): number {
  return Math.min(10, Math.max(2, Math.round(durationSeconds ?? 5)));
}

export const runwayProvider: GenerationProvider = {
  name: "runway",

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const ratio = mapAspectRatioToImageRatio(options?.aspectRatio);
    const modelId = options?.modelId ?? "gen4_image";

    // Runway accepts at most 3 reference images
    const references = (options?.referenceImages ?? []).slice(0, 3);
    const referenceImages = await Promise.all(
      references.map(async (ref, i) => {
        const ext = ref.mimeType.includes("png") ? "png" : "jpg";
        const buffer = Buffer.from(ref.base64, "base64");
        const file = await toFile(buffer, `reference-${i}.${ext}`, {
          type: ref.mimeType,
        });
        const upload = await client.uploads.createEphemeral({ file });
        return { uri: upload.uri };
      })
    );

    if (modelId === "gen4_image_turbo" && referenceImages.length === 0) {
      throw new Error(
        "Gen-4 Image Turbo requires a reference image — attach one or use Gen-4 Image"
      );
    }

    const task =
      modelId === "gen4_image_turbo"
        ? await client.textToImage.create({
            model: "gen4_image_turbo",
            promptText: prompt,
            ratio,
            referenceImages,
          })
        : await client.textToImage.create({
            model: "gen4_image",
            promptText: prompt,
            ratio,
            ...(referenceImages.length > 0 ? { referenceImages } : {}),
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
    prompt: string,
    options?: VideoGenerationOptions
  ): Promise<VideoJobResult> {
    const modelId = options?.modelId ?? "gen4.5";
    if (modelId !== "gen4.5") {
      throw new Error(
        `Runway model ${modelId} does not support text-to-video. Use image-to-video instead.`
      );
    }

    const task = await client.textToVideo.create({
      model: "gen4.5",
      promptText: prompt,
      ratio: options?.aspectRatio === "9:16" ? "720:1280" : "1280:720",
      duration: clampGen45Duration(options?.durationSeconds),
    });

    return { jobId: task.id };
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

    const modelId = options?.modelId ?? "gen4_turbo";
    const task =
      modelId === "gen4.5"
        ? await client.imageToVideo.create({
            model: "gen4.5",
            promptImage: upload.uri,
            promptText: prompt,
            ratio: mapAspectRatioToVideoRatio(options?.aspectRatio),
            duration: clampGen45Duration(options?.durationSeconds),
          })
        : await client.imageToVideo.create({
            model: modelId as "gen4_turbo",
            promptImage: upload.uri,
            promptText: prompt,
            ratio: mapAspectRatioToVideoRatio(options?.aspectRatio),
            duration: (options?.durationSeconds ?? 5) as 5 | 10,
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

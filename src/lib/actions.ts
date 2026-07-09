"use server";

import { db } from "@/lib/db";
import {
  projects,
  generations,
  mediaAssets,
  generationJobs,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers";
import type { ProviderName, GenerationType } from "@/lib/providers";
import { saveMedia } from "@/lib/media-storage";
import { getImageDimensions } from "@/lib/image-dimensions";
import { generateAndSaveThumbnail } from "@/lib/thumbnail";
import { readFile, unlink } from "fs/promises";

export async function createProject() {
  const [project] = await db.insert(projects).values({}).returning();
  redirect(`/create/${project.id}`);
}

export async function getProjectList() {
  return db.query.projects.findMany({
    orderBy: desc(projects.updatedAt),
    columns: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });
}

export async function getProject(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      generations: {
        orderBy: desc(generations.createdAt),
        with: {
          mediaAssets: true,
          generationJobs: {
            columns: {
              id: true,
              status: true,
              generationType: true,
              model: true,
              provider: true,
              error: true,
            },
          },
        },
      },
    },
  });

  return project;
}

export async function renameProject(projectId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db
    .update(projects)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  revalidatePath("/");
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/");
  redirect("/create/new");
}

interface ExecuteGenerationParams {
  projectId: string;
  content: string;
  provider: ProviderName;
  generationType: GenerationType;
  modelId: string;
  referenceImages: { base64: string; mimeType: string }[];
  refImageUrls: string[];
  referenceRoles?: string[];
  metadata: Record<string, unknown>;
  scaleFactor?: number;
  upscaleParams?: Record<string, unknown>;
  aspectRatio?: string;
  numberOfImages?: number;
}

// Reference-image roles are expressed as prompt guidance — image models
// (Nano Banana et al.) have no structured API field for them.
const REFERENCE_ROLE_GUIDES: Record<string, string> = {
  subject:
    "a subject reference — keep this subject's identity and features consistent in the result",
  style: "a style reference — apply its artistic style, not its content",
  composition:
    "a composition reference — follow its layout and framing, not its content or style",
};

function applyReferenceRoles(
  prompt: string,
  referenceRoles: string[] | undefined
): string {
  const roleLines = (referenceRoles ?? [])
    .map((role, i) =>
      REFERENCE_ROLE_GUIDES[role]
        ? `Reference image ${i + 1} is ${REFERENCE_ROLE_GUIDES[role]}.`
        : null
    )
    .filter((line): line is string => line !== null);
  return roleLines.length > 0 ? `${prompt}\n\n${roleLines.join("\n")}` : prompt;
}

async function executeGeneration({
  projectId,
  content,
  provider,
  generationType,
  modelId,
  referenceImages,
  refImageUrls,
  referenceRoles,
  metadata,
  scaleFactor,
  upscaleParams,
  aspectRatio,
  numberOfImages,
}: ExecuteGenerationParams) {
  const providerInstance = getProvider(provider);

  // Primary reference: used by single-image flows (video, upscale)
  const imageBase64 = referenceImages[0]?.base64;
  const imageMimeType = referenceImages[0]?.mimeType;
  const refImageUrl = refImageUrls[0];

  // Insert the generation row
  const generationId = uuidv4();
  await db.insert(generations).values({
    id: generationId,
    projectId,
    prompt: content,
    provider,
    generationType,
    model: modelId,
    referenceImagePath: refImageUrl ?? null,
    referenceImageMimeType: imageMimeType ?? null,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  });

  // Insert generation job
  const jobId = uuidv4();
  await db.insert(generationJobs).values({
    id: jobId,
    generationId,
    provider,
    generationType,
    model: modelId,
    status: "processing",
  });

  // Update project title on first generation
  const projectData = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { generations: { limit: 2 } },
  });
  if (projectData && projectData.generations.length <= 1) {
    const titleText = content.trim() || `${generationType} - ${modelId}`;
    const title =
      titleText.length > 50 ? titleText.substring(0, 50) + "..." : titleText;
    await db.update(projects).set({ title, updatedAt: new Date() }).where(eq(projects.id, projectId));
  } else {
    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  }

  try {
    if (generationType === "text-to-image") {
      const effectivePrompt = applyReferenceRoles(content, referenceRoles);
      const count = Math.min(Math.max(numberOfImages ?? 1, 1), 4);

      const results = await Promise.allSettled(
        Array.from({ length: count }, () =>
          providerInstance.generateImage(effectivePrompt, {
            modelId,
            aspectRatio,
            referenceImages:
              referenceImages.length > 0 ? referenceImages : undefined,
          })
        )
      );

      const images = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : []
      );
      if (images.length === 0) {
        const failure = results.find((r) => r.status === "rejected");
        throw failure && failure.status === "rejected" && failure.reason instanceof Error
          ? failure.reason
          : new Error("Image generation failed");
      }

      for (const result of images) {
        const assetId = uuidv4();
        const buffer = Buffer.from(result.base64, "base64");
        const dims = getImageDimensions(buffer);
        const filePath = await saveMedia(
          projectId,
          assetId,
          buffer,
          result.mimeType
        );
        const thumbnailPath = await generateAndSaveThumbnail(buffer, projectId, assetId);

        await db.insert(mediaAssets).values({
          id: assetId,
          generationId,
          projectId,
          type: "image",
          provider,
          model: modelId,
          prompt: content,
          filePath,
          thumbnailPath,
          mimeType: result.mimeType,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
        });
      }

      await db
        .update(generationJobs)
        .set({
          status: "completed",
          error:
            images.length < count
              ? `${count - images.length} of ${count} images failed`
              : null,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, jobId));
    } else if (
      generationType === "text-to-video" ||
      generationType === "image-to-video"
    ) {
      let videoJob;

      // Any video generation with an attached image uses it as the reference
      // frame, regardless of whether the user was in text- or image-to-video mode
      if (imageBase64 && imageMimeType) {
        videoJob = await providerInstance.imageToVideo(
          imageBase64,
          imageMimeType,
          content,
          { modelId, imageUrl: refImageUrl, aspectRatio }
        );
      } else {
        videoJob = await providerInstance.generateVideo(content, { modelId, aspectRatio });
      }

      await db
        .update(generationJobs)
        .set({
          providerJobId: videoJob.jobId,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, jobId));
    } else if (generationType === "image-upscale") {
      if (!imageBase64 || !imageMimeType) {
        throw new Error("Image required for upscaling");
      }
      if (!providerInstance.upscaleImage) {
        throw new Error(`Provider ${provider} does not support image upscaling`);
      }

      const upscaleResult = await providerInstance.upscaleImage(
        imageBase64,
        imageMimeType,
        { modelId, scaleFactor, prompt: content || undefined, ...upscaleParams }
      );

      await db
        .update(generationJobs)
        .set({
          providerJobId: upscaleResult.jobId,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, jobId));
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Generation failed";

    await db
      .update(generationJobs)
      .set({ status: "failed", error: errorMsg, updatedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
  }

  revalidatePath(`/create/${projectId}`);
  return { projectId, jobId };
}

export async function submitGeneration(
  projectId: string,
  content: string,
  provider: ProviderName,
  generationType: GenerationType,
  modelId: string,
  uploads?: { filePath: string; mimeType: string; role?: string }[],
  scaleFactor?: number,
  upscaleParams?: Record<string, unknown>,
  aspectRatio?: string,
  numberOfImages?: number
) {
  // Read uploaded reference images from disk and save them to R2
  const referenceImages: { base64: string; mimeType: string }[] = [];
  const refImageUrls: string[] = [];
  const referenceRoles: string[] = [];
  for (const upload of uploads ?? []) {
    const fileBuffer = await readFile(upload.filePath);
    await unlink(upload.filePath).catch(() => {});
    referenceImages.push({
      base64: fileBuffer.toString("base64"),
      mimeType: upload.mimeType,
    });
    referenceRoles.push(upload.role ?? "reference");
    const refAssetId = uuidv4();
    refImageUrls.push(
      await saveMedia(projectId, refAssetId, fileBuffer, upload.mimeType)
    );
  }

  // Build metadata for the generation; settings are stored so re-runs can
  // reproduce them exactly
  const metadata: Record<string, unknown> = {};
  if (scaleFactor !== undefined) metadata.scaleFactor = scaleFactor;
  if (aspectRatio !== undefined) metadata.aspectRatio = aspectRatio;
  if (numberOfImages !== undefined && numberOfImages > 1) {
    metadata.numberOfImages = numberOfImages;
  }
  if (refImageUrls.length > 1) metadata.referenceImages = refImageUrls;
  if (referenceRoles.some((role) => role !== "reference")) {
    metadata.referenceRoles = referenceRoles;
  }
  if (upscaleParams && Object.keys(upscaleParams).length > 0) {
    Object.assign(metadata, upscaleParams);
  }

  return executeGeneration({
    projectId,
    content,
    provider,
    generationType,
    modelId,
    referenceImages,
    refImageUrls,
    referenceRoles,
    metadata,
    scaleFactor,
    upscaleParams,
    aspectRatio,
    numberOfImages,
  });
}

export async function rerunGeneration(generationId: string) {
  const original = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
  });
  if (!original) {
    throw new Error("Generation not found");
  }

  const metadata =
    (original.metadata as Record<string, unknown> | null) ?? {};

  // Re-download stored reference images so the provider gets the same inputs
  const refImageUrls =
    (metadata.referenceImages as string[] | undefined) ??
    (original.referenceImagePath ? [original.referenceImagePath] : []);
  const referenceImages: { base64: string; mimeType: string }[] = [];
  for (const url of refImageUrls) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load reference image (${res.status})`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    referenceImages.push({
      base64: buffer.toString("base64"),
      mimeType:
        res.headers.get("content-type") ??
        original.referenceImageMimeType ??
        "image/png",
    });
  }

  // Everything in metadata besides these bookkeeping keys is upscale params
  const {
    scaleFactor,
    aspectRatio,
    numberOfImages,
    referenceImages: _refs,
    referenceRoles,
    ...upscaleParams
  } = metadata;

  return executeGeneration({
    projectId: original.projectId,
    content: original.prompt,
    provider: original.provider as ProviderName,
    generationType: original.generationType as GenerationType,
    modelId: original.model,
    referenceImages,
    refImageUrls,
    referenceRoles: referenceRoles as string[] | undefined,
    metadata,
    scaleFactor: scaleFactor as number | undefined,
    upscaleParams,
    aspectRatio: aspectRatio as string | undefined,
    numberOfImages: numberOfImages as number | undefined,
  });
}

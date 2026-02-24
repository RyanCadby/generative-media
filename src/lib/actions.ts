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

export async function submitGeneration(
  projectId: string,
  content: string,
  provider: ProviderName,
  generationType: GenerationType,
  modelId: string,
  uploadFilePath?: string,
  uploadMimeType?: string,
  scaleFactor?: number,
  upscaleParams?: Record<string, unknown>,
  aspectRatio?: string
) {
  const providerInstance = getProvider(provider);

  // Read uploaded image from disk if provided
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  if (uploadFilePath && uploadMimeType) {
    const fileBuffer = await readFile(uploadFilePath);
    imageBase64 = fileBuffer.toString("base64");
    imageMimeType = uploadMimeType;
    await unlink(uploadFilePath).catch(() => {});
  }

  // Save the reference image to R2 if present
  let refImageUrl: string | undefined;
  if (imageBase64 && imageMimeType) {
    const refAssetId = uuidv4();
    const refBuffer = Buffer.from(imageBase64, "base64");
    refImageUrl = await saveMedia(projectId, refAssetId, refBuffer, imageMimeType);
  }

  // Build metadata for the generation
  const metadata: Record<string, unknown> = {};
  if (scaleFactor !== undefined) metadata.scaleFactor = scaleFactor;
  if (upscaleParams && Object.keys(upscaleParams).length > 0) {
    Object.assign(metadata, upscaleParams);
  }

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
      const result = await providerInstance.generateImage(content, { modelId });

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

      await db
        .update(generationJobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(generationJobs.id, jobId));
    } else if (
      generationType === "text-to-video" ||
      generationType === "image-to-video"
    ) {
      let videoJob;

      if (generationType === "image-to-video" && imageBase64 && imageMimeType) {
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

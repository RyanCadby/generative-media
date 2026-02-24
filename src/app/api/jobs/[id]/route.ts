import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generationJobs, generations, mediaAssets } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getProvider } from "@/lib/providers";
import type { ProviderName } from "@/lib/providers";
import { saveMedia } from "@/lib/media-storage";
import { getImageDimensions } from "@/lib/image-dimensions";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.id, id),
    with: {
      generation: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({
      status: job.status,
      error: job.error,
    });
  }

  // Auto-fail jobs that haven't had a successful provider check in 30 minutes
  const staleSinceMs = Date.now() - new Date(job.updatedAt).getTime();
  if (staleSinceMs > 30 * 60 * 1000) {
    const timeoutError = "Generation timed out — no progress for 30 minutes";
    await db
      .update(generationJobs)
      .set({ status: "failed", error: timeoutError, updatedAt: new Date() })
      .where(eq(generationJobs.id, id));
    return NextResponse.json({ status: "failed", error: timeoutError });
  }

  if (!job.providerJobId) {
    return NextResponse.json({ status: job.status });
  }

  try {
    const provider = getProvider(job.provider as ProviderName);
    const result = await provider.checkVideoJob(job.providerJobId);

    if (result.status === "completed" && result.videoBuffer) {
      // Atomically claim this completion to prevent duplicate processing
      const claimed = await db
        .update(generationJobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(generationJobs.id, id), ne(generationJobs.status, "completed")))
        .returning({ id: generationJobs.id });

      if (claimed.length === 0) {
        // Another request already handled this
        return NextResponse.json({ status: "completed" });
      }

      const assetId = uuidv4();
      const isUpscale = job.generationType === "image-upscale";
      const assetType = isUpscale ? "image" : "video";
      const defaultMimeType = isUpscale ? "image/png" : "video/mp4";
      const mimeType = result.mimeType ?? defaultMimeType;

      const generation = job.generation;
      if (!generation) {
        return NextResponse.json(
          { error: "Generation not found" },
          { status: 404 }
        );
      }

      // Extract dimensions for image assets
      const dims = assetType === "image" ? getImageDimensions(result.videoBuffer) : null;

      const filePath = await saveMedia(
        generation.projectId,
        assetId,
        result.videoBuffer,
        mimeType
      );

      await db.insert(mediaAssets).values({
        id: assetId,
        generationId: generation.id,
        projectId: generation.projectId,
        type: assetType,
        provider: job.provider,
        model: job.model ?? (job.provider === "topaz" ? "Standard V2" : job.provider === "gemini" ? "veo-2.0-generate-001" : "sora-2"),
        prompt: generation.prompt,
        filePath,
        mimeType,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
      });

      return NextResponse.json({ status: "completed" });
    }

    if (result.status === "failed") {
      await db
        .update(generationJobs)
        .set({
          status: "failed",
          error: result.error,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, id));

      return NextResponse.json({
        status: "failed",
        error: result.error,
      });
    }

    // Provider confirmed still processing — refresh updatedAt so the timeout resets
    await db
      .update(generationJobs)
      .set({ updatedAt: new Date() })
      .where(eq(generationJobs.id, id));

    return NextResponse.json({
      status: "processing",
      ...(result.progress != null && { progress: result.progress }),
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to check job status";
    return NextResponse.json({ status: "processing", error: errorMsg });
  }
}

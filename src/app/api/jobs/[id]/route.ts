import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generationJobs, messages, mediaAssets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProvider } from "@/lib/providers";
import type { ProviderName } from "@/lib/providers";
import { saveMedia } from "@/lib/media-storage";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.id, id),
    with: {
      message: true,
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

  // Auto-fail jobs stuck for more than 10 minutes
  const jobAgeMs = Date.now() - new Date(job.updatedAt).getTime();
  if (jobAgeMs > 10 * 60 * 1000) {
    const timeoutError = "Generation timed out";
    await db
      .update(generationJobs)
      .set({ status: "failed", error: timeoutError, updatedAt: new Date() })
      .where(eq(generationJobs.id, id));
    await db
      .update(messages)
      .set({ content: `Error: ${timeoutError}` })
      .where(eq(messages.id, job.messageId));
    return NextResponse.json({ status: "failed", error: timeoutError });
  }

  if (!job.providerJobId) {
    return NextResponse.json({ status: job.status });
  }

  try {
    const provider = getProvider(job.provider as ProviderName);
    const result = await provider.checkVideoJob(job.providerJobId);

    if (result.status === "completed" && result.videoBuffer) {
      const assetId = uuidv4();
      const mimeType = result.mimeType ?? "video/mp4";

      // Get chat ID from the message
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, job.messageId),
      });

      if (!message) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      const filePath = await saveMedia(
        message.chatId,
        assetId,
        result.videoBuffer,
        mimeType
      );

      await db.insert(mediaAssets).values({
        id: assetId,
        messageId: job.messageId,
        chatId: message.chatId,
        type: "video",
        provider: job.provider,
        model: job.model ?? (job.provider === "gemini" ? "veo-2.0-generate-001" : "sora-2"),
        prompt: message.content,
        filePath,
        mimeType,
      });

      await db
        .update(messages)
        .set({ content: "Generated video:" })
        .where(eq(messages.id, job.messageId));

      await db
        .update(generationJobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(generationJobs.id, id));

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

      await db
        .update(messages)
        .set({ content: `Error: ${result.error}` })
        .where(eq(messages.id, job.messageId));

      return NextResponse.json({
        status: "failed",
        error: result.error,
      });
    }

    return NextResponse.json({ status: "processing" });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to check job status";
    return NextResponse.json({ status: "processing", error: errorMsg });
  }
}

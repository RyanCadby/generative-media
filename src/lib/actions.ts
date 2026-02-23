"use server";

import { db } from "@/lib/db";
import {
  chats,
  messages,
  mediaAssets,
  generationJobs,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/providers";
import type { ProviderName, GenerationType } from "@/lib/providers";
import { saveMedia } from "@/lib/media-storage";
import { readFile, unlink } from "fs/promises";

export async function createChat() {
  const [chat] = await db.insert(chats).values({}).returning();
  redirect(`/chat/${chat.id}`);
}

export async function getChatList() {
  return db.query.chats.findMany({
    orderBy: desc(chats.updatedAt),
    columns: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });
}

export async function getChat(chatId: string) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      messages: {
        orderBy: asc(messages.createdAt),
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

  return chat;
}

export async function deleteChat(chatId: string) {
  await db.delete(chats).where(eq(chats.id, chatId));
  revalidatePath("/");
  redirect("/chat/new");
}

export async function sendMessage(
  chatId: string,
  content: string,
  provider: ProviderName,
  generationType: GenerationType,
  modelId: string,
  uploadFilePath?: string,
  uploadMimeType?: string
) {
  const providerInstance = getProvider(provider);

  // Read uploaded image from disk if provided (avoids passing large base64 through React serialization)
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  if (uploadFilePath && uploadMimeType) {
    const fileBuffer = await readFile(uploadFilePath);
    imageBase64 = fileBuffer.toString("base64");
    imageMimeType = uploadMimeType;
    // Clean up the temp file
    await unlink(uploadFilePath).catch(() => {});
  }

  // Insert user message
  const [userMessage] = await db
    .insert(messages)
    .values({
      chatId,
      role: "user",
      content,
    })
    .returning();

  // Save the uploaded reference image as a media asset on the user message
  let refImageUrl: string | undefined;
  if (imageBase64 && imageMimeType) {
    const refAssetId = uuidv4();
    const refBuffer = Buffer.from(imageBase64, "base64");
    refImageUrl = await saveMedia(chatId, refAssetId, refBuffer, imageMimeType);
    await db.insert(mediaAssets).values({
      id: refAssetId,
      messageId: userMessage.id,
      chatId,
      type: "image",
      provider,
      model: modelId,
      prompt: "Reference image",
      filePath: refImageUrl,
      mimeType: imageMimeType,
    });
  }

  // Insert assistant placeholder message
  const assistantMessageId = uuidv4();
  const [assistantMessage] = await db
    .insert(messages)
    .values({
      id: assistantMessageId,
      chatId,
      role: "assistant",
      content: "",
    })
    .returning();

  // Insert generation job
  const jobId = uuidv4();
  await db.insert(generationJobs).values({
    id: jobId,
    messageId: assistantMessage.id,
    provider,
    generationType,
    model: modelId,
    status: "processing",
  });

  // Update chat title on first message
  const chatData = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: { messages: { limit: 3 } },
  });
  if (chatData && chatData.messages.length <= 2) {
    const title =
      content.length > 50 ? content.substring(0, 50) + "..." : content;
    await db.update(chats).set({ title, updatedAt: new Date() }).where(eq(chats.id, chatId));
  } else {
    await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));
  }

  try {
    if (generationType === "text-to-image") {
      const result = await providerInstance.generateImage(content, { modelId });

      // Save image to filesystem
      const assetId = uuidv4();
      const buffer = Buffer.from(result.base64, "base64");
      const filePath = await saveMedia(
        chatId,
        assetId,
        buffer,
        result.mimeType
      );

      // Create media asset record
      await db.insert(mediaAssets).values({
        id: assetId,
        messageId: assistantMessage.id,
        chatId,
        type: "image",
        provider,
        model: modelId,
        prompt: content,
        filePath,
        mimeType: result.mimeType,
      });

      // Update assistant message
      await db
        .update(messages)
        .set({ content: "Generated image:" })
        .where(eq(messages.id, assistantMessage.id));

      // Mark job as completed
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
          { modelId, imageUrl: refImageUrl }
        );
      } else {
        videoJob = await providerInstance.generateVideo(content, { modelId });
      }

      // Update job with provider job ID for polling
      await db
        .update(generationJobs)
        .set({
          providerJobId: videoJob.jobId,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, jobId));

      // Update assistant message
      await db
        .update(messages)
        .set({ content: "Generating video..." })
        .where(eq(messages.id, assistantMessage.id));
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Generation failed";

    await db
      .update(generationJobs)
      .set({ status: "failed", error: errorMsg, updatedAt: new Date() })
      .where(eq(generationJobs.id, jobId));

    await db
      .update(messages)
      .set({ content: `Error: ${errorMsg}` })
      .where(eq(messages.id, assistantMessage.id));
  }

  revalidatePath(`/chat/${chatId}`);
  return { chatId, jobId };
}

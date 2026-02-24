import "dotenv/config";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { mediaAssets } from "../src/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load .env.local (same as the app)
config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const THUMBNAIL_MAX_DIMENSION = 400;
const THUMBNAIL_QUALITY = 80;

async function saveThumbnail(
  projectId: string,
  assetId: string,
  buffer: Buffer
): Promise<string> {
  const thumbnailBuffer = await sharp(buffer)
    .resize(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();

  const key = `media/${projectId}/thumb_${assetId}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: thumbnailBuffer,
      ContentType: "image/webp",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

async function backfill() {
  const assets = await db
    .select({
      id: mediaAssets.id,
      projectId: mediaAssets.projectId,
      filePath: mediaAssets.filePath,
    })
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.type, "image"), isNull(mediaAssets.thumbnailPath))
    );

  console.log(`Found ${assets.length} image assets without thumbnails`);

  if (assets.length === 0) {
    console.log("Nothing to do.");
    await client.end();
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      const response = await fetch(asset.filePath);
      if (!response.ok) {
        console.error(
          `[${success + failed + 1}/${assets.length}] Failed to fetch ${asset.filePath}: ${response.status}`
        );
        failed++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const thumbnailPath = await saveThumbnail(
        asset.projectId,
        asset.id,
        buffer
      );

      await db
        .update(mediaAssets)
        .set({ thumbnailPath })
        .where(eq(mediaAssets.id, asset.id));

      success++;
      console.log(
        `[${success + failed}/${assets.length}] Thumbnail created for ${asset.id}`
      );
    } catch (error) {
      failed++;
      console.error(
        `[${success + failed}/${assets.length}] Error processing ${asset.id}:`,
        error
      );
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  await client.end();
  process.exit(0);
}

backfill();

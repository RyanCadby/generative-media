import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function getExtFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return map[mimeType] ?? "bin";
}

export async function saveMedia(
  chatId: string,
  assetId: string,
  data: Buffer,
  mimeType: string
): Promise<string> {
  const ext = getExtFromMimeType(mimeType);
  const key = `media/${chatId}/${assetId}.${ext}`;

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: mimeType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export function getMediaUrl(
  chatId: string,
  assetId: string,
  mimeType: string
): string {
  const ext = getExtFromMimeType(mimeType);
  return `${process.env.R2_PUBLIC_URL}/media/${chatId}/${assetId}.${ext}`;
}

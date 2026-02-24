import sharp from "sharp";
import { saveMedia } from "./media-storage";

const THUMBNAIL_MAX_DIMENSION = 400;
const THUMBNAIL_QUALITY = 80;

export async function generateAndSaveThumbnail(
  imageBuffer: Buffer,
  projectId: string,
  assetId: string
): Promise<string | null> {
  try {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return await saveMedia(
      projectId,
      `thumb_${assetId}`,
      thumbnailBuffer,
      "image/webp"
    );
  } catch {
    console.error(`Failed to generate thumbnail for asset ${assetId}`);
    return null;
  }
}

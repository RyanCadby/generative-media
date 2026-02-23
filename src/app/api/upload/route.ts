import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
    const id = uuidv4();
    const uploadDir = path.join(process.cwd(), "tmp", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, `${id}.${ext}`);
    await writeFile(filePath, buffer);

    // Return the file ID and info — the server action will read it from disk
    return NextResponse.json({
      uploadId: id,
      filePath,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

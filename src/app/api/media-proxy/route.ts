import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch image" }, { status: res.status });
      }

      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const buffer = await res.arrayBuffer();

      return new NextResponse(buffer, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
}

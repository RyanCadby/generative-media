import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export async function POST() {
  const [project] = await db.insert(projects).values({}).returning();
  return NextResponse.json({ id: project.id });
}

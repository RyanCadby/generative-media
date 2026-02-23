import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export async function POST() {
  const [chat] = await db.insert(chats).values({}).returning();
  return NextResponse.json({ id: chat.id });
}

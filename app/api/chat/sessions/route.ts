import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth/session";
import { getChatSessions, createChatSession } from "@/lib/storage/fileStore";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getChatSessions(user.id);
  return NextResponse.json({ data: sessions });
}

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now     = new Date().toISOString();
  const session = {
    id:        uuidv4(),
    userId:    user.id,
    title:     "New conversation",
    context:   {},
    createdAt: now,
    updatedAt: now,
  };

  await createChatSession(session);
  return NextResponse.json({ data: session }, { status: 201 });
}

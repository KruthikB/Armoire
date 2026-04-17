import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getChatSessions, deleteChatSession } from "@/lib/storage/fileStore";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before deleting
  const sessions = await getChatSessions(user.id);
  if (!sessions.find((s) => s.id === params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteChatSession(user.id, params.id);
  return NextResponse.json({ success: true });
}

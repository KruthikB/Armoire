import { getSession } from "@/lib/auth/session";
import { getChatSessions } from "@/lib/storage/fileStore";
import ChatClient from "@/components/chat/ChatClient";

export const metadata = { title: "Style Chat" };

export default async function ChatPage() {
  const user     = await getSession();
  const sessions = await getChatSessions(user!.id);
  return <ChatClient initialSessions={sessions as never} />;
}

import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { getChat } from "@/lib/actions";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chat = await getChat(id);

  if (!chat) {
    notFound();
  }

  return <ChatView chatId={chat.id} messages={chat.messages} />;
}

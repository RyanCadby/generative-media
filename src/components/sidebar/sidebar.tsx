import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatListItem } from "./chat-list-item";
import { getChatList } from "@/lib/actions";

export async function Sidebar() {
  const chatList = await getChatList();

  return (
    <aside className="w-64 border-r bg-sidebar flex flex-col h-full shrink-0">
      <div className="p-4">
        <Link href="/chat/new">
          <Button className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chatList.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              No chats yet
            </p>
          ) : (
            chatList.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

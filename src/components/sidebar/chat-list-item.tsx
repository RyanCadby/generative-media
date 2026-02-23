"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteChat } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface ChatListItemProps {
  chat: {
    id: string;
    title: string;
    updatedAt: Date;
  };
}

export function ChatListItem({ chat }: ChatListItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${chat.id}`;

  const handleDelete = async () => {
    await deleteChat(chat.id);
  };

  return (
    <div
      className={cn(
        "group flex items-center rounded-md hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      <Link
        href={`/chat/${chat.id}`}
        className="flex-1 flex items-center gap-2 px-2 py-2 min-w-0"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">{chat.title}</span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

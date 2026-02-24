"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject, renameProject } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface ProjectListItemProps {
  project: {
    id: string;
    title: string;
    updatedAt: Date;
  };
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/create/${project.id}`;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(project.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(project.title);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== project.title) {
      await renameProject(project.id, trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(project.title);
    }
  };

  const handleDelete = async () => {
    await deleteProject(project.id);
  };

  const displayTitle =
    project.title.length > 25
      ? project.title.substring(0, 25) + "..."
      : project.title;

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-md hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 min-w-0">
          <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 text-sm bg-background border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ) : (
        <>
          <Link
            href={`/create/${project.id}`}
            className="flex-1 flex items-center gap-2 px-2 py-2 min-w-0"
          >
            <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm truncate">{displayTitle}</span>
          </Link>
          <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

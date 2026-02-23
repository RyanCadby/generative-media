"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MediaDisplay } from "@/components/media/media-display";
import { JobStatus } from "@/components/media/job-status";
import type { ChatMessage, ReuseSettings } from "./chat-view";

interface MessageBubbleProps {
  message: ChatMessage;
  nextMessage?: ChatMessage;
  onReuse: (settings: ReuseSettings) => void;
}

export function MessageBubble({
  message,
  nextMessage,
  onReuse,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  const activeJobs = message.generationJobs?.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );

  // For user messages, check if the next message (assistant response) has a completed job
  const completedJob = nextMessage?.generationJobs?.find(
    (j) => j.status === "completed" && j.model && j.provider
  );

  const canReuse = isUser && completedJob && nextMessage?.role === "assistant";

  const handleReuse = () => {
    if (!completedJob) return;

    const refImage = message.mediaAssets?.find((a) => a.type === "image");

    onReuse({
      generationType: completedJob.generationType,
      provider: completedJob.provider,
      modelId: completedJob.model!,
      prompt: message.content,
      referenceImageUrl: refImage?.filePath,
      referenceImageMimeType: refImage?.mimeType,
    });
  };

  return (
    <div
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "rounded-lg px-4 py-3 max-w-[85%] space-y-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {message.mediaAssets?.map((asset) => (
          <div key={asset.id}>
            {isUser && (
              <p className="text-xs opacity-70 mb-1">Reference image</p>
            )}
            <MediaDisplay asset={asset} />
          </div>
        ))}

        {activeJobs?.map((job) => (
          <JobStatus key={job.id} job={job} />
        ))}

        {canReuse && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleReuse}
          >
            <RotateCcw className="h-3 w-3" />
            Reuse
          </Button>
        )}
      </div>
    </div>
  );
}

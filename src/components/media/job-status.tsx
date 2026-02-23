"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobStatusProps {
  job: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    generationType: "text-to-image" | "text-to-video" | "image-to-video";
    error: string | null;
  };
}

const typeLabels: Record<string, string> = {
  "text-to-image": "Image",
  "text-to-video": "Video",
  "image-to-video": "Video",
};

export function JobStatus({ job }: JobStatusProps) {
  if (job.status === "completed") return null;

  if (job.status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Generation failed{job.error ? `: ${job.error}` : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Generating {typeLabels[job.generationType] ?? "media"}...
      </span>
      <Badge variant="secondary" className="text-xs">
        {job.status}
      </Badge>
    </div>
  );
}

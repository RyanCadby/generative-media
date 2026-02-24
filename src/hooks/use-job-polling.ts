"use client";

import { useCallback, useRef, useEffect } from "react";

const POLL_INTERVAL = 5000;

export interface JobProgress {
  jobId: string;
  progress: number | null;
}

export function useJobPolling(
  onComplete: (projectId: string) => Promise<void>,
  onProgress?: (jobProgress: JobProgress) => void
) {
  const activePolls = useRef<Set<string>>(new Set());

  // Keep latest callbacks in refs so poll closures never go stale
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
  });

  const stopPolling = useCallback((jobId: string) => {
    activePolls.current.delete(jobId);
  }, []);

  const startPolling = useCallback(
    (jobId: string, projectId: string) => {
      if (activePolls.current.has(jobId)) return;
      activePolls.current.add(jobId);

      const poll = async () => {
        // Stop if polling was cancelled
        if (!activePolls.current.has(jobId)) return;

        try {
          const response = await fetch(`/api/jobs/${jobId}`);
          const data = await response.json();

          if (data.progress != null) {
            onProgressRef.current?.({ jobId, progress: data.progress });
          }

          if (data.status === "completed" || data.status === "failed") {
            activePolls.current.delete(jobId);
            await onCompleteRef.current(projectId);
            return;
          }
        } catch (error) {
          console.error("Job polling error:", error);
        }

        // Schedule next poll only after this one finishes
        if (activePolls.current.has(jobId)) {
          setTimeout(poll, POLL_INTERVAL);
        }
      };

      // Start first poll after a delay
      setTimeout(poll, POLL_INTERVAL);
    },
    []
  );

  return { startPolling, stopPolling };
}

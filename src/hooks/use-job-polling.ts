"use client";

import { useCallback, useRef } from "react";

const POLL_INTERVAL = 5000;

export function useJobPolling(
  onComplete: (chatId: string) => Promise<void>
) {
  const pollIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const stopPolling = useCallback((jobId: string) => {
    const interval = pollIntervals.current.get(jobId);
    if (interval) {
      clearInterval(interval);
      pollIntervals.current.delete(jobId);
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string, chatId: string) => {
      // Don't duplicate
      if (pollIntervals.current.has(jobId)) return;

      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/jobs/${jobId}`);
          const data = await response.json();

          if (data.status === "completed" || data.status === "failed") {
            stopPolling(jobId);
            await onComplete(chatId);
          }
        } catch (error) {
          console.error("Job polling error:", error);
        }
      }, POLL_INTERVAL);

      pollIntervals.current.set(jobId, interval);
    },
    [onComplete, stopPolling]
  );

  return { startPolling, stopPolling };
}

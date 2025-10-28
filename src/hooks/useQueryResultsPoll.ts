"use client";
import { useEffect, useRef, useState } from "react";
import { pollQueryResults } from "@/lib/queries";
import type { components } from "@/types/api";

type PendingResultBundle = components["schemas"]["PendingResultBundle"];

export function useQueryResultsPoll() {
  const [lastReady, setLastReady] = useState<PendingResultBundle | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const seenChatIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function tick() {
      setIsPolling(true);
      try {
        const bundle = await pollQueryResults();
        if (!mounted) return;
        if (bundle?.status === "ready") {
          const currentId = (bundle as Record<string, unknown>).chat_id as string || `${bundle.transcript_id}:${(bundle as Record<string, unknown>).chat_id_user as string}`;
          if (currentId && seenChatIdRef.current === currentId) return;
          seenChatIdRef.current = currentId ?? null;
          setLastReady(bundle);
        }
      } finally {
        if (mounted) setIsPolling(false);
      }
    }
    tick();
    timerRef.current = window.setInterval(tick, 3000);
    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  return {
    lastReady,
    isPolling,
    refetch: async () => {
      await pollQueryResults();
    },
  };
}



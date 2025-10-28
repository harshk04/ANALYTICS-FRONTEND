"use client";
import { useState } from "react";
import { registerDashboardGraph, listDashboardGraphs } from "@/lib/queries";

export default function PinButton({ title, figure, html, graph_type, onPinned }: { title?: string | null; figure?: unknown; html?: string | null; graph_type?: string | null; onPinned?: () => void }) {
  const [isPending, setIsPending] = useState(false);

  const handlePin = async () => {
    setIsPending(true);
    try {
      // Generate a unique graph ID first
      const uniqueGraphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if graph already exists on dashboard (more lenient check)
      const existingGraphs = await listDashboardGraphs({ active_only: true });
      const graphExists = existingGraphs?.graphs?.some(existingGraph => 
        existingGraph.html_content === html && 
        existingGraph.title === (title || "Pinned Graph")
      );

      if (graphExists) {
        if (onPinned) {
          onPinned();
        }
        return;
      }
      
      await registerDashboardGraph({
        graph_id: uniqueGraphId,
        title: title || "Pinned Graph",
        graph_type: graph_type || null,
        figure: (figure as Record<string, unknown>) ?? null,
        html_content: html || null,
        active: true,
      });
      
      
      if (onPinned) {
        // Add a small delay to ensure the API has processed the new graph
        setTimeout(() => {
          onPinned();
        }, 100);
      }
    } catch (error) {
      console.error("Failed to pin graph:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button 
      onClick={handlePin} 
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-primary/50 bg-primary/20 px-3 py-1.5 text-white font-medium hover:bg-primary/30 hover:border-primary/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed pressable shadow-sm dark:border-primary/50 dark:bg-primary/20 dark:text-white dark:hover:bg-primary/30 dark:hover:border-primary/60 light:border-blue-500/60 light:bg-blue-500/20 light:text-blue-700 light:hover:bg-blue-500/30 light:hover:border-blue-500/70"
      title="Pin to dashboard"
    >
      {isPending ? (
        <>
          <div className="w-3 h-3 border border-primary/50 border-t-transparent rounded-full animate-spin" />
          <span>Pinning…</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <span>Pin to Dashboard</span>
        </>
      )}
    </button>
  );
}



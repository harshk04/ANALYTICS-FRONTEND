"use client";
import { useState } from "react";
import { unregisterDashboardGraph } from "@/lib/queries";
import { IconPinnedOff } from "@tabler/icons-react";

export default function UnpinButton({ graphId, onUnpinned }: { graphId: string; onUnpinned?: () => void }) {
  const [isPending, setIsPending] = useState(false);

  const handleUnpin = async () => {
    setIsPending(true);
    try {
      
      // Check if this is a fallback ID (not a real graph ID)
      if (graphId.startsWith('fallback-')) {
        // For fallback IDs, just remove locally without API call
        if (onUnpinned) {
          onUnpinned();
        }
        return;
      }
      
      await unregisterDashboardGraph(graphId);
      
      // Call the provided callback
      if (onUnpinned) {
        onUnpinned();
      }
    } catch (error) {
      console.error("❌ Failed to unpin graph:", error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('405')) {
          // Try to remove locally as fallback
          if (onUnpinned) {
            onUnpinned();
          }
          return; // Don't show error if we successfully removed locally
        } else if (error.message.includes('404')) {
          // Graph not found, remove locally
          if (onUnpinned) {
            onUnpinned();
          }
          return; // Don't show error if we successfully removed locally
        } else if (error.message.includes('401') || error.message.includes('403')) {
          alert("You don't have permission to remove this graph.");
        } else {
          alert(`Failed to remove graph: ${error.message}`);
        }
      } else {
        alert("Failed to remove graph from dashboard. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleUnpin}
      disabled={isPending}
      title="Unpin from dashboard"
      className="inline-flex items-center gap-1 rounded-md border border-slate-400/30 bg-slate-500/10 px-2 py-1 text-xs text-slate-300 hover:bg-red-500/15 hover:text-red-200 hover:border-red-400/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed pressable"
    >
      {isPending ? (
        <span>Unpinning…</span>
      ) : (
        <>
          <IconPinnedOff size={14} />
          <span>Unpin</span>
        </>
      )}
    </button>
  );
}



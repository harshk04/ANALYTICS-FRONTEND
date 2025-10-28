"use client";
import { listDashboardGraphs, processQuery, listTranscripts, deleteTranscript, createTranscript, updateTranscript, authMe, registerDashboardGraph, unregisterDashboardGraph, deleteDashboardGraph } from "@/lib/queries";
import { extractTranscriptId } from "@/lib/ids";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryResultsPoll } from "@/hooks/useQueryResultsPoll";
import { HTMLRender } from "@/components/ui/HTMLRender";
import ChartRenderer from "@/components/ui/ChartRenderer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ErrorNotification from "@/components/ui/ErrorNotification";
import PinButton from "@/components/PinButton";
import UnpinButton from "@/components/UnpinButton";
import VoiceChat from "@/components/VoiceChat";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import type { components } from "@/types/api";
import { getDashboardTranscriptId, setDashboardTranscriptId, clearDashboardTranscriptId } from "@/lib/dashboardSession";
import { getAccessToken, clearAccessToken } from "@/lib/auth";

type GraphItem = components["schemas"]["GraphItem"];
type DashboardGraph = components["schemas"]["DashboardGraphMetadataModel"];
type LiveKitTranscript = { role: "user" | "assistant"; text: string };
type TranscriptSummary = { id: string; title: string | null };

export default function DashboardPage() {
  const { theme } = useTheme();
  const [question, setQuestion] = useState("");
  const [transcriptId, setTranscriptId] = useState<string | null>(getDashboardTranscriptId());
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[]; userQuestion?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingAnswer, setIsAwaitingAnswer] = useState(false);
  const [gridCols, setGridCols] = useState<1 | 2 | 3>(2);
  const [windowWidth, setWindowWidth] = useState(0);

  // Debug grid state changes
  useEffect(() => {
    // Grid columns changed
  }, [gridCols]);

  // Track window width for responsive grid
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive grid columns
  const getGridColumns = () => {
    if (gridCols === 1) return '1fr';
    if (gridCols === 2) return windowWidth >= 1024 ? 'repeat(2, 1fr)' : '1fr';
    if (gridCols === 3) {
      if (windowWidth >= 1280) return 'repeat(3, 1fr)';
      if (windowWidth >= 1024) return 'repeat(2, 1fr)';
      return '1fr';
    }
    return '1fr';
  };
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatWidthPercent, setChatWidthPercent] = useState(30);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSummary[]>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const ignoreResponsesRef = useRef(false);
  const [chatKey, setChatKey] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [responseAdded, setResponseAdded] = useState(false);
  const [currentUserQuestion, setCurrentUserQuestion] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const layoutRef = useRef<HTMLDivElement | null>(null);

  // Local chat persistence per transcript
  function chatStorageKey(tid: string) { return `chat_history:${tid}`; }
  function loadChatFromStorage(tid: string) {
    if (typeof window === "undefined") return [] as Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>;
    try {
      const raw = localStorage.getItem(chatStorageKey(tid));
      if (!raw) return [] as Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>;
      return [];
    } catch {
      return [];
    }
  }
  const saveChatToStorage = useCallback((tid: string, items: Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(chatStorageKey(tid), JSON.stringify(items.slice(-200)));
    } catch {    }
  }, []);


  function showSuccess(text: string) {
    setNotice({ text, type: "success" });
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 1800);
  }

  const loadTranscriptsList = useCallback(async () => {
    setIsLoadingTranscripts(true);
    try {
      const data = await listTranscripts({});
      const mapped = (Array.isArray(data) ? data : []).map((item) => {
        const id = extractTranscriptId(item);
        if (!id) return null;
        const title = (item as { title?: string | null })?.title ?? null;
        return { id, title } as TranscriptSummary;
      }).filter(Boolean) as TranscriptSummary[];
      setTranscripts(mapped);
      return mapped;
    } catch (error) {
      console.error("Failed to load transcripts:", error);
      return [];
    } finally {
      setIsLoadingTranscripts(false);
    }
  }, []);

  useEffect(() => {
    loadTranscriptsList();
  }, [loadTranscriptsList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts = loadTranscriptsList;
    return () => {
      if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts === loadTranscriptsList) {
        delete (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts;
      }
    };
  }, [loadTranscriptsList]);

  const handleTranscriptSelect = useCallback(async (id: string) => {
    setTranscriptId(id);
    setDashboardTranscriptId(id);
    const saved = loadChatFromStorage(id);
    setChat(Array.isArray(saved) ? saved : []);
    setIsFirstQuestion(false);
    setIsAwaitingAnswer(false);
    setCurrentUserQuestion(null);
    setChatKey((prev) => prev + 1);
    ignoreResponsesRef.current = false;
  }, []);

  const handleCreateNewTranscript = useCallback(async () => {
    try {
      const newTranscript = await createTranscript({
        title: "New Chat",
        metadata: {
          created_at: new Date().toISOString(),
          source: "dashboard",
        },
      });
      const newTranscriptId = extractTranscriptId(newTranscript);
      if (!newTranscriptId) {
        throw new Error("Failed to create transcript");
      }
      setChat([]);
      setTranscriptId(newTranscriptId);
      setDashboardTranscriptId(newTranscriptId);
      setError(null);
      ignoreResponsesRef.current = false;
      setIsAwaitingAnswer(false);
      setIsFirstQuestion(true);
      setCurrentUserQuestion(null);
      setChatKey((prev) => prev + 1);
      await loadTranscriptsList();
      showSuccess("New chat started");
      return newTranscriptId;
    } catch (error) {
      console.error("Failed to create new transcript:", error);
      setError("Failed to create new chat. Please try again.");
      return null;
    }
  }, [loadTranscriptsList]);

  const handleTranscriptDelete = useCallback(async (id: string) => {
    try {
      await deleteTranscript(id);
      if (typeof window !== "undefined") {
        localStorage.removeItem(chatStorageKey(id));
      }
      showSuccess("Chat deleted successfully!");
      const updated = await loadTranscriptsList();
      if (transcriptId === id) {
        if (updated.length > 0) {
          const fallbackId = updated[0].id;
          await handleTranscriptSelect(fallbackId);
        } else {
          await handleCreateNewTranscript();
        }
      }
    } catch (error) {
      console.error("Failed to delete transcript:", error);
      setNotice({ text: "Failed to delete chat. Please try again.", type: "error" });
    }
  }, [handleCreateNewTranscript, handleTranscriptSelect, loadTranscriptsList, setNotice, transcriptId]);

  const handleTranscriptRename = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      await updateTranscript(id, { title: trimmed });
      setTranscripts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: trimmed } : item))
      );
      showSuccess("Chat renamed");
    } catch (error) {
      console.error("Failed to rename transcript:", error);
      setNotice({ text: "Failed to rename chat. Please try again.", type: "error" });
    }
  }, []);

  const clampPercent = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  const updateChatWidthFromPointer = useCallback((clientX: number | null) => {
    if (!layoutRef.current || clientX === null || Number.isNaN(clientX)) return;
    const bounds = layoutRef.current.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const relativeX = clampPercent(clientX - bounds.left, 0, bounds.width);
    const dashboardPercent = (relativeX / bounds.width) * 100;
    const newChatPercent = clampPercent(100 - dashboardPercent, 20, 60);
    setChatWidthPercent(newChatPercent);
  }, [clampPercent]);

  useEffect(() => {
    if (!isResizingChat) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateChatWidthFromPointer(event.clientX);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      updateChatWidthFromPointer(touch ? touch.clientX : null);
    };
    const stopResizing = () => {
      setIsResizingChat(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", stopResizing);
    window.addEventListener("touchcancel", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopResizing);
      window.removeEventListener("touchcancel", stopResizing);
    };
  }, [isResizingChat, updateChatWidthFromPointer]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousCursor = document.body.style.cursor;
    if (isResizingChat) {
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [isResizingChat]);

  // Persist chat for current transcript
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!transcriptId) return;
    saveChatToStorage(transcriptId, chat);
  }, [chat, transcriptId, saveChatToStorage]);


  // Require login for dashboard and fetch user data
  useEffect(() => {
    if (typeof window === "undefined") return; // Skip on server-side
    
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    
      // Show stored email immediately while API call is in progress
      const storedEmail = localStorage.getItem("user_email");
      if (storedEmail) {
        setUserEmail(storedEmail);
        setUserName(storedEmail);
      }
      
      // Fetch real user data from API with timeout
      const fetchUserData = async () => {
        try {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("API timeout")), 3000)
          );
          
          const userData = await Promise.race([authMe(), timeoutPromise]);
          // Extract user information from API response
          // The API returns user data nested under 'user' property
          const user = (userData as { user?: { email?: string; name?: string; display_name?: string } })?.user;
          const email = user?.email;
          const name = user?.name;
          const displayName = user?.display_name;
          
          // Set user data
          if (email) {
            setUserEmail(email);
            // Store email in localStorage for future use
          if (typeof window !== "undefined") {
            localStorage.setItem("user_email", email);
          }
          }
          
          // Use display_name, name, or email as the display name
          const finalName = displayName || name || email || "User";
          setUserName(finalName);
          
          // Also set userEmail for consistency
          if (email) {
            setUserEmail(email);
          }
          
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // If API fails and we don't have stored data, set a fallback
          if (!userName && !userEmail) {
            setUserName("User");
            setUserEmail("user@indus.com");
          }
        } finally {
          setIsLoadingUser(false);
          setIsCheckingAuth(false);
        }
      };
      
      fetchUserData();
  }, []);


  const [isFirstQuestion, setIsFirstQuestion] = useState(false);

  // Voice chat handlers
  const handleVoiceTranscript = useCallback(({ role, text }: LiveKitTranscript) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setChat((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && (last.text || "").trim() === trimmed) {
        return prev;
      }
      return [...prev, { role, text: trimmed }];
    });

    if (role === "user") {
      setQuestion("");
      setCurrentUserQuestion(trimmed);
      setIsAwaitingAnswer(true);
    } else {
      setIsAwaitingAnswer(false);
    }
  }, [setChat, setCurrentUserQuestion, setIsAwaitingAnswer, setQuestion]);

  const handleVoiceError = useCallback((error: string) => {
    setError(error);
  }, []);

  const handleSpeakingChange = useCallback((_speaking: boolean) => {
    // Handle speaking change if needed
  }, []);

  const handleInterimTranscript = useCallback((text: string) => {
    setInterimTranscript(text);
  }, []);

  // Text-to-speech for AI responses (LiveKit TTS)
  const speakResponse = useCallback((_text: string) => {
    if (isVoiceEnabled) {
      // LiveKit will handle TTS through the voice chat component
      // The actual TTS is handled by the VoiceChat component's LiveKit integration
    }
  }, [isVoiceEnabled]);

  const toggleVoiceChat = useCallback(() => {
    setIsVoiceEnabled(!isVoiceEnabled);
  }, [isVoiceEnabled]);

  const sendQuestion = useCallback(async (q: string) => {
    ignoreResponsesRef.current = false;
    
    try {
      const res = await processQuery({ natural_language_query: q, transcript_id: transcriptId ?? undefined });
      if (!transcriptId && res?.transcript_id) {
        const tid = res.transcript_id as string;
        setTranscriptId(tid);
        setDashboardTranscriptId(tid);
      }
      
      // If this is the first question for a new transcript, update the transcript title
      if (isFirstQuestion && res?.transcript_id) {
        const currentTranscriptId = res.transcript_id as string;
        try {
          await updateTranscript(currentTranscriptId, {
            title: q.length > 50 ? q.substring(0, 50) + "..." : q
          });
          // Refresh transcript list to show updated title
          if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts) {
            (window as unknown as { refreshTranscripts: () => void }).refreshTranscripts();
          }
          setIsFirstQuestion(false); // Reset after first question
        } catch (error) {
          console.error("Failed to update transcript title:", error);
        }
      }
    } catch (e) {
      const err = e as { message?: string; response?: { status?: number; statusText?: string; data?: unknown } };
      let message = "Request failed. Please try again.";
      const status = err?.response?.status;
      const statusText = err?.response?.statusText;
      const data = err?.response?.data as unknown;
      const fromDetailArray = Array.isArray((data as Record<string, unknown>)?.detail)
        ? ((data as Record<string, unknown>).detail as Array<{ msg?: string } | string>).map((d) => (typeof d === 'object' ? d?.msg : d) || d).join("; ")
        : null;
      const fromDetail = typeof (data as Record<string, unknown>)?.detail === "string" ? (data as Record<string, unknown>).detail as string : fromDetailArray;
      const fromMessage = (data as Record<string, unknown>)?.message as string | undefined;
      const fromError = (data as Record<string, unknown>)?.error as string | undefined;
      if (fromDetail || fromMessage || fromError) {
        message = fromDetail || fromMessage || fromError || message;
      } else if (status) {
        message = `HTTP ${status}${statusText ? ` ${statusText}` : ""}`;
      } else if (err?.message) {
        message = err.message;
      }
      const notFound = typeof fromDetail === "string" && fromDetail.toLowerCase().includes("transcript not found");
      if (notFound) {
        setTranscriptId(null);
        clearDashboardTranscriptId();
        setChat([]);
        // Don't show error message, just silently start fresh
        return;
      } else if (status === 500 && !fromMessage && !fromDetail && !fromError) {
        message = "Server error (500). Please try again or contact support.";
      }
      console.error("processQuery failed", e);
      setError(message);
      setIsAwaitingAnswer(false);
    } finally {
      // Cleanup completed
    }
  }, [transcriptId, isFirstQuestion]);

  const [graphs, setGraphs] = useState<DashboardGraph[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  async function loadGraphs() {
    setIsFetching(true);
    try {
      const res = await listDashboardGraphs({ active_only: true });
      setGraphs(res?.graphs ?? []);
    } finally {
      setIsFetching(false);
    }
  }

  // Function to remove a specific graph from local state
  const removeGraphFromState = (graphIdToRemove: string) => {
    setGraphs(prevGraphs => {
      
      // Use index-based filtering for more reliable removal
      const filteredGraphs = prevGraphs.filter((graph, index) => {
        const currentGraphId = graph.graph_id || `fallback-${index}`;
        const shouldKeep = currentGraphId !== graphIdToRemove;
        return shouldKeep;
      });
      
      return filteredGraphs;
    });
  };

  // Function to remove all graphs from local state
  const removeAllGraphsFromState = () => {
    setGraphs([]);
  };
  useEffect(() => {
    loadGraphs();
  }, []);

  // Set up global refresh function for dashboard graphs
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { refreshDashboardGraphs?: () => void }).refreshDashboardGraphs = loadGraphs;
    }
    
    return () => {
      if (typeof window !== "undefined") {
        delete (window as unknown as { refreshDashboardGraphs?: () => void }).refreshDashboardGraphs;
      }
    };
  }, []);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    if (q.length < 2) {
      setError("Please enter a more descriptive question.");
      return;
    }
    setCurrentUserQuestion(q);
    setChat((prev) => [...prev, { role: "user", text: q }]);
    setError(null);
    sendQuestion(q);
    setQuestion("");
    setIsAwaitingAnswer(true);
  }

  const poll = useQueryResultsPoll();

  useEffect(() => {
    const bundle = poll.lastReady;
    if (!bundle) return;
    if (!transcriptId && bundle.transcript_id) {
      setTranscriptId(bundle.transcript_id);
      setDashboardTranscriptId(bundle.transcript_id);
    }
    if (bundle.transcript_id && transcriptId && bundle.transcript_id !== transcriptId) return;
    if (ignoreResponsesRef.current) {
      return; // user cancelled current wait
    }
    // Get description from the correct location in the API response
    const description = bundle.description?.description;
    // Get graphs from the correct location in the API response (PendingResultBundle structure)
    const allGraphs = (bundle.graphs?.graphs as GraphItem[] | undefined) ?? [];
    
    
    // Helper function to normalize graph structure
    const normalizeGraph = (g: any) => {
      let normalized;
      
      // If it's the new API structure with payload
      if (g.type === "graph" && g.payload) {
        normalized = {
          ...g,
          graph_type: g.payload.graph_type,
          data: g.payload.data,
          title: g.payload.title,
          insight: g.payload.insight,
          // Keep original structure for compatibility
          html: g.payload.html,
          figure: g.payload.figure
        };
      }
      // If it's a summary_card, ensure it has the right structure
      else if (g.type === "summary_card" || g.graph_type === "summary_card") {
        normalized = {
          ...g,
          graph_type: g.graph_type || "summary_card",
          data: g.data || [],
          title: g.title || "Summary",
          insight: g.insight || g.summary?.description || ""
        };
      }
      // If it already has the expected structure, return as is
      else {
        normalized = g;
      }

      // Handle employee data aggregation for charts
      if (normalized.title?.toLowerCase().includes('employee') && 
          normalized.data?.length > 0 && 
          normalized.data[0]?.employee_name) {
        
        // Group by department and count employees
        const departmentCounts = normalized.data.reduce((acc: any, employee: any) => {
          const dept = employee.department || 'Unknown';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {});

        // Convert to chart format
        normalized.data = Object.entries(departmentCounts).map(([department, count]) => ({
          department,
          value: count
        }));

      }

      return normalized;
    };

    // Updated graph detection logic to handle the new API structure
    const filteredGraphs = allGraphs.filter((g: any) => {
      
      // Check for old structure (html/figure)
      if (g.html || g.figure) {
        return true;
      }
      
      // Check for new structure (type: "graph" with payload)
      if (g.type === "graph" && g.payload && g.payload.graph_type && g.payload.data) {
        return true;
      }
      
      // Check for direct graph_type and data properties (even if data is empty)
      if (g.graph_type && (g.data !== undefined)) {
        return true;
      }
      
      // Check for summary_card type graphs
      if (g.type === "summary_card" || g.graph_type === "summary_card") {
        return true;
      }
      
      return false;
    }).map(normalizeGraph);
    
    const hasDescription = typeof description === "string" && description.trim().length > 0;
    const hasGraphs = filteredGraphs.length > 0;
    if (hasDescription || hasGraphs) {
      // Add response first
      setChat((prev) => [...prev, { role: "assistant", text: hasDescription ? description : undefined, graphs: hasGraphs ? filteredGraphs : undefined, userQuestion: currentUserQuestion || undefined }]);
      // Mark that response was added
      setResponseAdded(true);
      
      // Auto-speak the response if voice chat is enabled and there's text content
      if (isVoiceEnabled && hasDescription && description) {
        speakResponse(description);
      }
      // Clear the current user question
      setCurrentUserQuestion(null);
    } else {
      // No content returned; stop spinner to avoid hanging UI
      setIsAwaitingAnswer(false);
    }
  }, [poll.lastReady, transcriptId]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Prefer scrolling the messages container to the bottom to avoid page scroll on mobile
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  // Stop loader when response is actually rendered
  useEffect(() => {
    if (responseAdded && isAwaitingAnswer) {
      // Wait for the response to be fully rendered before stopping the loader
      const timer = setTimeout(() => {
        setIsAwaitingAnswer(false);
        setResponseAdded(false);
      }, 500); // Give enough time for complex graphs to render
      
      return () => clearTimeout(timer);
    }
  }, [responseAdded, isAwaitingAnswer]);

  // Audible chime on assistant response
  useEffect(() => {
    if (!isAwaitingAnswer) return;
    // This effect is toggled off in the poll handler when content arrives
  }, [isAwaitingAnswer]);

  // Enhanced loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center page-gradient">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full border-4 mx-auto ${
              theme === "light" ? "border-slate-300" : "border-white/20"
            }`}></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-transparent border-t-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <h3 className={`text-lg font-semibold ${
              theme === "light" 
                ? "bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent"
                : "text-white indus-text-gradient"
            }`}>Loading Dashboard</h3>
            <p className={`${
              theme === "light" ? "text-slate-600" : "text-white/70"
            }`}>Preparing your analytics workspace...</p>
          </div>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-success rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`flex min-h-screen ${
        theme === "light"
          ? "bg-gradient-to-br from-white via-slate-50 to-gray-100"
          : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      }`}>
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          transcripts={transcripts}
          onSelect={handleTranscriptSelect}
          onNewChat={handleCreateNewTranscript}
          onDelete={handleTranscriptDelete}
          onRename={handleTranscriptRename}
          activeTranscriptId={transcriptId}
          isLoading={isLoadingTranscripts}
          theme={theme}
          userName={userName}
          userEmail={userEmail}
          isLoadingUser={isLoadingUser}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={layoutRef}
            className={`dashboard-container flex flex-col lg:flex-row flex-1 w-full ${
              theme === "light"
                ? "bg-gradient-to-br from-white/60 via-slate-50/60 to-gray-100/60"
                : "bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80"
            }`}
          >
      {/* Main Content Area - Left Side */}
      <div className="w-full lg:flex-1 min-w-0">
        <div className="dashboard-content p-4 sm:p-6 space-y-4 sm:space-y-6 auto-hide-scrollbar scroll-smooth">
          {notice && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
              <div className={`glass-fade-in inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
                notice.type === "success" 
                  ? theme === "light"
                    ? "bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-800 ring-2 ring-emerald-200/50"
                    : "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/40 text-emerald-200 ring-1 ring-emerald-400/30"
                  : theme === "light"
                    ? "bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 text-red-800 ring-2 ring-red-200/50"
                    : "bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/40 text-red-200 ring-1 ring-red-400/30"
              }`}>
                <span className="text-lg">{notice.type === "success" ? "✅" : "❌"}</span>
                <span>{notice.text}</span>
              </div>
            </div>
          )}
          
          {/* Enhanced Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 fade-in-up">
            <div className="flex items-center gap-6">
              <div className="hover-scale group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Logo size="xl" className="drop-shadow-2xl relative z-10" />
              </div>
              <div className="space-y-2">
                <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight ${
                  theme === "light"
                    ? "bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-gray-100 via-blue-200 to-purple-200 bg-clip-text text-transparent"
                }`}>Analytics Dashboard</h1>
                <div className="flex items-center gap-3">
                  <p className={`text-sm font-medium ${
                    theme === "light" ? "text-slate-600" : "text-slate-400"
                  }`}>Real-time insights and data visualizations</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className={`text-xs font-medium ${
                      theme === "light" ? "text-emerald-600" : "text-emerald-400"
                    }`}>Live</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              {/* Enhanced Grid Controls */}
              <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl ${
                theme === "light" 
                  ? "bg-white/80 border border-slate-200 shadow-sm backdrop-blur-sm" 
                  : "bg-white/5 border border-white/10 backdrop-blur-sm"
              }`}>
                <span className={`text-sm font-semibold ${
                  theme === "light" ? "text-slate-700" : "text-slate-300"
                }`}>Layout</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGridCols(1)}
                    className={`inline-flex items-center justify-center w-10 h-9 rounded-lg border text-sm transition-all duration-200 pressable hover-scale ${
                      gridCols === 1 
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 border-transparent shadow-lg shadow-blue-500/30 text-white" 
                        : theme === "light"
                        ? "bg-white border-slate-300 hover:bg-blue-50 hover:border-blue-500 text-slate-600 shadow-sm"
                        : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-blue-500/50 text-slate-400"
                    }`}
                    title="1 column"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <rect x="3" y="5" width="14" height="10" rx="2" className="fill-current opacity-90" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCols(2)}
                    className={`inline-flex items-center justify-center w-10 h-9 rounded-lg border text-sm transition-all duration-200 pressable hover-scale ${
                      gridCols === 2 
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 border-transparent shadow-lg shadow-blue-500/30 text-white" 
                        : theme === "light"
                        ? "bg-white border-slate-300 hover:bg-blue-50 hover:border-blue-500 text-slate-600 shadow-sm"
                        : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-blue-500/50 text-slate-400"
                    }`}
                    title="2 columns"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                      <rect x="3" y="5" width="6" height="10" rx="2" className="fill-current opacity-90" />
                      <rect x="11" y="5" width="6" height="10" rx="2" className="fill-current opacity-60" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCols(3)}
                    className={`inline-flex items-center justify-center w-10 h-9 rounded-lg border text-sm transition-all duration-200 pressable hover-scale ${
                      gridCols === 3 
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 border-transparent shadow-lg shadow-blue-500/30 text-white" 
                        : theme === "light"
                        ? "bg-white border-slate-300 hover:bg-blue-50 hover:border-blue-500 text-slate-600 shadow-sm"
                        : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-blue-500/50 text-slate-400"
                    }`}
                    title="3 columns"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                      <rect x="2.5" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-90" />
                      <rect x="7.75" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-75" />
                      <rect x="13" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-60" />
                    </svg>
                  </button>
                </div>
              </div>
              
              
              {/* Enhanced User Info and Actions */}
              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <ThemeToggle />
                
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl hover-lift group transition-all duration-200 ${
                  theme === "light" 
                    ? "bg-white/80 border border-slate-200 shadow-sm backdrop-blur-sm" 
                    : "bg-white/5 border border-white/10 backdrop-blur-sm"
                }`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-blue-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                      {isLoadingUser ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        userName || userEmail || "User"
                      )}
                    </span>
                    <span className={`text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                      {isLoadingUser ? "" : "Dashboard User"}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    clearAccessToken();
                    if (typeof window !== "undefined") window.location.href = "/login";
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 pressable hover-glow group ${
                    theme === "light"
                      ? "bg-white/80 border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-600 hover:text-red-600 shadow-sm backdrop-blur-sm"
                      : "bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 backdrop-blur-sm"
                  }`}
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold">Logout</span>
                </button>
              </div>
            </div>
          </div>


          {/* Enhanced Dashboard Graphs Grid */}
          <div className="fade-in-up">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                    theme === "light" 
                      ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-200" 
                      : "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      theme === "light" ? "text-blue-600" : "text-blue-400"
                    }`}>
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-bold ${theme === "light" ? "text-slate-900" : "text-gray-100"}`}>Visualizations</h2>
                    <p className={`text-xs sm:text-sm ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                      {graphs.length} pinned chart{graphs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full shadow-lg shadow-blue-500/50" />
              </div>
              
              {graphs.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl ${
                    theme === "light"
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className={`text-sm font-medium ${
                        theme === "light" ? "text-emerald-700" : "text-emerald-400"
                      }`}>Active Dashboard</span>
                    </div>
                  </div>
                  
                  {/* Delete All Button */}
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to DELETE all ${graphs.length} graphs from the dashboard? This action cannot be undone.`)) {
                        try {
                          // Delete all graphs via API
                          const deletePromises = graphs.map((graph, index) => {
                            const graphId = graph.graph_id || `fallback-${index}`;
                            if (graphId.startsWith('fallback-')) {
                              return Promise.resolve(); // Skip API call for fallback IDs
                            }
                            return deleteDashboardGraph(graphId).catch(error => {
                              console.warn('Failed to delete graph via API:', error);
                              return Promise.resolve(); // Continue with other graphs
                            });
                          });
                          
                          await Promise.allSettled(deletePromises);
                          
                          // Remove all graphs from local state
                          removeAllGraphsFromState();
                          showSuccess(`All ${graphs.length} graphs deleted from dashboard!`);
                        } catch (error) {
                          console.error('Error deleting all graphs:', error);
                          // Still remove locally even if API fails
                          removeAllGraphsFromState();
                          showSuccess(`All ${graphs.length} graphs deleted from dashboard!`);
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 pressable hover-glow group ${
                      theme === "light"
                        ? "bg-white/80 border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 shadow-sm backdrop-blur-sm"
                        : "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 backdrop-blur-sm"
                    }`}
                    title="Delete all graphs from dashboard (permanent)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform duration-200">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold">Delete All</span>
                  </button>
                </div>
              )}
            </div>
            
            {isFetching ? (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="indus-card h-[600px] flex flex-col p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-white/10 rounded w-24"></div>
                          <div className="h-3 bg-white/5 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-white/10 rounded-lg"></div>
                    </div>
                    <div className="min-h-[400px] bg-white/5 rounded-lg flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/10 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : graphs.length === 0 ? (
              <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-8">
                {/* Enhanced Hero Section */}
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-white">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className={`text-3xl font-bold ${
                      theme === "light" ? "text-slate-900" : "text-gray-100"
                    }`}>
                      Your Dashboard Awaits
                    </h3>
                    <p className={`text-base max-w-lg mx-auto leading-relaxed ${
                      theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>
                      Start conversations with AI to generate beautiful visualizations and pin your favorite insights here
                    </p>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                  <div className={`p-4 rounded-xl text-center transition-all duration-300 ${
                    theme === "light"
                      ? "bg-white/80 border border-slate-200 hover:border-blue-500/40 shadow-sm backdrop-blur-sm"
                      : "bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/40"
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                      theme === "light" ? "bg-blue-100" : "bg-blue-500/20"
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`}>
                        <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                      </svg>
                    </div>
                    <h4 className={`text-sm font-semibold mb-1 ${
                      theme === "light" ? "text-slate-900" : "text-gray-100"
                    }`}>Ask Questions</h4>
                    <p className={`text-xs ${
                      theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>Chat with AI to analyze data</p>
                  </div>

                  <div className={`p-4 rounded-xl text-center transition-all duration-300 ${
                    theme === "light"
                      ? "bg-white/80 border border-slate-200 hover:border-purple-500/40 shadow-sm backdrop-blur-sm"
                      : "bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/40"
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                      theme === "light" ? "bg-purple-100" : "bg-purple-500/20"
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${
                        theme === "light" ? "text-purple-600" : "text-purple-400"
                      }`}>
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <h4 className={`text-sm font-semibold mb-1 ${
                      theme === "light" ? "text-slate-900" : "text-gray-100"
                    }`}>Generate Charts</h4>
                    <p className={`text-xs ${
                      theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>Get instant visualizations</p>
                  </div>

                  <div className={`p-4 rounded-xl text-center transition-all duration-300 ${
                    theme === "light"
                      ? "bg-white/80 border border-slate-200 hover:border-emerald-500/40 shadow-sm backdrop-blur-sm"
                      : "bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/40"
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                      theme === "light" ? "bg-emerald-100" : "bg-emerald-500/20"
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${
                        theme === "light" ? "text-emerald-600" : "text-emerald-400"
                      }`}>
                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                      </svg>
                    </div>
                    <h4 className={`text-sm font-semibold mb-1 ${
                      theme === "light" ? "text-slate-900" : "text-gray-100"
                    }`}>Pin Insights</h4>
                    <p className={`text-xs ${
                      theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>Save your favorites</p>
                  </div>
                </div>

                {/* Enhanced CTA */}
                <button
                  onClick={() => {
                    const chatInput = document.querySelector('textarea[placeholder*="Ask a question"]') as HTMLTextAreaElement;
                    if (chatInput) {
                      chatInput.focus();
                    }
                  }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                    <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                  </svg>
                  <span className="text-white font-semibold">Start Your First Query</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-300">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Quick Examples */}
                <div className="text-center space-y-3">
                  <p className={`text-xs uppercase tracking-wider font-medium ${
                    theme === "light" ? "text-slate-500" : "text-slate-500"
                  }`}>Try asking</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      theme === "light"
                        ? "bg-slate-100 border border-slate-200 text-slate-700 hover:border-blue-500/50 hover:bg-blue-50"
                        : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:border-blue-500/50"
                    }`}
                          onClick={() => setQuestion("Show employee distribution by department")}>
                      "Employee distribution"
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      theme === "light"
                        ? "bg-slate-100 border border-slate-200 text-slate-700 hover:border-purple-500/50 hover:bg-purple-50"
                        : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:border-purple-500/50"
                    }`}
                          onClick={() => setQuestion("Show inventory levels by product")}>
                      "Inventory levels"
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      theme === "light"
                        ? "bg-slate-100 border border-slate-200 text-slate-700 hover:border-emerald-500/50 hover:bg-emerald-50"
                        : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:border-emerald-500/50"
                    }`}
                          onClick={() => setQuestion("Display revenue by month")}>
                      "Revenue by month"
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="dashboard-grid"
                style={{
                  gridTemplateColumns: getGridColumns()
                }}
              >
                {graphs.map((graph, index) => {
                  // Generate a fallback ID if graph_id is missing
                  const graphId = graph.graph_id || `fallback-${index}`;
                  
                  return (
                    <div key={graphId} className="indus-card group hover-lift animated-bg h-[500px] sm:h-[550px] md:h-[600px] lg:h-[650px] xl:h-[700px] flex flex-col relative overflow-hidden" style={{ animationDelay: `${index * 0.1}s` }}>
                      {/* Background gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Header - Fixed height */}
                      <div className="relative flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 z-10">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="relative group/icon">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm group-hover/icon:blur-md transition-all duration-300"></div>
                              <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border ${
                                theme === "light" ? "border-blue-600/40" : "border-blue-500/30"
                              } group-hover/icon:scale-110 transition-transform duration-200`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                  theme === "light" ? "text-blue-700" : "text-blue-400"
                                } group-hover/icon:rotate-12 transition-transform duration-200`}>
                                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                </svg>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className={`text-base sm:text-lg font-bold group-hover:scale-105 transition-transform duration-200 truncate ${
                                theme === "light" ? "text-slate-900" : "text-gray-100"
                              }`}>
                                {graph.title || `Chart ${index + 1}`}
                              </h3>
                              <p className={`text-xs sm:text-sm font-medium truncate ${
                                theme === "light" ? "text-slate-600" : "text-slate-400"
                              }`}>
                                {(graph as any).graph_type || 'Visualization'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <UnpinButton
                              graphId={graphId}
                              onUnpinned={() => {
                                showSuccess("Graph removed from dashboard!");
                                removeGraphFromState(graphId);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    
                    {/* Content Area - Flexible height */}
                    <div className="relative flex-1 px-4 sm:px-6 pb-3 sm:pb-4 z-10">
                      <div className={`h-full rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl ${
                        theme === "light" 
                          ? "bg-white/90 border border-slate-200 shadow-sm backdrop-blur-sm" 
                          : "bg-white/5 border border-white/10 backdrop-blur-sm"
                      }`}>
                        {/* Content background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Chart renderer */}
                        <div className="relative w-full h-full p-4">
                          <ChartRenderer 
                            key={`chart-${graphId}-${index}`}
                            data={(graph as any).data || []} 
                            type={(graph as any).graph_type || 'bar'} 
                            title={(graph as any).title || undefined}
                            graph_type={(graph as any).graph_type}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer - Fixed height */}
                    <div className="relative flex-shrink-0 px-6 pb-6 z-10">
                      {graph.description && (
                        <div className={`relative p-4 rounded-xl transition-all duration-200 hover:shadow-lg ${
                          theme === "light"
                            ? "bg-gradient-to-r from-slate-50/90 to-white/90 border border-slate-200"
                            : "bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50"
                        }`}>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                          <p className={`relative text-sm line-clamp-2 leading-relaxed font-medium ${
                            theme === "light" ? "text-slate-700" : "text-neutral-400"
                          }`}>
                            {graph.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Fixed Right Chat Panel - Full Height */}
      <div
        className="dashboard-chat-panel relative w-full lg:w-auto indus-card chat-panel border-t lg:border-t-0 lg:border-l border-white/10 slide-in-right flex flex-col"
        style={{
          flexBasis: `${chatWidthPercent}%`,
          width: `${chatWidthPercent}%`,
          minWidth: "300px",
          maxWidth: "640px",
        }}
      >
        <div
          className="hidden lg:block absolute -left-3 top-0 bottom-0 w-2 cursor-col-resize"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateChatWidthFromPointer(event.clientX);
            setIsResizingChat(true);
          }}
          onTouchStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const touch = event.touches[0];
            updateChatWidthFromPointer(touch ? touch.clientX : null);
            setIsResizingChat(true);
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
        >
          <div className="w-2 h-full rounded-full bg-gradient-to-b from-blue-500/40 via-purple-500/40 to-blue-500/40 hover:from-blue-500/60 hover:via-purple-500/60 hover:to-blue-500/60 transition-colors"></div>
        </div>
        <div className={`flex-shrink-0 p-6 border-b ${
          theme === "light" 
            ? "border-slate-200 bg-gradient-to-r from-white/90 to-slate-50/90 backdrop-blur-sm" 
            : "border-white/10 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 hover-scale">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-300">
                    <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <h2 className={`text-xl font-bold ${
                  theme === "light"
                    ? "bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-gray-100 via-blue-200 to-purple-200 bg-clip-text text-transparent"
                }`}>AI Chat</h2>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full shadow-lg shadow-blue-500/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        
        {/* Chat Messages */}
        <div ref={messagesRef} className="chat-messages p-6 space-y-6 compact-scrollbar" key={chatKey}>
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-3xl blur-2xl"></div>
                <div className={`relative w-24 h-24 rounded-3xl flex items-center justify-center ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-200"
                    : "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30"
                } indus-glow`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-12 h-12 ${
                    theme === "light" ? "text-blue-600" : "text-blue-400"
                  }`}>
                    <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                  </svg>
                </div>
              </div>
              <h3 className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}>Welcome to AI Analytics</h3>
              <p className={`text-xs sm:text-sm max-w-sm leading-relaxed mb-6 sm:mb-8 ${
                theme === "light" ? "text-slate-600" : "text-slate-400"
              }`}>
                Ask questions about your data and get instant insights with AI-powered analysis.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  theme === "light"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-white/10 text-slate-300 border border-white/20"
                }`}>Data Analysis</span>
                <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  theme === "light"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-white/10 text-slate-300 border border-white/20"
                }`}>Charts & Graphs</span>
                <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  theme === "light"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-white/10 text-slate-300 border border-white/20"
                }`}>Real-time Insights</span>
              </div>
            </div>
          ) : (
            chat.map((item, i) => (
              <div key={i} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[90%] sm:max-w-[80%] ${item.role === "user" ? "ml-2 sm:ml-12" : "mr-2 sm:mr-12"}`}>
                  {/* User Message */}
                  {item.role === "user" ? (
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 ${
                        theme === "light"
                          ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30"
                          : "bg-gradient-to-br from-blue-600/20 to-purple-600/20"
                      }`}></div>
                      <div className={`relative rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-xl max-w-full hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] ${
                        theme === "light"
                          ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white border-2 border-blue-500/20"
                          : "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                      }`}>
                        <div className="text-sm sm:text-[15px] leading-relaxed font-medium">
                          <HTMLRender html={item.text || ""} isTextContent={true} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="space-y-3 max-w-full">
                      {/* Message Content - Show text only if there are no graphs */}
                      {item.text && item.text.trim() && (!item.graphs || item.graphs.length === 0) && (
                        <div className="relative group">
                          <div className={`absolute inset-0 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-xl transition-all duration-200 ${
                            theme === "light"
                              ? "bg-gradient-to-br from-slate-50/90 to-white/90 border-2 border-slate-200"
                              : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50"
                          }`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
                          </div>
                          <div className="relative px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className={`text-sm sm:text-[15px] leading-relaxed flex-1 font-normal ${
                                theme === "light" ? "text-slate-900" : "text-gray-100"
                              }`}>
                                <HTMLRender html={item.text} isTextContent={true} />
                              </div>
                              {isVoiceEnabled && (
                                <button
                                  onClick={() => speakResponse(item.text || "")}
                                  className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 hover:scale-110 ${
                                    theme === "light"
                                      ? "text-slate-600 hover:text-emerald-700 hover:bg-emerald-100 border border-slate-200"
                                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                                  }`}
                                  title="Speak response"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10 2a.75.75 0 01.75.75v14.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2z" />
                                    <path d="M6.5 6.5a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0v-7zM13.5 6.5a.75.75 0 00-1.5 0v7a.75.75 0 001.5 0v-7z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Graphs */}
                      {item.graphs && item.graphs.length > 0 && (
                        <div className="space-y-3">
                          {item.graphs.map((graph, j) => (
                            <div key={j} className={`relative group rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl transition-all duration-200 hover:shadow-3xl hover:scale-[1.01] ${
                              theme === "light"
                                ? "bg-white border-2 border-slate-300"
                                : "bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/60"
                            }`}>
                              {/* Background glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              {/* Graph Header */}
                              <div className={`relative flex items-center justify-between p-5 border-b ${
                                theme === "light"
                                  ? "border-slate-200 bg-gradient-to-r from-slate-50/90 to-white/90"
                                  : "border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50"
                              }`}>
                                <div className="flex items-center gap-4">
                                  <div className="relative group/icon">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-sm group-hover/icon:blur-md transition-all duration-300"></div>
                                    <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border ${
                                      theme === "light" ? "border-blue-600/40" : "border-blue-500/30"
                                    } group-hover/icon:scale-110 transition-transform duration-200`}>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-6 h-6 ${
                                        theme === "light" ? "text-blue-700" : "text-blue-400"
                                      }`}>
                                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className={`text-[16px] font-bold ${
                                      theme === "light" ? "text-slate-900" : "text-gray-100"
                                    }`}>
                                      {item.userQuestion || graph.title || `Chart ${j + 1}`}
                                    </span>
                                    <p className={`text-sm font-medium ${
                                      theme === "light" ? "text-slate-600" : "text-slate-400"
                                    }`}>
                                      {(graph as any).graph_type || 'Data visualization'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={async (event) => {
                                    try {
                                      // Create a new graph item with the chart data directly
                                      const newGraph: any = {
                                        type: 'chart',
                                        graph_type: (graph as any).graph_type || 'bar',
                                        title: (graph as any).title || `Chart ${j + 1}`,
                                        data: (graph as any).data || [],
                                        insight: (graph as any).insight || ''
                                      };
                                      
                                      setGraphs((prev: any) => [...prev, newGraph]);
                                      showSuccess("Chart pinned to dashboard!");
                                    } catch (error) {
                                      console.error('❌ Failed to pin chart:', error);
                                      showSuccess("Failed to pin chart. Please try again.");
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 text-sm rounded-xl border border-primary/50 bg-primary/20 px-4 py-2.5 text-white font-semibold hover:bg-primary/30 hover:border-primary/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed pressable shadow-sm hover:scale-105 group/btn"
                                  title="Pin chart to dashboard"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-200">
                                    <path fillRule="evenodd" d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" clipRule="evenodd" />
                                  </svg>
                                  <span>Pin to Dashboard</span>
                                </button>
                              </div>
                              
                              {/* Graph Content */}
                              <div className="relative p-6 min-h-[320px]">
                                {/* Render copied charts with HTML content directly */}
                                {(graph as any).graph_type === 'copied_chart' && (graph as any).html_content ? (
                                  <div 
                                    className="w-full h-full min-h-[300px] rounded-xl overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: (graph as any).html_content }}
                                  />
                                ) : (
                                  /* Use enhanced chart renderer for other graphs */
                                  <div className="w-full h-[300px] min-h-[300px] rounded-xl overflow-hidden">
                                    <ChartRenderer 
                                      data={(graph as any).data || []} 
                                      type={(graph as any).graph_type || 'bar'} 
                                      title={(graph as any).title || undefined}
                                      graph_type={(graph as any).graph_type}
                                      insight={(graph as any).insight}
                                      className="w-full h-full"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Graph Insight */}
                              {graph.insight && (
                                <div className="px-6 pb-6">
                                  <div className={`relative p-5 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                                    theme === "light"
                                      ? "bg-gradient-to-r from-blue-50/90 to-purple-50/90 border-blue-200"
                                      : "bg-gradient-to-r from-blue-500/15 to-purple-500/15 border-blue-500/30"
                                  }`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative flex items-start gap-4">
                                      <div className="flex-shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                          theme === "light"
                                            ? "bg-blue-100 border border-blue-200"
                                            : "bg-blue-500/20 border border-blue-500/30"
                                        }`}>
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${
                                            theme === "light" ? "text-blue-600" : "text-blue-400"
                                          }`}>
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      </div>
                                      <p className={`text-[15px] leading-relaxed font-medium ${
                                        theme === "light" ? "text-slate-800" : "text-gray-100"
                                      }`}>{graph.insight}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {/* Interim Transcript Display */}
          {interimTranscript && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-2xl px-5 py-3 backdrop-blur-md mr-12 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-[14px] text-emerald-300 font-medium">Listening: <span className="text-gray-200">{interimTranscript}</span></span>
                </div>
              </div>
            </div>
          )}

          {isAwaitingAnswer && (
            <div className="flex justify-start">
              <div className={`rounded-2xl px-5 py-3.5 backdrop-blur-md mr-12 shadow-xl ${
                theme === "light"
                  ? "bg-gradient-to-br from-slate-50/95 to-white/95 border-2 border-slate-200"
                  : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1.5">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-blue-500" : "bg-blue-400"
                    }`} style={{ animationDelay: '0ms' }} />
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-purple-500" : "bg-purple-400"
                    }`} style={{ animationDelay: '150ms' }} />
                    <div className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-blue-500" : "bg-blue-400"
                    }`} style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className={`text-[15px] font-medium ${
                    theme === "light" ? "text-slate-800" : "text-gray-100"
                  }`}>Analyzing your data...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        {/* Voice Chat Controls */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-gradient-to-b from-slate-900/70 to-slate-950/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3">
            <VoiceChat
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              isEnabled={isVoiceEnabled}
              onToggle={toggleVoiceChat}
              onSpeakingChange={handleSpeakingChange}
              onInterimTranscript={handleInterimTranscript}
            />
          </div>
        </div>

        {/* Enhanced Chat Input */}
        <div className={`flex-shrink-0 p-3 sm:p-4 lg:p-6 border-t backdrop-blur-md ${
          theme === "light"
            ? "border-slate-200 bg-gradient-to-b from-white/95 to-slate-50/95 shadow-lg"
            : "border-slate-700/50 bg-gradient-to-b from-slate-900/90 to-slate-950/95"
        }`}>
          <form onSubmit={onAsk} className="space-y-3 sm:space-y-4">
            <div className="flex items-end gap-3 sm:gap-4">
              <div className="flex-1 relative group">
                {/* Input background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                
                <textarea
                  value={question}
                  onChange={(e) => {
                    if (error) setError(null);
                    setQuestion(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onAsk(e);
                    }
                  }}
                  placeholder="Ask a question about your data..."
                  className={`relative w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 pr-12 sm:pr-14 text-sm sm:text-[15px] resize-none min-h-[48px] sm:min-h-[56px] max-h-32 group-hover:border-blue-500/30 no-scrollbar font-normal ${
                    theme === "light"
                      ? "bg-white/95 border-2 border-slate-300 text-slate-900 placeholder-slate-500 hover:border-blue-500 shadow-sm backdrop-blur-sm"
                      : "bg-slate-800/80 border-slate-700/60 text-gray-100 placeholder-slate-400 hover:bg-slate-800/90 backdrop-blur-sm"
                  }`}
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: '56px',
                    maxHeight: '128px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                
                {/* Search icon */}
                <div className="absolute right-4 sm:right-5 bottom-4 sm:bottom-5 group-hover:scale-110 transition-transform duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 sm:w-5 sm:h-5 group-hover:text-blue-600 transition-colors duration-200 ${
                    theme === "light" ? "text-slate-500" : "text-slate-500"
                  }`}>
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!question.trim() || isAwaitingAnswer}
                className="relative inline-flex items-center justify-center w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-blue-500/20 pressable hover-scale group"
              >
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {isAwaitingAnswer ? (
                  <div className="relative w-6 h-6 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="relative w-6 h-6 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                    <path d="M10.894 2.553a1 1 0 0 0-1.788 0l-7 14a1 1 0 0 0 1.169 1.409l5-1.429A1 1 0 0 0 9 15.571V11a1 1 0 1 1 2 0v4.571a1 1 0 0 0 .725.962l5 1.428a1 1 0 0 0 1.17-1.408l-7-14Z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Enhanced Quick Actions */}
            <div className="flex flex-wrap gap-3 no-scrollbar">
              <button
                type="button"
                onClick={() => setQuestion("Show employee distribution by department")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pressable hover-scale group ${
                  theme === "light"
                    ? "bg-white/80 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 shadow-sm backdrop-blur-sm"
                    : "bg-white/10 border border-white/20 hover:bg-blue-500/20 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 backdrop-blur-sm"
                }`}
                title="Analyze employee data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform duration-200">
                  <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.084-.642.025-.988A5.477 5.477 0 0 0 12.5 11.5a5.477 5.477 0 0 0-2.021 3.512c.059.346.045.691.025.988h-.106a2.5 2.5 0 0 1 0-5Z" />
                </svg>
                <span>Employee Data</span>
              </button>
              
              <button
                type="button"
                onClick={() => setQuestion("Show inventory levels by product")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pressable hover-scale group ${
                  theme === "light"
                    ? "bg-white/80 border border-slate-200 hover:bg-purple-50 hover:border-purple-300 text-slate-600 hover:text-purple-700 shadow-sm backdrop-blur-sm"
                    : "bg-white/10 border border-white/20 hover:bg-purple-500/20 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 backdrop-blur-sm"
                }`}
                title="Check inventory levels"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform duration-200">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <span>Inventory Levels</span>
              </button>
              
              <button
                type="button"
                onClick={() => setQuestion("Show me sales distribution by category")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pressable hover-scale group ${
                  theme === "light"
                    ? "bg-white/80 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 text-slate-600 hover:text-teal-700 shadow-sm backdrop-blur-sm"
                    : "bg-white/10 border border-white/20 hover:bg-teal-500/20 hover:border-teal-500/50 text-slate-300 hover:text-teal-300 backdrop-blur-sm"
                }`}
                title="Analyze sales by category"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform duration-200">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <span>Sales by Category</span>
              </button>
              
              <button
                type="button"
                onClick={() => setQuestion("Display revenue by month")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pressable hover-scale group ${
                  theme === "light"
                    ? "bg-white/80 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 shadow-sm backdrop-blur-sm"
                    : "bg-white/10 border border-white/20 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 backdrop-blur-sm"
                }`}
                title="View monthly revenue"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform duration-200">
                  <path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 010 1.06L3.81 5.3a.75.75 0 01-1.06-1.06l1.24-1.24a.75.75 0 011.06 0zm9.9 0a.75.75 0 011.06 0l1.24 1.24a.75.75 0 11-1.06 1.06L14.95 4.11a.75.75 0 010-1.06zM3 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 10zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 10zm-6.05 4.95a.75.75 0 010 1.06l-1.24 1.24a.75.75 0 11-1.06-1.06l1.24-1.24a.75.75 0 011.06 0zm4.1 0a.75.75 0 011.06 0l1.24 1.24a.75.75 0 11-1.06 1.06l-1.24-1.24a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
                <span>Revenue Analysis</span>
              </button>
            </div>
          </form>
          
          {error && (
            <div className={`mt-4 p-4 rounded-xl backdrop-blur-sm shadow-lg border transition-all duration-200 ${
              theme === "light"
                ? "bg-red-50/90 border-red-200 text-red-800"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  theme === "light"
                    ? "bg-red-100 border border-red-200"
                    : "bg-red-500/20 border border-red-500/30"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${
                    theme === "light" ? "text-red-600" : "text-red-400"
                  }`}>
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00.867.5 1 1 0 110 2A1 1 0 0010 7a1 1 0 00-.867-.5 1 1 0 110-2zM10 9a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                    theme === "light"
                      ? "text-red-600 hover:bg-red-100"
                      : "text-red-400 hover:bg-red-500/20"
                  }`}
                  title="Dismiss error"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Notification */}
      <ErrorNotification 
        error={error} 
        onDismiss={() => setError(null)} 
        type="error" 
      />
    </div>
  </div>
      </div>
    </ErrorBoundary>
  );
}

function DashboardSidebar({
  isOpen,
  onToggle,
  transcripts,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  activeTranscriptId,
  isLoading,
  theme,
  userName,
  userEmail,
  isLoadingUser,
}: {
  isOpen: boolean;
  onToggle: () => void;
  transcripts: TranscriptSummary[];
  onSelect: (id: string) => void | Promise<void>;
  onNewChat: () => Promise<string | null> | void;
  onDelete: (id: string) => void | Promise<void>;
  onRename: (id: string, title: string) => void | Promise<void>;
  activeTranscriptId: string | null;
  isLoading: boolean;
  theme: string;
  userName: string | null;
  userEmail: string | null;
  isLoadingUser: boolean;
}) {
  const initials = (userName || userEmail || "User").slice(0, 2).toUpperCase();
  const background = theme === "light"
    ? "bg-white/80 border-r border-slate-200 shadow-lg shadow-slate-200/40"
    : "bg-slate-900/70 border-r border-white/10 shadow-lg shadow-black/30";
  const textMuted = theme === "light" ? "text-slate-500" : "text-slate-400";
  const highlight = theme === "light"
    ? "bg-blue-50/80 border border-blue-200/70 text-blue-700"
    : "bg-blue-500/20 border border-blue-400/40 text-blue-200";

  const handleRenameClick = (id: string, currentTitle: string | null) => {
    if (typeof window === "undefined") return;
    const nextTitle = window.prompt("Rename chat", currentTitle ?? "Untitled");
    if (nextTitle && nextTitle.trim().length > 0) {
      void onRename(id, nextTitle);
    }
  };

  const collapsedButtonClass = theme === "light"
    ? "p-2 rounded-lg text-slate-600 hover:bg-slate-200/70 transition-colors"
    : "p-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors";

  const collapsedIcons = (
    <div className="flex-1 flex flex-col items-center justify-between py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md">
          {initials}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={collapsedButtonClass}
          title="Open chat sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6 4a1 1 0 011-1h6a1 1 0 110 2H7A1 1 0 016 4zM4 10a1 1 0 011-1h8a1 1 0 110 2H5a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H8a1 1 0 01-1-1z" />
          </svg>
        </button>
        <button
          type="button"
          className={collapsedButtonClass}
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.983 1.077a1 1 0 00-1.966 0l-.196 1.178a7.036 7.036 0 00-1.51.873l-1.12-.647a1 1 0 00-1.366.366L4.16 4.958a1 1 0 00.366 1.366l1.002.58a7.087 7.087 0 000 1.813l-1.002.58a1 1 0 00-.366 1.366l1.664 2.111a1 1 0 001.366.366l1.12-.647a7.035 7.035 0 001.51.873l.196 1.178a1 1 0 001.966 0l.196-1.178a7.036 7.036 0 001.51-.873l1.12.647a1 1 0 001.366-.366l1.664-2.111a1 1 0 00-.366-1.366l-1.002-.58a7.088 7.088 0 000-1.813l1.002-.58a1 1 0 00.366-1.366l-1.664-2.111a1 1 0 00-1.366-.366l-1.12.647a7.035 7.035 0 00-1.51-.873l-.196-1.178zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => { void onNewChat(); }}
        className="p-3 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-transform hover:scale-105"
        title="New chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M9 3.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 9 3.5Z" />
        </svg>
      </button>
    </div>
  );

  const transcriptList = (
    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
        </div>
      ) : transcripts.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-4 text-sm text-center ${textMuted}`}>
          No chats yet. Start one to see it here.
        </div>
      ) : (
        transcripts.map(({ id, title }) => {
          const isActive = activeTranscriptId === id;
          return (
            <div
              key={id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${
                isActive
                  ? highlight
                  : theme === "light"
                    ? "bg-white/70 border-slate-200 hover:border-blue-400/60 hover:bg-blue-50/60"
                    : "bg-white/5 border-white/10 hover:border-blue-400/40 hover:bg-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => { void onSelect(id); }}
                className="flex-1 text-left truncate font-medium"
                title={title ?? "Untitled"}
              >
                {title ? title : "Untitled"}
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleRenameClick(id, title)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                  title="Rename chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M13.586 3.586a2 2 0 012.828 2.828l-7.5 7.5A2 2 0 018.5 14.5H6a1 1 0 01-1-1v-2.5a2 2 0 01.586-1.414l7.5-7.5z" />
                    <path d="M5 16a1 1 0 011-1h9a1 1 0 110 2H6a1 1 0 01-1-1z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => { void onDelete(id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Delete chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.293l.852 9.373A2 2 0 007.135 17h5.73a2 2 0 001.99-1.627L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM8 8a1 1 0 012 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v5a1 1 0 11-2 0V8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ${isOpen ? "w-72 px-4" : "w-16 px-2"} ${background}`}
    >
      <div className={`py-6 ${isOpen ? "flex items-center justify-between" : "flex flex-col items-center gap-4"}`}>
        <div className={`flex ${isOpen ? "items-center gap-3" : "flex-col items-center gap-2"}`}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30">
            {initials}
          </div>
          {isOpen && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {isLoadingUser ? "Loading..." : userName || userEmail || "User"}
              </p>
              <p className={`text-xs truncate ${textMuted}`}>
                {isLoadingUser ? "" : userEmail || "dashboard user"}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`p-2 rounded-lg transition-colors ${theme === "light" ? "text-slate-500 hover:bg-slate-200/60" : "text-slate-300 hover:bg-white/10"}`}
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transition-transform ${isOpen ? "" : "rotate-180"}`}>
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L10.414 9H16a1 1 0 110 2h-5.586l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {isOpen ? (
        <>
          <div className="mt-2">
            <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>Transcripts</div>
            {transcriptList}
          </div>
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => { void onNewChat(); }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-transform hover:scale-[1.02]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 3.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 9 3.5Z" />
              </svg>
              Start New Chat
            </button>
          </div>
        </>
      ) : (
        collapsedIcons
      )}
    </aside>
  );
}

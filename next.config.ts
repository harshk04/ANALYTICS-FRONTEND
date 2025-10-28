import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    
    return [
      // Auth
      { source: "/auth/:path*", destination: `${backend}/auth/:path*` },
      { source: "/auth/me", destination: `${backend}/auth/me` },
      // Query/chat flow
      { source: "/process_query", destination: `${backend}/process_query` },
      { source: "/query_results/poll", destination: `${backend}/query_results/poll` },
      { source: "/get_sql/:transcript_id/:chat_id", destination: `${backend}/get_sql/:transcript_id/:chat_id` },
      { source: "/get_tables/:transcript_id/:chat_id", destination: `${backend}/get_tables/:transcript_id/:chat_id` },
      { source: "/get_description/:transcript_id/:chat_id", destination: `${backend}/get_description/:transcript_id/:chat_id` },
      { source: "/get_graph/:transcript_id/:chat_id", destination: `${backend}/get_graph/:transcript_id/:chat_id` },
      // Transcripts
      { source: "/transcripts", destination: `${backend}/transcripts` },
      { source: "/transcripts/:transcript_id", destination: `${backend}/transcripts/:transcript_id` },
      { source: "/transcripts/:transcript_id/chats/:chat_id", destination: `${backend}/transcripts/:transcript_id/chats/:chat_id` },
      // Dashboard
      { source: "/dashboard", destination: `${backend}/dashboard` },
      { source: "/dashboard/graphs", destination: `${backend}/dashboard/graphs` },
      { source: "/dashboard/graphs/query", destination: `${backend}/dashboard/graphs/query` },
      { source: "/dashboard/graphs/scope", destination: `${backend}/dashboard/graphs/scope` },
      { source: "/dashboard/graphs/:graph_identifier", destination: `${backend}/dashboard/graphs/:graph_identifier` },
      // LiveKit
      { source: "/livekit/session", destination: `${backend}/livekit/session` },
      { source: "/livekit/session/:session_id", destination: `${backend}/livekit/session/:session_id` },
      { source: "/livekit/session/:session_id/token", destination: `${backend}/livekit/session/:session_id/token` },
      { source: "/livekit/session/:session_id/metadata", destination: `${backend}/livekit/session/:session_id/metadata` },
      { source: "/livekit/session/:session_id/transcripts", destination: `${backend}/livekit/session/:session_id/transcripts` },
      { source: "/livekit/session/:session_id/query", destination: `${backend}/livekit/session/:session_id/query` },
      // Health check
      { source: "/health", destination: `${backend}/health` },
    ];
  },
};

export default nextConfig;

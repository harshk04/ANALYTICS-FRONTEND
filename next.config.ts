import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://3.111.133.92:8010").replace(/\/$/, "");
    
    return [
      // Auth
      { source: "/auth/:path*", destination: `${backend}/api/auth/:path*` },
      { source: "/auth/me", destination: `${backend}/api/auth/me` },
      // Query/chat flow
      { source: "/process_query", destination: `${backend}/api/process_query` },
      { source: "/query_results/poll", destination: `${backend}/api/query_results/poll` },
      { source: "/get_sql/:transcript_id/:chat_id", destination: `${backend}/api/get_sql/:transcript_id/:chat_id` },
      { source: "/get_tables/:transcript_id/:chat_id", destination: `${backend}/api/get_tables/:transcript_id/:chat_id` },
      { source: "/get_description/:transcript_id/:chat_id", destination: `${backend}/api/get_description/:transcript_id/:chat_id` },
      { source: "/get_graph/:transcript_id/:chat_id", destination: `${backend}/api/get_graph/:transcript_id/:chat_id` },
      // Transcripts
      { source: "/transcripts", destination: `${backend}/api/transcripts` },
      { source: "/transcripts/:transcript_id", destination: `${backend}/api/transcripts/:transcript_id` },
      { source: "/transcripts/:transcript_id/chats/:chat_id", destination: `${backend}/api/transcripts/:transcript_id/chats/:chat_id` },
      // Dashboard
      { source: "/dashboard", destination: `${backend}/api/dashboard` },
      { source: "/dashboard/graphs", destination: `${backend}/api/dashboard/graphs` },
      { source: "/dashboard/graphs/query", destination: `${backend}/api/dashboard/graphs/query` },
      { source: "/dashboard/graphs/scope", destination: `${backend}/api/dashboard/graphs/scope` },
      { source: "/dashboard/graphs/:graph_identifier", destination: `${backend}/api/dashboard/graphs/:graph_identifier` },
      // LiveKit
      { source: "/livekit/session", destination: `${backend}/api/livekit/session` },
      { source: "/livekit/session/:session_id", destination: `${backend}/api/livekit/session/:session_id` },
      { source: "/livekit/session/:session_id/token", destination: `${backend}/api/livekit/session/:session_id/token` },
      { source: "/livekit/session/:session_id/metadata", destination: `${backend}/api/livekit/session/:session_id/metadata` },
      { source: "/livekit/session/:session_id/transcripts", destination: `${backend}/api/livekit/session/:session_id/transcripts` },
      { source: "/livekit/session/:session_id/query", destination: `${backend}/api/livekit/session/:session_id/query` },
      // Health check
      { source: "/health", destination: `${backend}/api/health` },
    ];
  },
};

export default nextConfig;

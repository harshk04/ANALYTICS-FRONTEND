import axios from "axios";
import { getAccessToken, clearAccessToken } from "@/lib/auth";

export const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL || "",
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    
    // Debug logging for LiveKit requests
    if (config.url && config.url.includes('/livekit/')) {
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Debug logging for LiveKit responses
    if (res.config.url && res.config.url.includes('/livekit/')) {
    }
    return res;
  },
  (error) => {
    // Debug logging for LiveKit errors
    if (error?.config?.url && error.config.url.includes('/livekit/')) {
    }
    
    if (error?.response?.status === 401) {
      const url: string | undefined = error?.config?.url;
      // For LiveKit endpoints, surface the error to the UI instead of redirecting
      if (url && url.startsWith("/livekit/")) {
        return Promise.reject(error);
      }
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);



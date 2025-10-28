"use client";

import { useEffect, useState } from "react";

interface ErrorNotificationProps {
  error: string | null;
  onDismiss: () => void;
  type?: "error" | "warning" | "info";
}

export default function ErrorNotification({ error, onDismiss, type = "error" }: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation to complete
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onDismiss]);

  if (!error || !isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case "info":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getColors = () => {
    switch (type) {
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-200 light:bg-yellow-500/20 light:border-yellow-500/40 light:text-yellow-700";
      case "info":
        return "bg-blue-500/10 border-blue-500/20 text-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200 light:bg-blue-500/20 light:border-blue-500/40 light:text-blue-700";
      default:
        return "bg-red-500/10 border-red-500/20 text-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-200 light:bg-red-500/20 light:border-red-500/40 light:text-red-700";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${getColors()} border rounded-xl p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="text-neutral-400 hover:text-white transition-colors dark:text-neutral-400 dark:hover:text-white light:text-gray-500 light:hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

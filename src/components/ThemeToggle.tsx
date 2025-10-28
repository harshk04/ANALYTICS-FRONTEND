"use client";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 pressable group ${
        theme === "light"
          ? "bg-white/90 border border-slate-200 hover:bg-white hover:border-blue-300 shadow-sm backdrop-blur-sm"
          : "bg-white/10 border border-white/20 hover:bg-white/20 hover:border-blue-500/50 backdrop-blur-sm"
      } ${isAnimating ? "scale-95" : "hover:scale-105"}`}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {/* Background glow effect */}
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
        theme === "light" 
          ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100" 
          : "bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100"
      }`} />
      
      {/* Icon container with smooth rotation */}
      <div className={`relative z-10 transition-all duration-300 ${isAnimating ? "rotate-180" : ""}`}>
        {theme === "light" ? (
          // Moon icon for dark mode
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={`w-5 h-5 transition-colors duration-200 ${
              theme === "light" 
                ? "text-slate-600 group-hover:text-blue-600" 
                : "text-slate-400 group-hover:text-blue-400"
            }`}
          >
            <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
          </svg>
        ) : (
          // Sun icon for light mode
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={`w-5 h-5 transition-colors duration-200 ${
              theme === "light" 
                ? "text-slate-600 group-hover:text-blue-600" 
                : "text-slate-400 group-hover:text-blue-400"
            }`}
          >
            <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
          </svg>
        )}
      </div>
      
      {/* Ripple effect on click */}
      {isAnimating && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-ping" />
      )}
    </button>
  );
}


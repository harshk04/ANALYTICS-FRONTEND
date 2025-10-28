"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("indus-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to dark theme
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("indus-theme", theme);
      // Update document class
      if (theme === "light") {
        document.documentElement.classList.add("light-theme");
        document.documentElement.classList.remove("dark-theme");
      } else {
        document.documentElement.classList.add("dark-theme");
        document.documentElement.classList.remove("light-theme");
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Always provide the context, even before mounting
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.error("useTheme must be used within a ThemeProvider");
    // Return a default theme to prevent crashes
    return { theme: "dark" as Theme, toggleTheme: () => {} };
  }
  return context;
}


"use client";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function RadixThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <Theme appearance={theme === "light" ? "light" : "dark"} accentColor="violet" grayColor="slate">
      {children}
    </Theme>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RadixThemeWrapper>
        {children}
      </RadixThemeWrapper>
    </ThemeProvider>
  );
}



"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import Logo from "@/components/Logo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only check authentication on client side
    if (typeof window !== "undefined") {
      // Add a delay to prevent immediate authentication check
      const timer = setTimeout(() => {
        const token = getAccessToken();
        // Only set authenticated if token exists and is valid
        setIsAuthenticated(!!token);
        setIsLoading(false);
        setHasCheckedAuth(true);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      // On server side, keep loading true to prevent flash
      setIsLoading(true);
    }
  }, [pathname]);

  // Hide TopNav on login/register pages
  if (pathname === "/login" || pathname === "/register") return null;
  
  // Don't render anything while checking authentication or on server side
  if (isLoading || !hasCheckedAuth) return null;
  
  // Only show TopNav if user is authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5 border-b border-white/10 dark:bg-white/5 dark:border-white/10 light:bg-white/80 light:border-gray-200/60">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" aria-label="Indus Dashboard" className="flex items-center">
          <Logo size="lg" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "px-2 py-1 rounded hover:bg-white/10 transition dark:hover:bg-white/10 light:hover:bg-gray-100/80 " +
                (pathname === l.href ? "bg-white/10 dark:bg-white/10 light:bg-gray-100/80" : "dark:text-gray-300 light:text-gray-600")
              }
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              clearAccessToken();
              if (typeof window !== "undefined") window.location.href = "/login";
            }}
            className="px-2 py-1 rounded hover:bg-white/10 transition dark:hover:bg-white/10 dark:text-gray-300 light:hover:bg-gray-100/80 light:text-gray-600"
          >
            Logout
          </button>
        </nav>
      </div>
    </div>
  );
}



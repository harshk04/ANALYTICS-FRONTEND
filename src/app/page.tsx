"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { useTheme } from "@/contexts/ThemeContext";

// Particle System
function ParticleSystem() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    animationDelay: number;
    animationDuration: number;
    size: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const generatedParticles = [...Array(25)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 3 + Math.random() * 2,
      size: 1 + Math.random() * 2,
      color: Math.random() > 0.5 ? 'blue' : Math.random() > 0.5 ? 'purple' : 'emerald'
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full floating ${
            particle.color === 'blue' 
              ? 'bg-blue-400/30 dark:bg-blue-400/30 light:bg-blue-500/40' 
              : particle.color === 'purple'
              ? 'bg-purple-400/30 dark:bg-purple-400/30 light:bg-purple-500/40'
              : 'bg-emerald-400/30 dark:bg-emerald-400/30 light:bg-emerald-500/40'
          }`}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <div className="h-screen page-gradient relative overflow-hidden flex flex-col">
      {/* Modern gradient orbs - Dark theme */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl animate-pulse dark:block hidden" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 blur-3xl animate-pulse dark:block hidden" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 blur-2xl animate-pulse dark:block hidden" style={{ animationDelay: '2s' }} />
      
      {/* Light theme gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/25 to-purple-500/25 blur-3xl animate-pulse light:block hidden" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/25 to-blue-500/25 blur-3xl animate-pulse light:block hidden" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 blur-2xl animate-pulse light:block hidden" style={{ animationDelay: '2s' }} />
      <div className="pointer-events-none absolute top-3/4 left-1/4 h-40 w-40 rounded-full bg-gradient-to-br from-amber-400/15 to-orange-400/15 blur-2xl animate-pulse light:block hidden" style={{ animationDelay: '3s' }} />
      
      {/* Animated background particles */}
      <ParticleSystem />

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <section className="flex-1 flex items-center justify-center w-full px-6 relative z-10">
        <div className="text-center space-y-10 max-w-6xl">
          {/* Modern badge */}
          <div className="fade-in-up stagger-1">
            <span className={`inline-flex items-center gap-2.5 rounded-full backdrop-blur-sm px-6 py-3 text-[13px] tracking-wide transition-all duration-300 ${
              theme === 'light'
                ? 'border border-blue-200/60 bg-white/80 text-gray-700 hover:border-blue-500/50 shadow-md'
                : 'border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-blue-500/30 shadow-lg'
            }`}>
              <div className={`w-2 h-2 bg-gradient-to-r rounded-full animate-pulse ${
                theme === 'light' ? 'from-blue-600 to-purple-600' : 'from-blue-500 to-purple-500'
              }`} />
              Next-generation data intelligence
            </span>
          </div>
          
          {/* Logo */}
          <div className="fade-in-up stagger-2">
            <Logo size="xl" className="mx-auto mb-8" />
          </div>
          
          {/* Modern main heading */}
          <div className="space-y-5">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight fade-in-up stagger-3">
              <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                theme === 'light' 
                  ? 'from-gray-900 via-blue-700 to-purple-700 drop-shadow-sm' 
                  : 'from-gray-100 via-blue-200 to-purple-200'
              }`}>
                Analytics Platform
              </span>
            </h1>
            <div className="fade-in-up stagger-4">
              <div className={`w-32 h-1 bg-gradient-to-r mx-auto rounded-full ${
                theme === 'light'
                  ? 'from-blue-500 via-purple-500 to-blue-500 shadow-md shadow-blue-500/20'
                  : 'from-blue-600 via-purple-600 to-blue-600 shadow-lg shadow-blue-500/50'
              }`} />
            </div>
          </div>
          
          {/* Modern description */}
          <div className="fade-in-up stagger-5">
            <p className={`mx-auto max-w-3xl text-base md:text-lg lg:text-xl leading-relaxed ${
              theme === 'light' 
                ? 'text-gray-700 font-medium' 
                : 'text-slate-300'
            }`}>
              Ask questions in natural language and instantly turn your data into interactive visualizations.
              <br />
              <span className={`font-semibold ${
                theme === 'light' 
                  ? 'text-blue-600 font-bold' 
                  : 'text-blue-400'
              }`}>Pin the best insights</span> to your personal dashboard and collaborate with your team.
            </p>
          </div>
          
          {/* Modern CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6 fade-in-up stagger-6">
            <Link
              href="/login"
              className={`pressable inline-flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-semibold text-white transition-all duration-300 hover:scale-105 group ${
                theme === 'light'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/20'
                  : 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40'
              }`}
            >
              <span>Get Started</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/register"
              className={`pressable inline-flex items-center gap-3 rounded-2xl backdrop-blur-sm px-10 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105 group ${
                theme === 'light'
                  ? 'border border-blue-200/60 bg-white/90 text-gray-800 hover:bg-white hover:border-blue-500/60 shadow-md hover:shadow-lg'
                  : 'border border-slate-700/60 bg-slate-800/40 text-slate-200 hover:bg-slate-800/60 hover:border-blue-500/40'
              }`}
            >
              <span>Create Account</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          
          {/* Modern feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            <Link href="/login" className={`fade-in-up stagger-1 p-7 rounded-2xl transition-all duration-300 group pressable block backdrop-blur-sm ${
              theme === 'light' 
                ? 'bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200/60 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 shadow-md' 
                : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10'
            }`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border ${
                theme === 'light' 
                  ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20' 
                  : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-7 h-7 ${
                  theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                }`}>
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold mb-2.5 transition-colors ${
                theme === 'light' 
                  ? 'text-gray-800 group-hover:text-blue-600' 
                  : 'text-gray-100 group-hover:text-blue-400'
              }`}>Smart Analytics</h3>
              <p className={`text-[14px] transition-colors leading-relaxed ${
                theme === 'light' 
                  ? 'text-gray-500 group-hover:text-gray-700' 
                  : 'text-slate-400 group-hover:text-slate-300'
              }`}>AI-powered insights that transform your data</p>
            </Link>
            
            <Link href="/login" className={`fade-in-up stagger-2 p-7 rounded-2xl transition-all duration-300 group pressable block backdrop-blur-sm ${
              theme === 'light' 
                ? 'bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200/60 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 shadow-md' 
                : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10'
            }`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border ${
                theme === 'light' 
                  ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20' 
                  : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-7 h-7 ${
                  theme === 'light' ? 'text-purple-600' : 'text-purple-400'
                }`}>
                  <path fillRule="evenodd" d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold mb-2.5 transition-colors ${
                theme === 'light' 
                  ? 'text-gray-800 group-hover:text-purple-600' 
                  : 'text-gray-100 group-hover:text-purple-400'
              }`}>Natural Language</h3>
              <p className={`text-[14px] transition-colors leading-relaxed ${
                theme === 'light' 
                  ? 'text-gray-500 group-hover:text-gray-700' 
                  : 'text-slate-400 group-hover:text-slate-300'
              }`}>Ask questions in plain English, get instant answers</p>
            </Link>
            
            <Link href="/login" className={`fade-in-up stagger-3 p-7 rounded-2xl transition-all duration-300 group pressable block backdrop-blur-sm ${
              theme === 'light' 
                ? 'bg-gradient-to-br from-white/90 to-gray-50/90 border border-gray-200/60 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 shadow-md' 
                : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10'
            }`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border ${
                theme === 'light' 
                  ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20' 
                  : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-7 h-7 ${
                  theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                }`}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold mb-2.5 transition-colors ${
                theme === 'light' 
                  ? 'text-gray-800 group-hover:text-emerald-600' 
                  : 'text-gray-100 group-hover:text-emerald-400'
              }`}>Real-time Results</h3>
              <p className={`text-[14px] transition-colors leading-relaxed ${
                theme === 'light' 
                  ? 'text-gray-500 group-hover:text-gray-700' 
                  : 'text-slate-400 group-hover:text-slate-300'
              }`}>Instant visualizations that update in real-time</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

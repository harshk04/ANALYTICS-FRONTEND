"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 dark:bg-red-500/20 light:bg-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-red-400 dark:text-red-400 light:text-red-500">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 dark:text-white light:text-gray-800">Something went wrong</h3>
          <p className="text-neutral-400 text-center mb-4 dark:text-neutral-400 light:text-gray-600">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:from-primary-dark hover:to-accent-light transition-all pressable dark:from-primary dark:to-accent dark:text-white dark:hover:from-primary-dark dark:hover:to-accent-light light:from-blue-600 light:to-purple-600 light:text-white light:hover:from-blue-700 light:hover:to-purple-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

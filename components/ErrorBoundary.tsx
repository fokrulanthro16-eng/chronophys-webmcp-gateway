"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen bg-[#06090e] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-600/80 rounded-3xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-6 text-center">
            
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700/80 flex items-center justify-center text-rose-400 mx-auto shadow-lg">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                ChronoPhys Diagnostic Gateway Recovered
              </h2>
              <p className="text-xs text-slate-400">
                A non-fatal rendering error occurred. The system safely intercepted the issue to prevent total application failure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs text-rose-300 overflow-x-auto max-h-32">
                <span className="font-bold text-rose-400">Error: </span>
                {this.state.error.message || 'Unknown render exception'}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Industrial Gateway</span>
            </button>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

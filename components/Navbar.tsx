"use client";

import React from 'react';
import { useWebMCP } from './WebMCPProvider';
import { 
  Bot, 
  Terminal, 
  Zap,
} from 'lucide-react';

interface NavbarProps {
  onOpenInspector: () => void;
  isInspectorOpen: boolean;
  onOpenPricing?: () => void;
  onOpenVoice?: () => void;
  onRecordDemo?: () => void;
  onOpenAiSpecialist?: () => void;
  onOpenPdfReport?: () => void;
  userRole?: 'operator' | 'analyst' | 'manager';
  onRoleChange?: (role: 'operator' | 'analyst' | 'manager') => void;
  recordingSecondsLeft?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenInspector, 
  isInspectorOpen,
  onOpenPricing,
  onOpenVoice,
  onRecordDemo,
  onOpenAiSpecialist,
  onOpenPdfReport,
  userRole = 'analyst',
  onRoleChange,
  recordingSecondsLeft = 0
}) => {
  const { isReady, registeredTools, grandmaMode, toggleGrandmaMode, activeActionEffect } = useWebMCP();

  const roles: Array<{ id: 'operator' | 'analyst' | 'manager'; label: string; icon: string }> = [
    { id: 'operator', label: 'Operator', icon: '👷' },
    { id: 'analyst', label: 'ISO Cat-IV Analyst', icon: '🔬' },
    { id: 'manager', label: 'Plant Director', icon: '👔' }
  ];

  return (
    <header className="w-full flex items-center justify-between px-4 py-2 bg-[#0c1017]/90 border-b border-slate-800 gap-3 whitespace-nowrap overflow-x-hidden sticky top-0 z-40 backdrop-blur-md">
      
      {/* Left Group: Logo + Brand + Standard Tag */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-mcp-purple via-indigo-500 to-mcp-cyan flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="font-extrabold text-sm text-slate-100 tracking-tight">
            ChronoPhys <span className="text-transparent bg-clip-text bg-gradient-to-r from-mcp-cyan to-indigo-400">WebMCP</span>
          </h1>
          <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-mcp-purple/20 text-mcp-purple border border-mcp-purple/40 font-bold">
            Enterprise CV Rig
          </span>
        </div>
      </div>

      {/* Right Group: Roles + Action Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        
        {/* Active Action Pulse Notification */}
        {activeActionEffect && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-mono animate-pulse">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Agent: <b className="text-white">{activeActionEffect}</b></span>
          </div>
        )}

        {/* WebMCP Bridge Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300 font-medium">WebMCP:</span>
          <span className="text-emerald-400 font-bold">Active ({registeredTools.length || 12} Tools)</span>
        </div>

        {/* Enterprise Role Switcher (RBAC) */}
        {onRoleChange && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono font-bold">
            {roles.map((r) => {
              const isActive = userRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-xs ${
                    isActive
                      ? 'bg-mcp-purple text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Switch Role: ${r.label}`}
                >
                  <span>{r.icon}</span>
                  <span className="hidden sm:inline text-xs">{r.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Record 30s Demo Button with Visual Countdown */}
        {onRecordDemo && (
          <button
            onClick={onRecordDemo}
            disabled={recordingSecondsLeft > 0}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-sm ${
              recordingSecondsLeft > 0
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-rose-950/90 hover:bg-rose-900 border-rose-700/80 text-rose-200'
            }`}
            title="Record 30-second live multi-modal diagnostic session"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            <span>
              {recordingSecondsLeft > 0 ? `REC ${recordingSecondsLeft}s` : 'Record 30s'}
            </span>
          </button>
        )}

        {/* AI Specialist Modal Trigger */}
        {onOpenAiSpecialist && (
          <button
            onClick={onOpenAiSpecialist}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 text-xs font-bold transition shadow-sm"
            title="Open Gemini AI Vibration Diagnostic Specialist"
          >
            <span>🤖</span>
            <span className="hidden md:inline">AI Specialist</span>
          </button>
        )}

        {/* PDF Report Generator Trigger */}
        {onOpenPdfReport && (
          <button
            onClick={onOpenPdfReport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
            title="Generate certified ISO 17025 PDF compliance report"
          >
            <span>📄</span>
            <span className="hidden md:inline">PDF Report</span>
          </button>
        )}

        {/* Voice Agent Trigger Button */}
        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-sm"
            title="Hands-free plant voice-to-agent interface"
          >
            <span>🎙️</span>
            <span className="hidden md:inline">Voice</span>
          </button>
        )}

        {/* Grandma Mode Toggle Button */}
        <button
          onClick={toggleGrandmaMode}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
            grandmaMode
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Toggle high-contrast Grandma Mode accessibility"
        >
          <span>👵</span>
          <span className="hidden md:inline">{grandmaMode ? 'Grandma On' : 'Grandma'}</span>
        </button>

        {/* Open Inspector Button */}
        <button
          onClick={onOpenInspector}
          className={`p-1.5 rounded-lg border transition ${
            isInspectorOpen 
              ? 'bg-mcp-purple text-white border-mcp-purple' 
              : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
          }`}
          title="Toggle Agent Activity Inspector"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

      </div>

    </header>
  );
};

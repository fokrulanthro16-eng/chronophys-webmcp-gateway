"use client";

import React, { useState } from 'react';
import { useWebMCP } from './WebMCPProvider';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';
import { 
  Bot, 
  Sparkles, 
  Terminal, 
  Eye, 
  CheckCircle2, 
  Layers, 
  Zap,
  Play
} from 'lucide-react';

interface NavbarProps {
  onOpenInspector: () => void;
  isInspectorOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenInspector, isInspectorOpen }) => {
  const { isReady, registeredTools, grandmaMode, toggleGrandmaMode, activeActionEffect } = useWebMCP();

  const handleSimulateNormal = () => {
    dispatchWebMCPAction('RESET_STATE', {}, 'human-simulation', 'execute_action');
    dispatchWebMCPAction('AUTOFILL_FORM', {
      customerName: 'Engineering Commissioning Team',
      email: 'plant.ops@megawatt-turbines.com',
      company: 'Megawatt Energy Station 4',
      serviceCategory: 'ai-edge',
      urgencyLevel: 'standard',
      notes: 'Commissioning baseline: 1800 RPM shaft vibration in ISO Zone A (v_RMS = 0.42 mm/s). Nominal structural stability.',
      itemId: 'prod-001'
    }, 'human-simulation', 'execute_action');
  };

  const handleSimulateBearingFault = () => {
    dispatchWebMCPAction('FILTER_CATALOG', { category: 'industrial' }, 'human-simulation', 'execute_action');
    dispatchWebMCPAction('AUTOFILL_FORM', {
      customerName: 'Emergency Trip Control Desk',
      email: 'safety-trip@val-verde.power',
      company: 'Val Verde Hydroelectric Facility',
      serviceCategory: 'industrial',
      urgencyLevel: 'emergency',
      notes: 'CRITICAL ALARM: BPFO high-frequency bearing outer-race fault detected at 142.5 Hz. v_RMS = 7.85 mm/s (ISO ZONE_D). Hardware SIL-3 trip required!',
      itemId: 'prod-004'
    }, 'human-simulation', 'execute_action');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Standard Tag */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mcp-purple via-indigo-500 to-mcp-cyan flex items-center justify-center text-white shadow-lg shadow-mcp-purple/25">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight">
                ChronoPhys <span className="text-transparent bg-clip-text bg-gradient-to-r from-mcp-cyan to-indigo-400">WebMCP</span>
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-mcp-purple/20 text-mcp-purple border border-mcp-purple/40 font-bold">
                document.modelContext
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Agentic Industrial Digital Twin • W3C WebMCP Standard</p>
          </div>
        </div>

        {/* Action Indicators & Simulation Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-1 scrollbar-none">
          
          {/* Active Action Pulse Notification */}
          {activeActionEffect && (
            <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-mono animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agent Event: <b className="text-white">{activeActionEffect}</b></span>
            </div>
          )}

          {/* WebMCP Bridge Status Pill */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-sm flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-semibold hidden md:inline">
              WebMCP Bridge:
            </span>
            <span className="text-emerald-400 font-bold">
              Active (5 Tools Registered)
            </span>
          </div>

          {/* Quick Action: Simulate Normal State */}
          <button
            onClick={handleSimulateNormal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/70 text-xs font-bold transition shadow-sm hover:shadow-emerald-950/50 flex-shrink-0"
            title="Simulate normal ISO Zone A baseline operation via WebMCP agent"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="hidden sm:inline">Simulate Normal State</span>
            <span className="sm:hidden">Normal</span>
          </button>

          {/* Quick Action: Simulate Bearing Fault (Trip Trigger) */}
          <button
            onClick={handleSimulateBearingFault}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border border-rose-700/80 text-xs font-bold transition shadow-sm hover:shadow-rose-950/50 flex-shrink-0 animate-pulse"
            title="Simulate high-frequency bearing fault and SIL-3 trip trigger"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="hidden sm:inline">Simulate Bearing Fault (Trip Trigger)</span>
            <span className="sm:hidden">Trip Trigger</span>
          </button>

          {/* Grandma Mode Toggle Button */}
          <button
            onClick={toggleGrandmaMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border ${
              grandmaMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle high-contrast Grandma Mode accessibility"
          >
            <span>👵</span>
            <span className="hidden md:inline">{grandmaMode ? 'Grandma Active' : 'Grandma Mode'}</span>
          </button>

          {/* Open Inspector Button */}
          <button
            onClick={onOpenInspector}
            className={`p-2 rounded-lg border transition ${
              isInspectorOpen 
                ? 'bg-mcp-purple text-white border-mcp-purple' 
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Toggle Agent Activity Inspector"
          >
            <Terminal className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};

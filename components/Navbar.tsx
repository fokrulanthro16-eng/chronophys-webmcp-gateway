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
  const [showSimMenu, setShowSimMenu] = useState(false);

  const triggerSimulation = (scenario: string) => {
    setShowSimMenu(false);
    if (scenario === 'FIND_AI_EDGE') {
      dispatchWebMCPAction('FILTER_CATALOG', { category: 'ai-edge', keyword: 'Phase' }, 'human-simulation', 'execute_action');
    } else if (scenario === 'AUTOFILL_ENTERPRISE') {
      dispatchWebMCPAction('AUTOFILL_FORM', {
        customerName: 'Sarah Connor',
        email: 'sarah.c@cyberdyne-defense.com',
        company: 'Cyberdyne Systems Corp',
        serviceCategory: 'ai-edge',
        urgencyLevel: 'emergency',
        notes: 'Need urgent ISO 10816-3 optical vibration setup on turbogenerator turbine bearing.',
        itemId: 'prod-001'
      }, 'human-simulation', 'execute_action');
    } else if (scenario === 'SELECT_CAT_IV') {
      dispatchWebMCPAction('SELECT_ITEM', { itemId: 'prod-006' }, 'human-simulation', 'execute_action');
    } else if (scenario === 'RESET') {
      dispatchWebMCPAction('RESET_STATE', {}, 'human-simulation', 'execute_action');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Standard Tag */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mcp-purple to-mcp-cyan flex items-center justify-center text-white shadow-lg shadow-mcp-purple/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-100 tracking-tight">
                ChronoPhys <span className="text-mcp-cyan">WebMCP</span>
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-mcp-purple/20 text-mcp-purple border border-mcp-purple/40 font-semibold">
                document.modelContext
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Agentic Web Platform • W3C WebMCP Standard</p>
          </div>
        </div>

        {/* Action Indicators & Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Active Action Pulse Notification */}
          {activeActionEffect && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs font-mono animate-pulse shadow-md">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agent Action: <b>{activeActionEffect}</b></span>
            </div>
          )}

          {/* WebMCP Connection Status Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-semibold hidden sm:inline">
              WebMCP:
            </span>
            <span className={isReady ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isReady ? `${registeredTools.length} Tools Ready` : 'Initializing...'}
            </span>
          </div>

          {/* Test Agent Simulation Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSimMenu(!showSimMenu)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
              title="Simulate autonomous browser agent executing WebMCP tools"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate Agent</span>
            </button>

            {showSimMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Sample Agent Invocations
                </div>
                <button
                  onClick={() => triggerSimulation('FIND_AI_EDGE')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>🔍 Filter: AI-Edge + "Phase"</span>
                  <span className="text-[10px] font-mono text-mcp-cyan">Tool 1+2</span>
                </button>
                <button
                  onClick={() => triggerSimulation('AUTOFILL_ENTERPRISE')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>📝 Autofill Enterprise Quote</span>
                  <span className="text-[10px] font-mono text-emerald-400">Action</span>
                </button>
                <button
                  onClick={() => triggerSimulation('SELECT_CAT_IV')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>🎯 Select Cat-IV Audit</span>
                  <span className="text-[10px] font-mono text-purple-400">Select</span>
                </button>
                <button
                  onClick={() => triggerSimulation('RESET')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 font-semibold"
                >
                  🔄 Reset Dashboard State
                </button>
              </div>
            )}
          </div>

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

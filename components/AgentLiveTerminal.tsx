"use client";

import React, { useState } from 'react';
import { Terminal, Play, Check, Copy, Trash2, Cpu, Sparkles, Send, Zap } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

export const AgentLiveTerminal: React.FC = () => {
  const { activityLogs, registeredTools, clearLogs, activeActionEffect } = useWebMCP();
  const [commandInput, setCommandInput] = useState<string>('');
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    setLastExecuted(cmd);
    setCommandInput('');

    if (cmd.includes('grandma') || cmd.includes('GRANDMA')) {
      dispatchWebMCPAction('TOGGLE_GRANDMA_MODE', {}, 'devtools', 'TOGGLE_GRANDMA_MODE');
    } else if (cmd.includes('trip') || cmd.includes('bearing') || cmd.includes('fault')) {
      dispatchWebMCPAction('AUTOFILL_FORM', {
        customerName: 'CLI Console Agent',
        email: 'cli.agent@webmcp.ai',
        company: 'Val Verde Turbines',
        urgencyLevel: 'emergency',
        notes: 'CLI Agent injected bearing fault outer race BPFO @ 142.5 Hz (ISO ZONE D).',
        itemId: 'prod-004'
      }, 'devtools', 'AUTOFILL_FORM');
    } else if (cmd.includes('normal') || cmd.includes('reset')) {
      dispatchWebMCPAction('RESET_STATE', {}, 'devtools', 'RESET_STATE');
    } else {
      // Default query catalog
      dispatchWebMCPAction('FILTER_CATALOG', { keyword: cmd }, 'devtools', 'query_catalog');
    }
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[340px] font-mono text-xs">
      
      {/* Terminal Title Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-mcp-cyan" />
          <span className="font-bold text-slate-200 text-xs">
            LIVE WEBMCP AGENT TERMINAL [JSON-RPC stream]
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>STREAMING</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <button
            onClick={clearLogs}
            className="hover:text-white p-1 rounded hover:bg-slate-800 transition"
            title="Clear terminal stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#050811] text-[11px] scrollbar-none">
        
        {/* System Banner */}
        <div className="text-slate-500 pb-1 border-b border-slate-900 flex items-center justify-between">
          <span>// document.modelContext W3C WebMCP Bridge • Ready for agent RPC</span>
          <span className="text-mcp-purple">Tools: [{registeredTools.join(', ')}]</span>
        </div>

        {activityLogs.length === 0 ? (
          <div className="text-slate-600 italic py-4 text-center">
            Awaiting browser agent tool execution or simulation trigger...
          </div>
        ) : (
          activityLogs.map((log) => (
            <div key={log.id} className="space-y-1">
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-emerald-400">⚡ [AGENT_EXEC]</span>
                <span className="text-mcp-cyan font-bold">{log.toolName}</span>
                <span className="text-[10px] text-slate-600">[{log.timestamp}]</span>
                <span className="text-[10px] text-emerald-400/80 font-bold ml-auto">{log.latencyMs}ms</span>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850 text-slate-300 text-[10px] overflow-x-auto">
                <span className="text-slate-500">PAYLOAD: </span>
                <span className="text-indigo-300">{JSON.stringify(log.input)}</span>
                <div className="mt-0.5">
                  <span className="text-slate-500">RESULT: </span>
                  <span className="text-emerald-300">{JSON.stringify(log.output)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive CLI Input */}
      <form onSubmit={handleCommandSubmit} className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2">
        <span className="text-emerald-400 font-bold pl-1">&gt;</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Execute agent command: 'bearing fault', 'grandma mode', 'Vibrometer', 'normal'..."
          className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition"
        >
          <Send className="w-3 h-3" />
          <span>Exec</span>
        </button>
      </form>

    </div>
  );
};

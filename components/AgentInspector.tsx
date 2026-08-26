"use client";

import React, { useState } from 'react';
import { useWebMCP } from './WebMCPProvider';
import { 
  Terminal, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Cpu, 
  Code2, 
  ExternalLink 
} from 'lucide-react';

interface AgentInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({ isOpen, onClose }) => {
  const { activityLogs, clearLogs, registeredTools } = useWebMCP();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySnippet = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sampleSnippets = [
    {
      title: "Query Industrial Sensor Catalog",
      code: `// Run in Chrome DevTools Console:
await window.__webmcp.queryCatalog("Vibrometer", "sensors");`,
    },
    {
      title: "Autofill RFQ Form as Autonomous Agent",
      code: `// Run in Chrome DevTools Console:
await window.__webmcp.executeAction("AUTOFILL_FORM", {
  customerName: "Dr. Gordon Freeman",
  email: "g.freeman@blackmesa.gov",
  company: "Black Mesa Research Facility",
  urgencyLevel: "emergency",
  notes: "Catastrophic resonance detected at 3.5 Hz on sector C cooling pumps.",
  itemId: "prod-001"
});`,
    },
    {
      title: "Trigger Accessibility Grandma Mode",
      code: `// Run in Chrome DevTools Console:
await window.__webmcp.executeAction("TOGGLE_GRANDMA_MODE", {});`,
    },
  ];

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[540px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-50 flex flex-col backdrop-blur-xl">
      
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-mcp-purple/20 border border-mcp-purple/50 flex items-center justify-center text-mcp-purple">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <span>Agent Activity Inspector</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Live WebMCP
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Telemetry & execution logs from document.modelContext</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition"
            title="Clear activity telemetry logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Registered Tools Bar */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 text-[11px]">Registered Tools ({registeredTools.length}):</span>
        <div className="flex items-center space-x-1.5">
          {registeredTools.map(t => (
            <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-mcp-cyan text-[10px] border border-slate-700">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* DevTools Testing Snippets Callout */}
        <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span className="flex items-center space-x-1.5">
              <Code2 className="w-4 h-4" />
              <span>DevTools Agent Console Snippets</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">window.__webmcp</span>
          </div>

          <div className="space-y-2">
            {sampleSnippets.map((snip, idx) => (
              <div key={idx} className="bg-slate-950/90 rounded-lg p-2.5 border border-slate-800 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-sans font-semibold">
                  <span>{snip.title}</span>
                  <button
                    onClick={() => copySnippet(snip.code, `snip-${idx}`)}
                    className="text-xs text-mcp-purple hover:text-indigo-300 flex items-center space-x-1"
                  >
                    {copiedId === `snip-${idx}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                  {snip.code}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Execution Timeline ({activityLogs.length})</span>
            <span className="text-[10px] font-mono text-slate-500">Real-Time Event Stream</span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic">
              No agent actions executed yet. Trigger a simulation or run a DevTools snippet above.
            </div>
          ) : (
            activityLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-md text-xs font-mono"
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3 cursor-pointer hover:bg-slate-850 flex items-center justify-between transition"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-mcp-cyan truncate">{log.toolName}</span>
                      <span className="text-[10px] text-slate-500">[{log.timestamp}]</span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">{log.latencyMs}ms</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {log.status}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 text-[11px]">
                      <div>
                        <div className="text-slate-400 font-bold mb-1">Input Payload:</div>
                        <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                          {JSON.stringify(log.input, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="text-slate-400 font-bold mb-1">Output Result:</div>
                        <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-emerald-300 overflow-x-auto">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

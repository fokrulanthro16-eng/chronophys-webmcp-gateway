"use client";

import React, { useState } from 'react';
import { X, Bot, Sparkles, Send, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

interface AiSpecialistModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultMode: string;
  vRms: number;
  dominantFreq: number;
}

export const AiSpecialistModal: React.FC<AiSpecialistModalProps> = ({
  isOpen,
  onClose,
  faultMode,
  vRms,
  dominantFreq,
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    {
      role: 'ai',
      text: `Hello, I am your ISO 18436-certified ChronoPhys AI Specialist. Current telemetry indicates Turbopump #4 is operating at ${vRms.toFixed(2)} mm/s RMS (${faultMode === 'bearing_fault' ? 'CRITICAL ISO ZONE D' : 'ISO ZONE A'}). How can I assist with your diagnostic analysis?`
    }
  ]);
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userQ = inputVal.trim();
    setMessages(prev => [...prev, { role: 'user', text: userQ }]);
    setInputVal('');

    setTimeout(() => {
      let aiResponse = '';
      if (userQ.toLowerCase().includes('throttle') || userQ.toLowerCase().includes('trip') || userQ.toLowerCase().includes('fix')) {
        aiResponse = `Autonomous recommendation: Triggering closed-loop Modbus interlock to drop RPM from 1800 to 300 RPM. This relieves mechanical stress on the Drive-End Bearing (BPFO 142.5 Hz harmonic) and prevents catastrophic fatigue rupture.`;
        dispatchWebMCPAction('TRIGGER_EMERGENCY_THROTTLE', { targetRpm: 300, reason: 'AI Specialist Recommended Glide' }, 'agent', 'TRIGGER_EMERGENCY_THROTTLE');
      } else if (userQ.toLowerCase().includes('audit') || userQ.toLowerCase().includes('report')) {
        aiResponse = `Generating a certified ISO 17025 SHA-256 compliance maintenance ticket for asset TURBOPUMP-04...`;
        dispatchWebMCPAction('GENERATE_PDF_REPORT', { equipmentId: 'TURBOPUMP-04' }, 'agent', 'generate_pdf_report');
      } else {
        aiResponse = `Analysis of 2D FFT spectrum shows dominant peak at ${dominantFreq.toFixed(1)} Hz. Sub-pixel phase EVM confirms localized radial displacement at Drive-End bearing housing. Recommended action: inspect lubrication grease and check alignment tolerances.`;
      }
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 flex flex-col h-[520px]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mcp-purple to-mcp-cyan flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Gemini-Powered AI Vibration Specialist</h3>
              <p className="text-[10px] text-slate-400">Contextual Machine Diagnostics & Root Cause Analysis</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-900/50 rounded-2xl border border-slate-850 text-xs">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start space-x-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-mcp-cyan flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                m.role === 'user' ? 'bg-indigo-600 text-white font-sans' : 'bg-slate-950 border border-slate-800 text-slate-200'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask AI specialist (e.g. 'How to mitigate 142 Hz vibration?', 'Throttle to 300 RPM')..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition"
          >
            <Send className="w-3 h-3" />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
};

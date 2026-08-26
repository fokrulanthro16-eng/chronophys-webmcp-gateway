"use client";

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, X, Activity, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

interface VoiceAgentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAgentOverlay: React.FC<VoiceAgentOverlayProps> = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>('');
  const [executedIntent, setExecutedIntent] = useState<string | null>(null);

  const sampleVoiceCommands = [
    { text: '"Trigger emergency throttle to 300 RPM"', action: 'TRIGGER_EMERGENCY_THROTTLE', payload: { targetRpm: 300 } },
    { text: '"Generate maintenance audit for Turbopump #4"', action: 'GENERATE_MAINTENANCE_AUDIT', payload: { equipmentId: 'TURBOPUMP-04' } },
    { text: '"Simulate bearing fault trip state"', action: 'AUTOFILL_FORM', payload: { urgencyLevel: 'emergency', notes: 'Voice Agent Trip Trigger', itemId: 'prod-004' } },
    { text: '"Toggle Grandma Mode accessibility"', action: 'TOGGLE_GRANDMA_MODE', payload: {} },
  ];

  const handleVoiceCommand = (cmd: typeof sampleVoiceCommands[0]) => {
    setTranscript(cmd.text);
    setExecutedIntent(`Executing WebMCP Tool: ${cmd.action}`);
    dispatchWebMCPAction(cmd.action as any, cmd.payload, 'agent', cmd.action);
    setTimeout(() => {
      onClose();
      setExecutedIntent(null);
      setTranscript('');
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-950 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] space-y-6 text-slate-100 text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Microphone Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-mcp-cyan flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.6)] animate-pulse">
          <Mic className="w-10 h-10" />
          <span className="absolute -inset-2 rounded-full border border-emerald-400 animate-ping opacity-75"></span>
        </div>

        {/* Voice Header */}
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
            <span>Hands-Free Factory Voice Agent</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              Active
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Speak industrial commands or select a preset voice trigger below
          </p>
        </div>

        {/* Simulated Waveform Pulse */}
        <div className="h-12 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-center space-x-1.5 px-4 overflow-hidden">
          {[4, 12, 28, 44, 20, 36, 18, 42, 26, 10, 32, 48, 14, 30, 8].map((h, i) => (
            <span
              key={i}
              className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
              style={{
                height: `${h}px`,
                animationDelay: `${i * 0.08}s`
              }}
            />
          ))}
        </div>

        {/* Status / Transcript Feedback */}
        {executedIntent ? (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center justify-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{executedIntent}</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-400 italic">
            Listening for plant commands...
          </div>
        )}

        {/* Voice Command Presets */}
        <div className="space-y-2 text-left">
          <div className="text-[11px] font-mono text-slate-500 uppercase font-bold px-1">
            Tap Quick Voice Triggers:
          </div>
          {sampleVoiceCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleVoiceCommand(cmd)}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/70 text-left text-xs font-mono text-slate-200 flex items-center justify-between transition group"
            >
              <span className="text-emerald-300 group-hover:text-white font-semibold">{cmd.text}</span>
              <span className="text-[10px] text-slate-500 uppercase">{cmd.action}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

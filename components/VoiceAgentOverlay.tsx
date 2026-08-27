"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Activity, Volume2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

interface VoiceAgentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAgentOverlay: React.FC<VoiceAgentOverlayProps> = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [executedIntent, setExecutedIntent] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  const sampleVoiceCommands = [
    { text: '"Record 30-second multi-modal demo"', action: 'RECORD_DEMO', payload: { duration: 30 } },
    { text: '"Trigger emergency throttle to 300 RPM"', action: 'TRIGGER_EMERGENCY_THROTTLE', payload: { targetRpm: 300 } },
    { text: '"Generate maintenance audit for Turbopump #4"', action: 'GENERATE_PDF_REPORT', payload: { equipmentId: 'TURBOPUMP-04' } },
    { text: '"Simulate bearing fault trip state"', action: 'AUTOFILL_FORM', payload: { urgencyLevel: 'emergency', notes: 'Voice Agent Trip Trigger', itemId: 'prod-004' } },
    { text: '"Toggle Grandma Mode accessibility"', action: 'TOGGLE_GRANDMA_MODE', payload: {} },
  ];

  // Process and dispatch spoken voice command
  const parseAndExecuteVoiceCommand = (spokenText: string) => {
    const text = spokenText.toLowerCase();
    setTranscript(spokenText);

    if (text.includes('record') || text.includes('recording') || text.includes('demo')) {
      setExecutedIntent('Executing WebMCP Tool: RECORD_DEMO');
      dispatchWebMCPAction('RECORD_DEMO', { duration: 30 }, 'voice-agent', 'record_demo');
    } else if (text.includes('throttle') || text.includes('slow down') || text.includes('glide')) {
      setExecutedIntent('Executing WebMCP Tool: TRIGGER_EMERGENCY_THROTTLE');
      dispatchWebMCPAction('TRIGGER_EMERGENCY_THROTTLE', { targetRpm: 300, reason: 'Voice Commanded Glide' }, 'voice-agent', 'TRIGGER_EMERGENCY_THROTTLE');
    } else if (text.includes('audit') || text.includes('pdf') || text.includes('report') || text.includes('certificate')) {
      setExecutedIntent('Executing WebMCP Tool: GENERATE_PDF_REPORT');
      dispatchWebMCPAction('GENERATE_PDF_REPORT', { equipmentId: 'TURBOPUMP-04' }, 'voice-agent', 'generate_pdf_report');
    } else if (text.includes('bearing') || text.includes('fault') || text.includes('trip') || text.includes('alarm')) {
      setExecutedIntent('Executing WebMCP Tool: AUTOFILL_FORM (Bearing Fault)');
      dispatchWebMCPAction('AUTOFILL_FORM', { urgencyLevel: 'emergency', notes: 'Voice Commanded Trip Trigger', itemId: 'prod-004' }, 'voice-agent', 'AUTOFILL_FORM');
    } else if (text.includes('grandma') || text.includes('contrast') || text.includes('accessibility')) {
      setExecutedIntent('Executing WebMCP Tool: TOGGLE_GRANDMA_MODE');
      dispatchWebMCPAction('TOGGLE_GRANDMA_MODE', {}, 'voice-agent', 'TOGGLE_GRANDMA_MODE');
    } else if (text.includes('specialist') || text.includes('assistant') || text.includes('help')) {
      setExecutedIntent('Executing WebMCP Tool: TOGGLE_AI_SPECIALIST');
      dispatchWebMCPAction('TOGGLE_AI_SPECIALIST', { open: true }, 'voice-agent', 'toggle_ai_specialist');
    } else if (text.includes('normal') || text.includes('baseline') || text.includes('reset')) {
      setExecutedIntent('Executing WebMCP Tool: RESET_STATE');
      dispatchWebMCPAction('RESET_STATE', {}, 'voice-agent', 'execute_action');
    } else {
      setExecutedIntent(`Heard: "${spokenText}" (Say "Record Demo", "Bearing Fault", "Grandma Mode")`);
      return;
    }

    setTimeout(() => {
      onClose();
      setExecutedIntent(null);
      setTranscript('');
    }, 1600);
  };

  // Initialize native browser Web Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const spoken = event.results[current][0].transcript;
        setTranscript(spoken);
        if (event.results[current].isFinal) {
          parseAndExecuteVoiceCommand(spoken);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error/pause:', e);
      };

      recognition.onend = () => {
        if (isOpen) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {}
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen]);

  const handlePresetClick = (cmd: typeof sampleVoiceCommands[0]) => {
    setTranscript(cmd.text);
    setExecutedIntent(`Executing WebMCP Tool: ${cmd.action}`);
    dispatchWebMCPAction(cmd.action as any, cmd.payload, 'voice-agent', cmd.action);
    setTimeout(() => {
      onClose();
      setExecutedIntent(null);
      setTranscript('');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn font-mono">
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
              {isListening ? 'Listening Live' : 'Active'}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Speak industrial commands naturally into your microphone or tap a preset below:
          </p>
        </div>

        {/* Simulated Waveform Pulse */}
        <div className="h-12 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-center space-x-1.5 px-4 overflow-hidden">
          {[6, 14, 28, 44, 20, 36, 18, 42, 26, 12, 32, 48, 14, 30, 10].map((h, i) => (
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

        {/* Live Transcript / Feedback */}
        {executedIntent ? (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center justify-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{executedIntent}</span>
          </div>
        ) : transcript ? (
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-mcp-cyan text-xs font-mono">
            &ldquo;{transcript}&rdquo;
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-400 italic">
            Say &ldquo;Record Demo&rdquo;, &ldquo;Bearing Fault&rdquo;, &ldquo;Grandma Mode&rdquo;, &ldquo;Generate Report&rdquo;...
          </div>
        )}

        {/* Voice Command Presets */}
        <div className="space-y-2 text-left">
          <div className="text-[11px] font-mono text-slate-500 uppercase font-bold px-1">
            Or Tap Quick Voice Triggers:
          </div>
          {sampleVoiceCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(cmd)}
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

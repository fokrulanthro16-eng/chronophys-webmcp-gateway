"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, Activity, ShieldAlert, Cpu, Eye, Layers, Lock, Sliders, Play, Pause, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';

interface DualVisionCanvasProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
  dominantFreq: number;
  alpha: number;
  onAlphaChange: (val: number) => void;
  autoLockEnabled: boolean;
  onToggleAutoLock: () => void;
  isRecording?: boolean;
  userRole?: 'operator' | 'analyst' | 'manager';
}

export const DualVisionCanvas: React.FC<DualVisionCanvasProps> = ({
  faultMode,
  vRms,
  dominantFreq,
  alpha,
  onAlphaChange,
  autoLockEnabled,
  onToggleAutoLock,
  isRecording,
  userRole = 'analyst'
}) => {
  const [streamConnected, setStreamConnected] = useState<boolean>(true);
  const [streamNonce, setStreamNonce] = useState<number>(Date.now());
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { grandmaMode } = useWebMCP();

  // Exponential Backoff Reconnect Logic
  const handleStreamError = () => {
    setStreamConnected(false);
    if (reconnectAttempt < 5) {
      setIsReconnecting(true);
      const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttempt));
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
        setStreamNonce(Date.now());
      }, delay);
    } else {
      setIsReconnecting(false);
    }
  };

  const handleManualReconnect = () => {
    setReconnectAttempt(0);
    setIsReconnecting(true);
    setStreamNonce(Date.now());
  };

  const handleStreamLoad = () => {
    setStreamConnected(true);
    setIsReconnecting(false);
    setReconnectAttempt(0);
  };

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Send real-time config updates to Python backend
  const handleAlphaChange = (newAlpha: number) => {
    onAlphaChange(newAlpha);
    fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha: newAlpha })
    }).catch(() => {});
  };

  const handleAutoLockToggle = () => {
    const nextState = !autoLockEnabled;
    onToggleAutoLock();
    fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_lock_enabled: nextState })
    }).catch(() => {});
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-2 p-3 font-mono">
      
      {/* Stream Controls Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
        <div className="flex items-center space-x-2">
          {streamConnected ? (
            <div className="flex items-center space-x-1 text-emerald-400 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE OPTICAL RIG (60 FPS)</span>
            </div>
          ) : isReconnecting ? (
            <div className="flex items-center space-x-1 text-amber-400 text-[10px] font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>RECONNECTING ({reconnectAttempt}/5)...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-rose-400 text-[10px] font-bold">
              <WifiOff className="w-3 h-3" />
              <span>STREAM OFFLINE</span>
            </div>
          )}

          {isRecording && (
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] animate-pulse flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>REC 30s</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {userRole !== 'operator' && (
            <button
              onClick={handleAutoLockToggle}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition ${
                autoLockEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-900 text-slate-400'
              }`}
              title="Lock/Unlock Optical Machine Components"
            >
              <Lock className="w-3 h-3" />
              <span>Auto-Lock ROIs</span>
            </button>
          )}

          <button
            onClick={handleManualReconnect}
            className="p-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition"
            title="Force Reconnect Video Streams"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dual Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        
        {/* Stream 1: Raw Optical Sensor Feed */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-850 aspect-[16/10] flex items-center justify-center">
          <img
            key={`raw-${streamNonce}`}
            src={`http://localhost:8000/video_feed_raw?t=${streamNonce}`}
            alt="Raw Optical Stream"
            className="w-full h-full object-cover"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
          />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-750 text-[9px] text-slate-200">
            CAM-01 [RAW OPTICAL SENSOR • 60 FPS]
          </span>
        </div>

        {/* Stream 2: Phase-EVM Magnified Stream Feed */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-850 aspect-[16/10] flex items-center justify-center">
          <img
            key={`phase-${streamNonce}`}
            src={`http://localhost:8000/video_feed_phase?t=${streamNonce}`}
            alt="Phase EVM Stream"
            className="w-full h-full object-cover"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
          />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-750 text-[9px] text-mcp-cyan">
            CAM-02 [PHASE-EVM α={alpha}X • LIVE]
          </span>
        </div>

      </div>

      {/* EVM Alpha Slider Dock */}
      <div className="px-2 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3 w-3/4">
          <span className="text-slate-400 text-[10px] flex-shrink-0">Phase EVM Gain (α):</span>
          <input
            type="range"
            min={5}
            max={100}
            disabled={userRole === 'operator'}
            value={alpha}
            onChange={(e) => handleAlphaChange(Number(e.target.value))}
            className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 ${
              userRole === 'operator' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <span className="text-emerald-400 font-bold w-8 text-right text-[11px]">{alpha}x</span>
        </div>

        <span className="text-[10px] text-slate-400">
          {userRole === 'operator' ? 'View Only' : 'Sub-pixel Phase: 0.001 mm'}
        </span>
      </div>

    </div>
  );
};

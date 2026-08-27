"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, Activity, ShieldAlert, Cpu, Eye, Layers, Lock, Sliders, Play, Pause, RefreshCw, Wifi, WifiOff, AlertCircle, Gauge, Flame } from 'lucide-react';
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
  lowHz?: number;
  highHz?: number;
  onBandpassChange?: (low: number, high: number) => void;
  nominalRpm?: number;
  onRpmChange?: (rpm: number) => void;
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
  userRole = 'analyst',
  lowHz = 1.0,
  highHz = 6.0,
  onBandpassChange,
  nominalRpm = 1800,
  onRpmChange
}) => {
  const [streamConnected, setStreamConnected] = useState<boolean>(true);
  const [streamNonce, setStreamNonce] = useState<number>(Date.now());
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [localLowHz, setLocalLowHz] = useState<number>(lowHz);
  const [localHighHz, setLocalHighHz] = useState<number>(highHz);
  const [localRpm, setLocalRpm] = useState<number>(nominalRpm);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleHeatmapToggle = () => {
    const next = !showHeatmap;
    setShowHeatmap(next);
    fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_ar_heatmap: next })
    }).catch(() => {});
  };

  const handleBandpassUpdate = (low: number, high: number) => {
    setLocalLowHz(low);
    setLocalHighHz(high);
    if (onBandpassChange) onBandpassChange(low, high);
    fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ low_hz: low, high_hz: high })
    }).catch(() => {});
  };

  const handleRpmUpdate = (rpm: number) => {
    setLocalRpm(rpm);
    if (onRpmChange) onRpmChange(rpm);
    fetch('http://localhost:8000/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominal_rpm: rpm })
    }).catch(() => {});
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4 font-mono backdrop-blur-md">
      
      {/* Stream Controls Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
        <div className="flex items-center space-x-2">
          {streamConnected ? (
            <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE OPTICAL TELEMETRY RIG (60 FPS)</span>
            </div>
          ) : isReconnecting ? (
            <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>RECONNECTING ({reconnectAttempt}/5)...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-bold">
              <WifiOff className="w-3.5 h-3.5" />
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

        <div className="flex items-center space-x-2">
          {userRole !== 'operator' && (
            <>
              <button
                onClick={handleAutoLockToggle}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition ${
                  autoLockEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-900 text-slate-400'
                }`}
                title="Lock/Unlock Optical Machine Components"
              >
                <Lock className="w-3 h-3" />
                <span>Auto-Lock</span>
              </button>

              <button
                onClick={handleHeatmapToggle}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition ${
                  showHeatmap ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow' : 'bg-slate-900 text-slate-400'
                }`}
                title="Toggle AR Stress Heatmap"
              >
                <Flame className="w-3 h-3" />
                <span>Heatmap</span>
              </button>
            </>
          )}

          <button
            onClick={handleManualReconnect}
            className="p-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition border border-slate-800"
            title="Force Reconnect Video Streams"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dual Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Stream 1: Raw Optical Sensor Feed */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 aspect-[16/10] flex items-center justify-center shadow-inner">
          <img
            key={`raw-${streamNonce}`}
            src={`http://localhost:8000/video_feed_raw?t=${streamNonce}`}
            alt="Raw Optical Stream"
            className="w-full h-full object-cover"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-lg bg-slate-950/85 border border-slate-750 text-[10px] text-slate-200 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>CAM-01 [RAW OPTICAL SENSOR]</span>
          </div>
        </div>

        {/* Stream 2: Phase-EVM Magnified Stream Feed */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 aspect-[16/10] flex items-center justify-center shadow-inner">
          <img
            key={`phase-${streamNonce}`}
            src={`http://localhost:8000/video_feed_phase?t=${streamNonce}`}
            alt="Phase EVM Stream"
            className="w-full h-full object-cover"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-lg bg-slate-950/85 border border-cyan-800/80 text-[10px] text-mcp-cyan flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>CAM-02 [PHASE-EVM α={alpha}X]</span>
          </div>
        </div>

      </div>

      {/* Interactive Parameter Sliders Dock */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        {/* 1. Magnification Factor (α) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-slate-400">EVM Gain (α):</span>
            <span className="text-cyan-400 font-bold">{alpha}x</span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            disabled={userRole === 'operator'}
            value={alpha}
            onChange={(e) => handleAlphaChange(Number(e.target.value))}
            className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 ${
              userRole === 'operator' ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* 2. Frequency Bandpass (f_low - f_high) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-slate-400">Bandpass:</span>
            <span className="text-purple-400 font-bold">{localLowHz.toFixed(1)} - {localHighHz.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            disabled={userRole === 'operator'}
            value={localHighHz}
            onChange={(e) => handleBandpassUpdate(localLowHz, Number(e.target.value))}
            className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400 ${
              userRole === 'operator' ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* 3. Nominal Shaft RPM */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-slate-400">Nominal RPM:</span>
            <span className="text-emerald-400 font-bold">{localRpm} RPM</span>
          </div>
          <input
            type="range"
            min={600}
            max={3600}
            step={50}
            disabled={userRole === 'operator'}
            value={localRpm}
            onChange={(e) => handleRpmUpdate(Number(e.target.value))}
            className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 ${
              userRole === 'operator' ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          />
        </div>

      </div>

    </div>
  );
};

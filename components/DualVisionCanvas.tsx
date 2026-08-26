"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, Activity, ShieldAlert, Cpu, Eye, Layers, Lock, Sliders, Play, Pause } from 'lucide-react';
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
}

export const DualVisionCanvas: React.FC<DualVisionCanvasProps> = ({
  faultMode,
  vRms,
  dominantFreq,
  alpha,
  onAlphaChange,
  autoLockEnabled,
  onToggleAutoLock,
  isRecording
}) => {
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const evmCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'raw' | 'evm'>('split');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const { grandmaMode, activeActionEffect } = useWebMCP();

  useEffect(() => {
    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.04;
      const baseAmp = faultMode === 'bearing_fault' ? 9.5 : (faultMode === 'unbalance' ? 6.0 : 1.2);
      const magnifiedAmp = baseAmp * (alpha / 15);
      const vibY = Math.sin(time * 8.5) * magnifiedAmp;
      const vibX = Math.cos(time * 8.5) * (magnifiedAmp * 0.4);

      // --- 1. Render Raw Optical Sensor Canvas ---
      const rawCanvas = rawCanvasRef.current;
      if (rawCanvas) {
        const ctx = rawCanvas.getContext('2d');
        if (ctx) {
          const w = rawCanvas.width;
          const h = rawCanvas.height;
          ctx.fillStyle = '#060910';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
          for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

          // Physical Machine Body
          const cx = w * 0.45;
          const cy = h * 0.52;

          // Baseplate
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx - 110, cy + 55, 260, 16);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(cx - 110, cy + 55, 260, 16);

          // Stator
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(cx - 90, cy - 45, 120, 100, 8);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // DE Bearing
          ctx.fillStyle = '#334155';
          ctx.fillRect(cx + 35, cy - 30, 30, 70);
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(cx + 35, cy - 30, 30, 70);

          // Shaft & Coupling
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(cx + 65, cy - 10, 60, 20);
          ctx.fillStyle = '#475569';
          ctx.fillRect(cx + 95, cy - 16, 20, 32);

          // Impeller
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(cx + 150, cy, 35, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#6366f1';
          ctx.stroke();

          // ArUco Calibration Marker
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 105, cy - 40, 18, 18);
          ctx.fillStyle = '#000000';
          ctx.fillRect(cx - 101, cy - 36, 10, 10);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 97, cy - 32, 4, 4);

          // Machine Component Tracking Bounding Boxes
          if (autoLockEnabled) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            // DE Bearing ROI
            ctx.strokeRect(cx + 25, cy - 38, 48, 85);
            ctx.font = '8px monospace';
            ctx.fillStyle = '#10b981';
            ctx.fillText('ROI-1: DE BEARING', cx + 25, cy - 42);

            // Coupling ROI
            ctx.strokeStyle = '#8b5cf6';
            ctx.strokeRect(cx + 85, cy - 22, 40, 45);
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText('ROI-2: COUPLING', cx + 85, cy - 26);
            ctx.setLineDash([]);
          }

          // Camera Calibration HUD
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.roundRect(10, 10, 160, 48, 6);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('● RAW OPTICAL STREAM', 16, 24);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '8px monospace';
          ctx.fillText('CALIB: 0.052 mm/px [ArUco]', 16, 36);
          ctx.fillText('STATUS: LOCKED (4 ROIs)', 16, 48);
        }
      }

      // --- 2. Render Phase-Based EVM Magnified Canvas ---
      const evmCanvas = evmCanvasRef.current;
      if (evmCanvas) {
        const ctx = evmCanvas.getContext('2d');
        if (ctx) {
          const w = evmCanvas.width;
          const h = evmCanvas.height;
          ctx.fillStyle = '#060910';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
          for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

          const cx = w * 0.45;
          const cy = h * 0.52;

          // Vibrating Motor Body
          ctx.save();
          ctx.translate(cx + vibX, cy + vibY);

          // Stator
          const statorGrad = ctx.createLinearGradient(-90, -45, 30, 55);
          statorGrad.addColorStop(0, '#1e1b4b');
          statorGrad.addColorStop(1, '#020617');
          ctx.fillStyle = statorGrad;
          ctx.beginPath();
          ctx.roundRect(-90, -45, 120, 100, 8);
          ctx.fill();
          ctx.strokeStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#00ffcc';
          ctx.lineWidth = 2;
          ctx.stroke();

          // DE Bearing
          ctx.fillStyle = '#334155';
          ctx.fillRect(35, -30, 30, 70);
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(35, -30, 30, 70);

          // Shaft
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(65, -10, 60, 20);

          ctx.restore();

          // Heatmap Overlay
          if (showHeatmap) {
            const heatGrad = ctx.createRadialGradient(cx + 45 + vibX, cy + vibY, 4, cx + 45, cy, faultMode === 'bearing_fault' ? 90 : 45);
            if (faultMode === 'bearing_fault') {
              heatGrad.addColorStop(0, 'rgba(244, 63, 94, 0.6)');
              heatGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
            } else {
              heatGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
              heatGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
            }
            ctx.fillStyle = heatGrad;
            ctx.beginPath();
            ctx.arc(cx + 45, cy, 90, 0, Math.PI * 2);
            ctx.fill();
          }

          // EVM Motion Vectors
          if (showVectors) {
            [
              { x: cx - 40, y: cy - 20 },
              { x: cx + 45, y: cy - 10 },
              { x: cx + 105, y: cy },
            ].forEach((pt, i) => {
              const dy = Math.sin(time * 8.5 + i * 0.8) * (magnifiedAmp * 1.5);
              const dx = Math.cos(time * 8.5 + i * 0.8) * (magnifiedAmp * 0.5);
              ctx.strokeStyle = faultMode === 'bearing_fault' ? '#ff0055' : '#00ffcc';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.lineTo(pt.x + dx, pt.y + dy);
              ctx.stroke();
              ctx.fillStyle = ctx.strokeStyle;
              ctx.beginPath();
              ctx.arc(pt.x + dx, pt.y + dy, 3, 0, Math.PI * 2);
              ctx.fill();
            });
          }

          // EVM HUD
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.roundRect(10, 10, 175, 48, 6);
          ctx.fill();
          ctx.fillStyle = '#00ffcc';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`● PHASE-EVM STREAM [α=${alpha}X]`, 16, 24);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '8px monospace';
          ctx.fillText(`v_RMS: ${vRms.toFixed(2)} mm/s • ${dominantFreq.toFixed(1)} Hz`, 16, 36);
          ctx.fillText('DSP: Riesz Pyramid Bandpass', 16, 48);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [faultMode, alpha, autoLockEnabled, showHeatmap, showVectors, vRms, dominantFreq]);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-2 p-3 font-mono">
      
      {/* Stream Controls Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-100">DUAL OPTICAL TELEMETRY RIG</span>
          {isRecording && (
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] animate-pulse flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>REC 30s</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onToggleAutoLock}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition ${
              autoLockEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-900 text-slate-400'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>Auto-Lock ROIs</span>
          </button>

          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              showVectors ? 'bg-mcp-purple/30 text-mcp-cyan border border-mcp-purple/50' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Vectors
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              showHeatmap ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Dual Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Raw Optical Stream */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-850 aspect-[16/10]">
          <canvas ref={rawCanvasRef} width={360} height={225} className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-750 text-[9px] text-slate-300">
            CAM-01 [RAW 60 FPS]
          </span>
        </div>

        {/* Phase-EVM Magnified Stream */}
        <div className="relative bg-black rounded-xl overflow-hidden border border-slate-850 aspect-[16/10]">
          <canvas ref={evmCanvasRef} width={360} height={225} className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-750 text-[9px] text-mcp-cyan">
            CAM-02 [PHASE-EVM α={alpha}X]
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
            value={alpha}
            onChange={(e) => onAlphaChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <span className="text-emerald-400 font-bold w-8 text-right text-[11px]">{alpha}x</span>
        </div>

        <span className="text-[10px] text-slate-400">Sub-pixel Phase: 0.001 mm</span>
      </div>

    </div>
  );
};

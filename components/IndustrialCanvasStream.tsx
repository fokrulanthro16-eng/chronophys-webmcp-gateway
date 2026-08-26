"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Radio, Eye, Sparkles, Sliders, Play, Pause, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';

interface IndustrialCanvasStreamProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
  dominantFreq: number;
}

export const IndustrialCanvasStream: React.FC<IndustrialCanvasStreamProps> = ({
  faultMode,
  vRms,
  dominantFreq,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [alphaMagnification, setAlphaMagnification] = useState<number>(45);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const { grandmaMode, activeActionEffect } = useWebMCP();

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear dark background with industrial grid
      ctx.fillStyle = '#060910';
      ctx.fillRect(0, 0, w, h);

      // Fine grid background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Dynamic vibration amplitude modulation
      const baseAmp = faultMode === 'bearing_fault' ? 9.5 : (faultMode === 'unbalance' ? 6.0 : 1.2);
      const magnifiedAmp = (baseAmp * (alphaMagnification / 15)) * (isStreaming ? 1 : 0);
      const vibY = Math.sin(time * 8.5) * magnifiedAmp;
      const vibX = Math.cos(time * 8.5) * (magnifiedAmp * 0.4);

      // 2. Draw Industrial Machine Body (High-tech Turbopump / Motor)
      const cx = w * 0.45;
      const cy = h * 0.52;

      // Baseplate foundation
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 150, cy + 85, 360, 24);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 150, cy + 85, 360, 24);

      // Foundation bolts
      [-130, -30, 80, 180].forEach(bx => {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx + bx, cy + 78, 14, 10);
      });

      // Motor Stator Housing (Vibrating)
      ctx.save();
      ctx.translate(cx + vibX, cy + vibY);

      // Gradient Stator Shell
      const statorGrad = ctx.createLinearGradient(-120, -70, 80, 80);
      statorGrad.addColorStop(0, '#1e1b4b');
      statorGrad.addColorStop(0.5, '#0f172a');
      statorGrad.addColorStop(1, '#020617');
      ctx.fillStyle = statorGrad;
      ctx.beginPath();
      ctx.roundRect(-120, -70, 180, 150, 14);
      ctx.fill();
      ctx.strokeStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cooling Fins
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      for (let finX = -105; finX <= 45; finX += 15) {
        ctx.beginPath();
        ctx.moveTo(finX, -65);
        ctx.lineTo(finX, 75);
        ctx.stroke();
      }

      // Drive End Bearing Housing (NDE / DE)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(60, -45, 45, 100, 8);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      // Rotating Shaft
      const shaftGrad = ctx.createLinearGradient(105, -15, 180, 15);
      shaftGrad.addColorStop(0, '#94a3b8');
      shaftGrad.addColorStop(0.5, '#e2e8f0');
      shaftGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(105, -15, 85, 30);

      // Flexible Shaft Coupling
      ctx.fillStyle = '#475569';
      ctx.fillRect(150, -22, 28, 44);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(150, -22, 28, 44);

      // Driven Pump / Load Impeller Housing
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(220, 0, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.stroke();

      ctx.restore();

      // 3. Thermal Vibration Heatmap Overlay
      if (showHeatmap && isStreaming) {
        const heatGrad = ctx.createRadialGradient(cx + 80 + vibX, cy - 10 + vibY, 5, cx + 80, cy, faultMode === 'bearing_fault' ? 120 : 60);
        if (faultMode === 'bearing_fault') {
          heatGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
          heatGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.25)');
          heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          heatGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
          heatGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.15)');
          heatGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        }
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(cx + 80, cy, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Eulerian Motion Vectors (Sub-pixel Phase EVM Vectors)
      if (showVectors && isStreaming) {
        const vectorPoints = [
          { x: cx - 60, y: cy - 40 },
          { x: cx - 20, y: cy - 50 },
          { x: cx + 40, y: cy - 40 },
          { x: cx + 80, y: cy - 20 }, // Bearing DE
          { x: cx + 160, y: cy - 5 }, // Coupling
          { x: cx + 220, y: cy - 20 }, // Impeller
        ];

        vectorPoints.forEach((pt, idx) => {
          const phaseOffset = idx * 0.8;
          const dy = Math.sin(time * 8.5 + phaseOffset) * (magnifiedAmp * 1.8);
          const dx = Math.cos(time * 8.5 + phaseOffset) * (magnifiedAmp * 0.6);

          ctx.strokeStyle = faultMode === 'bearing_fault' ? '#ff0055' : '#00ffcc';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + dx, pt.y + dy);
          ctx.stroke();

          // Arrow head
          ctx.fillStyle = faultMode === 'bearing_fault' ? '#ff0055' : '#00ffcc';
          ctx.beginPath();
          ctx.arc(pt.x + dx, pt.y + dy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 5. Optical ROI Tracking Bounding Boxes
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      // Bearing DE ROI
      ctx.strokeRect(cx + 50, cy - 55, 65, 115);
      // Shaft Coupling ROI
      ctx.strokeStyle = '#8b5cf6';
      ctx.strokeRect(cx + 140, cy - 32, 50, 65);
      ctx.setLineDash([]);

      // ROI Labels
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('ROI-1 [DRIVE_END BEARING]', cx + 50, cy - 62);
      ctx.fillStyle = '#8b5cf6';
      ctx.fillText('ROI-2 [SHAFT COUPLING]', cx + 140, cy - 38);

      // 6. Real-Time HUD Overlay Metrics
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1;
      ctx.roundRect(14, 14, 230, 80, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('● OPTICAL PHASE-EVM ENGINE', 24, 32);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`MAGNIFICATION: α = ${alphaMagnification}X`, 24, 48);
      ctx.fillText(`BANDPASS: 1.0 Hz - 250.0 Hz`, 24, 62);
      ctx.fillText(`VELOCITY v_RMS: ${vRms.toFixed(2)} mm/s`, 24, 76);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [faultMode, alphaMagnification, showVectors, showHeatmap, isStreaming, vRms]);

  return (
    <div className="relative bg-slate-950/90 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      
      {/* Top Stream Header */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold font-mono text-slate-200">
            OPTICAL PHASE-EVM STREAM [640x380 @ 60 FPS]
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Jetson Orin 2.4 TFLOPS
          </span>
        </div>

        {/* Stream Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition flex items-center space-x-1 ${
              showVectors ? 'bg-mcp-purple/30 text-mcp-cyan border border-mcp-purple/50' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Vectors</span>
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition flex items-center space-x-1 ${
              showHeatmap ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Heatmap</span>
          </button>

          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas Stream Area */}
      <div className="relative w-full aspect-[16/9] max-h-[380px] bg-black">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-contain"
        />

        {/* Active Trip Banner Overlay */}
        {faultMode === 'bearing_fault' && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-rose-950/95 border-2 border-rose-500 text-rose-200 text-xs font-mono font-black flex items-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>HARDWARE TRIP ARMED (ISO ZONE D)</span>
          </div>
        )}
      </div>

      {/* Alpha Slider Bottom Bar */}
      <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3 w-2/3">
          <span className="text-slate-400 text-[11px] flex-shrink-0">EVM Amplification (α):</span>
          <input
            type="range"
            min={5}
            max={100}
            value={alphaMagnification}
            onChange={(e) => setAlphaMagnification(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <span className="text-emerald-400 font-bold w-10 text-right">{alphaMagnification}x</span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <span>Sub-pixel Phase:</span>
          <span className="text-emerald-400 font-semibold">0.001 mm Resolution</span>
        </div>
      </div>

    </div>
  );
};

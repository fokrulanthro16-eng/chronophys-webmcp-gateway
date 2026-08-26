"use client";

import React, { useEffect, useRef } from 'react';
import { Activity, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Layers, Waves, BarChart2 } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';

interface LiveTelemetryPanelProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
  dominantFreq: number;
  shaftRpm: number;
}

export const LiveTelemetryPanel: React.FC<LiveTelemetryPanelProps> = ({
  faultMode,
  vRms,
  dominantFreq,
  shaftRpm,
}) => {
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { grandmaMode } = useWebMCP();

  // Dynamic ISO Zone Evaluation
  const isoZone = vRms < 1.4 ? 'ZONE_A' : (vRms < 2.8 ? 'ZONE_B' : (vRms < 4.5 ? 'ZONE_C' : 'ZONE_D'));
  const isoColor = isoZone === 'ZONE_A' ? 'text-emerald-400 border-emerald-500 bg-emerald-950/40'
    : (isoZone === 'ZONE_B' ? 'text-cyan-400 border-cyan-500 bg-cyan-950/40'
    : (isoZone === 'ZONE_C' ? 'text-amber-400 border-amber-500 bg-amber-950/40'
    : 'text-rose-400 border-rose-500 bg-rose-950/60 animate-pulse'));

  // Animated FFT Spectrum & Waveform
  useEffect(() => {
    let animId: number;
    let time = 0;

    const renderCharts = () => {
      time += 0.05;

      // 1. Render FFT Power Spectrum Canvas
      const fftCanvas = fftCanvasRef.current;
      if (fftCanvas) {
        const ctx = fftCanvas.getContext('2d');
        if (ctx) {
          const w = fftCanvas.width;
          const h = fftCanvas.height;

          ctx.fillStyle = '#060910';
          ctx.fillRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
          ctx.lineWidth = 1;
          for (let y = 20; y < h; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Generate spectrum bars
          const numBins = 48;
          const binWidth = w / numBins;

          for (let i = 0; i < numBins; i++) {
            const freqHz = (i / numBins) * 200;
            let magnitude = Math.sin(i * 0.4 + time * 0.5) * 4 + 6;

            // 1X Shaft Harmonic (30 Hz @ 1800 RPM)
            if (Math.abs(freqHz - 30) < 5) {
              magnitude += faultMode === 'unbalance' ? 65 : 22;
            }

            // 2X Harmonic (60 Hz)
            if (Math.abs(freqHz - 60) < 5) {
              magnitude += faultMode === 'misalignment' ? 55 : 12;
            }

            // Bearing BPFO Fault (142.5 Hz)
            if (Math.abs(freqHz - 142) < 6) {
              magnitude += faultMode === 'bearing_fault' ? 78 : 4;
            }

            // Noise floor
            magnitude += (Math.random() - 0.5) * 3;
            const barHeight = Math.max(3, Math.min(h - 15, magnitude * 0.8));

            // Bar Gradient
            const barGrad = ctx.createLinearGradient(0, h, 0, h - barHeight);
            if (faultMode === 'bearing_fault' && Math.abs(freqHz - 142) < 8) {
              barGrad.addColorStop(0, '#f43f5e');
              barGrad.addColorStop(1, '#fda4af');
            } else {
              barGrad.addColorStop(0, '#06b6d4');
              barGrad.addColorStop(1, '#8b5cf6');
            }

            ctx.fillStyle = barGrad;
            ctx.fillRect(i * binWidth + 1, h - barHeight, binWidth - 2, barHeight);
          }

          // Spectrum Labels
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.fillText('0 Hz', 6, h - 4);
          ctx.fillText('1X (30 Hz)', w * 0.15, h - 4);
          ctx.fillText('2X (60 Hz)', w * 0.30, h - 4);
          ctx.fillText('BPFO (142 Hz)', w * 0.68, h - 4);
        }
      }

      // 2. Render Time-Domain Waveform Canvas v(t)
      const waveCanvas = waveCanvasRef.current;
      if (waveCanvas) {
        const ctx = waveCanvas.getContext('2d');
        if (ctx) {
          const w = waveCanvas.width;
          const h = waveCanvas.height;

          ctx.fillStyle = '#060910';
          ctx.fillRect(0, 0, w, h);

          // Center line
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Waveform line
          ctx.strokeStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();

          const amp = faultMode === 'bearing_fault' ? 32 : (faultMode === 'unbalance' ? 22 : 8);
          for (let x = 0; x < w; x += 2) {
            const tVal = x * 0.08 + time * 6;
            let yVal = Math.sin(tVal) * amp;

            if (faultMode === 'bearing_fault') {
              // Add high frequency burst modulation
              yVal += Math.sin(tVal * 4.75) * (amp * 0.8) * Math.sin(tVal * 0.5);
            }

            const yPos = (h / 2) + yVal;
            if (x === 0) ctx.moveTo(x, yPos);
            else ctx.lineTo(x, yPos);
          }
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(renderCharts);
    };

    renderCharts();
    return () => cancelAnimationFrame(animId);
  }, [faultMode]);

  return (
    <div className="space-y-4">
      
      {/* ISO 10816-3 Diagnostic Status Header */}
      <div className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between transition ${isoColor}`}>
        <div className="flex items-center space-x-3">
          {isoZone === 'ZONE_D' ? (
            <ShieldAlert className="w-7 h-7 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          )}
          <div>
            <div className="text-xs font-mono uppercase font-bold tracking-wider opacity-80">
              ISO 10816-3 Machine Group 2 Evaluation
            </div>
            <div className={`font-black tracking-tight ${grandmaMode ? 'text-2xl' : 'text-lg'}`}>
              {isoZone} — {isoZone === 'ZONE_A' ? 'GOOD / NEW COMMISSIONING' : (isoZone === 'ZONE_B' ? 'ACCEPTABLE UNRESTRICTED' : (isoZone === 'ZONE_C' ? 'RESTRICTED / ALARM' : 'CRITICAL SHUTDOWN TRIP'))}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-xs opacity-75">RMS Velocity</div>
          <div className="text-xl font-black">{vRms.toFixed(2)} mm/s</div>
        </div>
      </div>

      {/* Dual Real-Time Telemetry Charts (FFT Spectrum + Waveform) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        
        {/* 2D FFT Power Spectral Density */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-200 font-bold flex items-center space-x-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-mcp-cyan" />
              <span>2D FFT Modal Power Spectrum</span>
            </span>
            <span className="text-[10px] text-mcp-purple font-semibold">Peak: {dominantFreq.toFixed(1)} Hz</span>
          </div>

          <div className="w-full h-28 bg-black rounded-xl overflow-hidden border border-slate-850">
            <canvas ref={fftCanvasRef} width={340} height={112} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Time Domain Waveform v(t) */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-200 font-bold flex items-center space-x-1.5">
              <Waves className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vibration Velocity Waveform v(t)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{shaftRpm} RPM (1X = 30 Hz)</span>
          </div>

          <div className="w-full h-28 bg-black rounded-xl overflow-hidden border border-slate-850">
            <canvas ref={waveCanvasRef} width={340} height={112} className="w-full h-full object-cover" />
          </div>
        </div>

      </div>

      {/* Mechanical Fault Classification Matrix */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
          <span>Automated Mechanical Fault Matrix (ISO 10816-3 / 13373)</span>
          <span className="text-[10px] text-emerald-400">Deterministic DSP Classifier</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          
          {/* 1X Unbalance */}
          <div className={`p-2.5 rounded-xl border ${
            faultMode === 'unbalance' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}>
            <div className="text-[10px] text-slate-500 uppercase">1X Rotor Unbalance</div>
            <div className="font-bold">{faultMode === 'unbalance' ? '2.45 mm/s [ALERT]' : '0.14 mm/s [PASS]'}</div>
          </div>

          {/* 2X Misalignment */}
          <div className={`p-2.5 rounded-xl border ${
            faultMode === 'misalignment' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}>
            <div className="text-[10px] text-slate-500 uppercase">2X Shaft Misalignment</div>
            <div className="font-bold">{faultMode === 'misalignment' ? '3.10 mm/s [ALERT]' : '0.22 mm/s [PASS]'}</div>
          </div>

          {/* 3X Foundation Looseness */}
          <div className="p-2.5 rounded-xl border bg-slate-950/70 border-slate-800 text-slate-300">
            <div className="text-[10px] text-slate-500 uppercase">Foundation Looseness</div>
            <div className="font-bold">0.08 mm/s [PASS]</div>
          </div>

          {/* Bearing BPFO */}
          <div className={`p-2.5 rounded-xl border ${
            faultMode === 'bearing_fault' ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse' : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}>
            <div className="text-[10px] text-slate-500 uppercase">Bearing BPFO (142 Hz)</div>
            <div className="font-bold">{faultMode === 'bearing_fault' ? '7.85 mm/s [TRIP]' : '0.05 mm/s [PASS]'}</div>
          </div>

        </div>
      </div>

    </div>
  );
};

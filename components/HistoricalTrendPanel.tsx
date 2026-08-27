"use client";

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Clock, Calendar, Activity, RefreshCw } from 'lucide-react';

interface HistoricalTrendPanelProps {
  faultMode: string;
  vRms: number;
}

export const HistoricalTrendPanel: React.FC<HistoricalTrendPanelProps> = ({ faultMode, vRms }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(28);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 40; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // ISO Threshold Zones (A < 1.4, B < 2.8, C < 4.5, D > 4.5)
    const maxScaleV = 8.0;
    const getY = (val: number) => h - (val / maxScaleV) * (h - 20) - 10;

    // ISO Zone C & D Lines
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, getY(4.5));
    ctx.lineTo(w, getY(4.5));
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, getY(2.8));
    ctx.lineTo(w, getY(2.8));
    ctx.stroke();
    ctx.setLineDash([]);

    // 7-day trend simulation points
    const points: Array<{ x: number; y: number; v: number }> = [];
    const totalPoints = 28;
    const stepX = (w - 20) / (totalPoints - 1);

    for (let i = 0; i < totalPoints; i++) {
      const dayProgress = i / totalPoints;
      let baseV = 0.52 + 0.15 * Math.sin(i * 0.6);
      if (i > 22 && faultMode === 'bearing_fault') {
        baseV += (i - 22) * 1.2;
      } else if (i > 22 && faultMode === 'unbalance') {
        baseV += (i - 22) * 0.35;
      }
      if (i === totalPoints - 1) {
        baseV = vRms;
      }
      const clampedV = Math.min(8.0, baseV);
      points.push({ x: 10 + i * stepX, y: getY(clampedV), v: clampedV });
    }

    // Fill gradient under trendline
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, faultMode === 'bearing_fault' ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.25)');
    fillGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw stroke line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.strokeStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw last point pulse
    const lastPt = points[points.length - 1];
    ctx.fillStyle = faultMode === 'bearing_fault' ? '#f43f5e' : '#10b981';
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [faultMode, vRms]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col space-y-2 font-mono backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs text-slate-200">7-DAY HISTORICAL VIBRATION TREND</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          ISO 10816-3 Limits
        </span>
      </div>

      <div className="relative flex-1 min-h-[140px] bg-slate-950 rounded-xl overflow-hidden border border-slate-850">
        <canvas ref={canvasRef} width={420} height={140} className="w-full h-full object-cover" />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 px-1">
        <span>-7 Days</span>
        <span>-5 Days</span>
        <span>-3 Days</span>
        <span>-1 Day</span>
        <span className="text-emerald-400 font-bold">Live Now</span>
      </div>
    </div>
  );
};

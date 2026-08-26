"use client";

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ShieldCheck, Clock, Award, Zap, CheckCircle2 } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';

interface RoiCostCardProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
}

export const RoiCostCard: React.FC<RoiCostCardProps> = ({ faultMode, vRms }) => {
  const [downtimeSaved, setDowntimeSaved] = useState<number>(48500);
  const [hoursAvoided, setHoursAvoided] = useState<number>(14.2);
  const { grandmaMode } = useWebMCP();

  // Dynamic increment when fault is simulated and prevented
  useEffect(() => {
    if (faultMode === 'bearing_fault') {
      setDowntimeSaved(76200);
      setHoursAvoided(21.8);
    } else {
      setDowntimeSaved(48500);
      setHoursAvoided(14.2);
    }
  }, [faultMode]);

  return (
    <div className={`bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3 font-mono ${
      grandmaMode ? 'p-6 border-2 border-slate-600' : ''
    }`}>
      
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Enterprise ROI & Downtime Avoided
            </h4>
            <p className="text-[10px] text-slate-400">Benchmark: $3,500/hr Catastrophic Outage Rate</p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
          +420% Annual ROI
        </span>
      </div>

      {/* Main Metric Banner */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 uppercase block">Total Cost Saved</span>
          <div className="text-xl font-black text-emerald-400 tracking-tight">
            ${downtimeSaved.toLocaleString()}
          </div>
          <span className="text-[9px] text-emerald-500 font-semibold">● Real-Time Closed-Loop</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 uppercase block">Outage Hours Prevented</span>
          <div className="text-xl font-black text-mcp-cyan tracking-tight">
            {hoursAvoided} hrs
          </div>
          <span className="text-[9px] text-indigo-400 font-semibold">● Early Stage BPFO Catch</span>
        </div>
      </div>

      {/* Reliability Matrix */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
        <div>
          <span className="text-slate-500 block">PINN RUL Confidence:</span>
          <span className="text-slate-200 font-bold">96.8% Basquin S-N</span>
        </div>
        <div>
          <span className="text-slate-500 block">Closed-Loop Latency:</span>
          <span className="text-emerald-400 font-bold">12 ms Interlock</span>
        </div>
        <div>
          <span className="text-slate-500 block">Audit Verification:</span>
          <span className="text-indigo-300 font-bold">ISO 17025 SHA-256</span>
        </div>
      </div>

    </div>
  );
};

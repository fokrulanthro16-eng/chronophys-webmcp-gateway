"use client";

import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Zap, DollarSign, TrendingUp, Clock, Layers } from 'lucide-react';

interface ExecutiveMetricsSuiteProps {
  faultMode: 'normal' | 'bearing_fault' | 'unbalance' | 'misalignment';
  vRms: number;
  dominantFreq: number;
  shaftRpm: number;
  userRole?: 'operator' | 'analyst' | 'manager';
}

export const ExecutiveMetricsSuite: React.FC<ExecutiveMetricsSuiteProps> = ({
  faultMode,
  vRms,
  dominantFreq,
  shaftRpm,
  userRole = 'analyst'
}) => {
  // ISO 10816-3 Zone Determination
  const isoZone = vRms < 1.4 ? 'ZONE_A' : (vRms < 2.8 ? 'ZONE_B' : (vRms < 4.5 ? 'ZONE_C' : 'ZONE_D'));
  
  // Dynamic metrics based on faultMode & vRms
  const rulHours = faultMode === 'bearing_fault' ? 48.5 : (faultMode === 'unbalance' ? 1420 : 99999);
  const stressMpa = (vRms * 14.2).toFixed(1);
  const damagePct = faultMode === 'bearing_fault' ? '86.4%' : (faultMode === 'unbalance' ? '18.2%' : '0.4%');
  const crossPhase = faultMode === 'misalignment' ? '+178.4°' : (faultMode === 'bearing_fault' ? '+94.2°' : '+0.0°');
  const phaseDesc = faultMode === 'misalignment' ? '180° Out-of-Phase (Coupling Angular)' : (faultMode === 'bearing_fault' ? 'Non-Synchronous (Defect Pulse)' : 'In-Phase (1X Dynamic Baseline)');
  const throttlePct = faultMode === 'bearing_fault' ? '16.7%' : '100.0%';
  const safetyStatus = faultMode === 'bearing_fault' ? 'ZONE D TRIP (Modbus Safe Glide)' : 'ARMED / NORMAL (SIL-3)';
  const dollarsSaved = faultMode === 'bearing_fault' ? '$142,500' : '$54,750';
  const avoidedHrs = faultMode === 'bearing_fault' ? '38.4h' : '14.2h';
  const ahiPct = faultMode === 'bearing_fault' ? '34.2%' : (faultMode === 'unbalance' ? '72.0%' : '92.5%');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
      
      {/* 1. Vibration Velocity (v_RMS) */}
      <div className={`p-3.5 rounded-2xl border transition duration-300 backdrop-blur-md shadow-lg ${
        isoZone === 'ZONE_D' 
          ? 'bg-rose-950/70 border-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse' 
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Vibration Velocity</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
            isoZone === 'ZONE_A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
            isoZone === 'ZONE_B' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
            isoZone === 'ZONE_C' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
            'bg-rose-950 text-rose-300 border border-rose-600 animate-ping'
          }`}>
            {isoZone}
          </span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className={`text-2xl font-black ${
            isoZone === 'ZONE_D' ? 'text-rose-300' : 'text-cyan-400'
          }`}>
            {vRms.toFixed(2)}
          </span>
          <span className="text-xs font-bold text-slate-400">mm/s</span>
        </div>
        <div className="mt-2 flex justify-between text-[9px] font-semibold text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span className={vRms < 1.4 ? 'text-emerald-400 font-bold' : ''}>A (&lt;1.4)</span>
          <span className={vRms >= 1.4 && vRms < 2.8 ? 'text-cyan-400 font-bold' : ''}>B (&lt;2.8)</span>
          <span className={vRms >= 2.8 && vRms < 4.5 ? 'text-amber-400 font-bold' : ''}>C (&lt;4.5)</span>
          <span className={vRms >= 4.5 ? 'text-rose-400 font-black' : ''}>D (&gt;4.5)</span>
        </div>
      </div>

      {/* 2. PINN Remaining Useful Life */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shadow-lg backdrop-blur-md">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>PINN Fatigue RUL</span>
          <span className="text-[9px] text-purple-400">Basquin S-N</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className={`text-2xl font-black ${
            faultMode === 'bearing_fault' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {rulHours.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-slate-400">Hours</span>
        </div>
        <div className="mt-2 flex justify-between text-[9.5px] text-slate-300 border-t border-slate-800/80 pt-1.5">
          <span>Stress: <b className="text-purple-300">{stressMpa} MPa</b></span>
          <span>Damage: <b className={faultMode === 'bearing_fault' ? 'text-rose-400' : 'text-cyan-300'}>{damagePct}</b></span>
        </div>
      </div>

      {/* 3. DE vs NDE Cross Phase */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shadow-lg backdrop-blur-md">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Cross Phase (Δθ)</span>
          <span className="text-[9px] text-cyan-400">DE ↔ NDE</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className="text-2xl font-black text-purple-400">{crossPhase}</span>
        </div>
        <div className="mt-2 text-[9.5px] text-cyan-300 font-medium truncate border-t border-slate-800/80 pt-1.5">
          {phaseDesc}
        </div>
      </div>

      {/* 4. Modbus VFD Reference & Safety */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shadow-lg backdrop-blur-md">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Modbus VFD Ref</span>
          <span className="text-[9px] text-emerald-400">Port 5020</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className={`text-2xl font-black ${
            faultMode === 'bearing_fault' ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {throttlePct}
          </span>
          <span className="text-xs font-bold text-slate-400">Speed</span>
        </div>
        <div className={`mt-2 text-[9.5px] font-bold truncate border-t border-slate-800/80 pt-1.5 ${
          faultMode === 'bearing_fault' ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {safetyStatus}
        </div>
      </div>

      {/* 5. Executive Financial ROI & Downtime Saved */}
      <div className={`p-3.5 rounded-2xl border transition duration-300 backdrop-blur-md shadow-lg relative overflow-hidden ${
        userRole === 'manager' 
          ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 border-emerald-500 ring-2 ring-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
          : 'bg-gradient-to-br from-emerald-950/60 to-slate-900/80 border-emerald-800/60'
      }`}>
        <div className="flex justify-between items-center">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Downtime Cost Saved</div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700">ROI</span>
        </div>
        <div className="mt-1 flex items-baseline space-x-1">
          <span className="text-2xl font-black text-emerald-300">{dollarsSaved}</span>
          <span className="text-[10px] text-slate-400 font-bold">Saved</span>
        </div>
        <div className="mt-2 flex justify-between text-[9.5px] text-slate-300 border-t border-emerald-800/60 pt-1.5">
          <span>Avoided: <b className="text-emerald-400">{avoidedHrs}</b></span>
          <span>AHI: <b className="text-cyan-400">{ahiPct}</b></span>
        </div>
      </div>

    </div>
  );
};

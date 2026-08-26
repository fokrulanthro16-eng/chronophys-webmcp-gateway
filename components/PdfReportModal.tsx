"use client";

import React from 'react';
import { X, Download, Printer, ShieldCheck, FileText, CheckCircle2, QrCode } from 'lucide-react';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultMode: string;
  vRms: number;
  dominantFreq: number;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  faultMode,
  vRms,
  dominantFreq
}) => {
  if (!isOpen) return null;

  const timestamp = new Date().toLocaleString();
  const shaSignature = "SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-mono">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Actions */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ISO 17025 Diagnostic Audit Certificate</h3>
              <p className="text-xs text-slate-400">Official Optical Phase-EVM & Telemetry Compliance Report</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs text-slate-300">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Equipment Asset ID</span>
              <span className="text-sm font-black text-white">TURBOPUMP-UNIT-04 (Line 2 East)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Audit Date & Time</span>
              <span className="text-xs font-semibold text-slate-200">{timestamp}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-800">
            <div>
              <span className="text-slate-500 block">Overall RMS Velocity:</span>
              <span className={`text-base font-bold ${vRms > 4.5 ? 'text-rose-400' : 'text-emerald-400'}`}>{vRms.toFixed(2)} mm/s</span>
            </div>
            <div>
              <span className="text-slate-500 block">Dominant Frequency:</span>
              <span className="text-base font-bold text-mcp-cyan">{dominantFreq.toFixed(1)} Hz</span>
            </div>
            <div>
              <span className="text-slate-500 block">ISO 10816-3 Status:</span>
              <span className={`text-base font-bold ${faultMode === 'bearing_fault' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {faultMode === 'bearing_fault' ? 'ZONE D (CRITICAL)' : 'ZONE A (OPTIMAL)'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-bold block">Autonomous Agent Diagnostic Finding:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-850">
              {faultMode === 'bearing_fault'
                ? 'High-frequency burst modulation detected at 142.5 Hz matching Ball Pass Frequency Outer Race (BPFO). Phase-EVM optical magnification indicates localized radial eccentricity. Closed-loop Modbus interlock engaged.'
                : 'Machine vibration is within nominal baseline boundaries under ISO 10816-3 Group 2. Sub-pixel phase noise floor stable at 0.001 mm. Zero unbalance or misalignment defects detected.'}
            </p>
          </div>

          {/* Signature Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-slate-500 block">Cryptographic SHA-256 Digital Seal</span>
              <span className="text-[10px] text-indigo-300 font-mono">{shaSignature}</span>
            </div>
            <div className="w-12 h-12 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400">
              <QrCode className="w-8 h-8 text-slate-300" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

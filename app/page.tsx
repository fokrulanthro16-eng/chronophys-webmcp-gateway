"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWebMCP } from '@/components/WebMCPProvider';
import { CATALOG_DATA } from '@/lib/mock-data';
import { CatalogItem, CategoryType, AutofillPayload, WebMCPActionEventDetail } from '@/lib/types';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

import { Navbar } from '@/components/Navbar';
import { DualVisionCanvas } from '@/components/DualVisionCanvas';
import { ExecutiveMetricsSuite } from '@/components/ExecutiveMetricsSuite';
import { LiveTelemetryPanel } from '@/components/LiveTelemetryPanel';
import { Ods3dWireframe } from '@/components/Ods3dWireframe';
import { HistoricalTrendPanel } from '@/components/HistoricalTrendPanel';
import { CatalogGrid } from '@/components/CatalogGrid';
import { BookingForm } from '@/components/BookingForm';
import { AgentLiveTerminal } from '@/components/AgentLiveTerminal';
import { AgentInspector } from '@/components/AgentInspector';
import { VoiceAgentOverlay } from '@/components/VoiceAgentOverlay';
import { EnterprisePricingModal } from '@/components/EnterprisePricingModal';
import { AiSpecialistModal } from '@/components/AiSpecialistModal';
import { PdfReportModal } from '@/components/PdfReportModal';

import { 
  Lock, 
  Flame, 
  Activity, 
  Cpu, 
  Download, 
  FileCheck, 
  Zap, 
  Sparkles, 
  Layers, 
  Sliders, 
  Radio, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';

export default function HomePage() {
  const { grandmaMode } = useWebMCP();

  // State management
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>('prod-001');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState<number>(0);
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [alpha, setAlpha] = useState<number>(50);
  const [lowHz, setLowHz] = useState<number>(1.0);
  const [highHz, setHighHz] = useState<number>(6.0);
  const [shaftRpm, setShaftRpm] = useState<number>(1800);
  const [userRole, setUserRole] = useState<'operator' | 'analyst' | 'manager'>('analyst');
  const [lastAutofillSource, setLastAutofillSource] = useState<string | null>(null);
  const [activeAuditTicket, setActiveAuditTicket] = useState<{ id: string; hash: string; analyst: string } | null>(null);

  // Dynamic Telemetry State
  const [faultMode, setFaultMode] = useState<'normal' | 'bearing_fault' | 'unbalance' | 'misalignment'>('normal');
  const [vRms, setVRms] = useState<number>(0.42);
  const [dominantFreq, setDominantFreq] = useState<number>(30.0);

  const [formData, setFormData] = useState<AutofillPayload>({
    customerName: '',
    email: '',
    company: '',
    serviceCategory: 'all',
    urgencyLevel: 'standard',
    notes: '',
    itemId: 'prod-001'
  });

  // Filter Catalog Data
  const filteredItems = useMemo(() => {
    return CATALOG_DATA.filter((item: CatalogItem) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (inStockOnly && !item.inStock) {
        return false;
      }
      if (keyword.trim() !== '') {
        const q = keyword.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesFeature = item.features.some(f => f.toLowerCase().includes(q));
        const matchesSpec = Object.values(item.specs).some(v => v?.toLowerCase().includes(q));
        return matchesName || matchesDesc || matchesFeature || matchesSpec;
      }
      return true;
    });
  }, [keyword, selectedCategory, inStockOnly]);

  const selectedItem = useMemo(() => {
    return CATALOG_DATA.find(i => i.id === selectedItemId) || null;
  }, [selectedItemId]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopLiveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (err) {}
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSecondsLeft(0);
  };

  const handleTriggerRecordDemo = async () => {
    if (isRecording) {
      stopLiveRecording();
      return;
    }

    try {
      recordedChunksRef.current = [];
      let stream: MediaStream | null = null;

      // 1. Attempt to capture from live user webcam
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            },
            audio: false
          });
        } catch (camErr) {
          console.warn('High-res webcam access error, falling back to basic video constraint:', camErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (fallbackErr) {
            console.warn('Standard getUserMedia failed:', fallbackErr);
          }
        }
      }

      // 2. Headless/canvas stream fallback if webcam hardware is in use
      if (!stream) {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 640;
        dummyCanvas.height = 480;
        const ctx = dummyCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#06090e';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#06b6d4';
          ctx.font = '20px monospace';
          ctx.fillText('ChronoPhys Live Optical Telemetry Feed', 40, 240);
        }
        stream = (dummyCanvas as any).captureStream ? (dummyCanvas as any).captureStream(30) : null;
      }

      if (!stream) {
        alert('Could not access live camera stream for recording.');
        return;
      }

      mediaStreamRef.current = stream;

      // Supported MIME type determination
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      let selectedMimeType = 'video/webm';
      for (const mime of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
          a.download = `ChronoPhys_Live_Audit_Demo_${Date.now()}.${extension}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 500);
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start(500);
      setIsRecording(true);
      setRecordingSecondsLeft(30);

      // Notify Python backend logging asynchronously if running
      fetch('http://localhost:8000/api/record_demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 30 })
      }).catch(() => {});

    } catch (e) {
      console.error('Failed to initialize MediaRecorder:', e);
      setIsRecording(false);
      setRecordingSecondsLeft(0);
    }
  };

  // 30-Second Countdown Ticker & Automatic Finish
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          stopLiveRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Clean up media streams on component unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleOpenPdfReport = async () => {
    setIsPdfModalOpen(true);
    // Instant browser download for certified ISO 17025 PDF
    try {
      const response = await fetch('http://localhost:8000/api/generate_pdf');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chronophys_iso17025_audit_report.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        window.open('http://localhost:8000/api/generate_pdf', '_blank');
      }
    } catch (err) {
      window.open('http://localhost:8000/api/generate_pdf', '_blank');
    }
  };

  // Poll real Python backend telemetry every 200ms
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/telemetry');
        if (res.ok) {
          const data = await res.json();
          if (data && data.fft && isMounted) {
            const rms = data.fft.vibration_velocity_rms_mms ?? 0.42;
            const freq = data.fft.dominant_frequency_hz ?? 30.0;
            const rpm = data.config?.nominal_rpm ?? 1800;
            const iso = data.iso?.iso_zone ?? (rms > 4.5 ? 'ZONE_D' : 'ZONE_A');

            setVRms(rms);
            setDominantFreq(freq);
            setShaftRpm(rpm);

            if (iso === 'ZONE_D' || rms > 4.5) {
              setFaultMode('bearing_fault');
            } else if (iso === 'ZONE_C' || rms > 2.5) {
              setFaultMode('unbalance');
            } else {
              setFaultMode('normal');
            }
          }
        }
      } catch (err) {
        // Fallback to internal state if backend is offline
      }
    }, 200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Bridge Custom Browser Events ('webmcp-action') to React UI State & Telemetry
  useEffect(() => {
    const handleWebMCPAction = (event: Event) => {
      const customEvt = event as CustomEvent<WebMCPActionEventDetail>;
      const { actionType, payload, source } = customEvt.detail || {};

      switch (actionType) {
        case 'FILTER_CATALOG': {
          if (payload.keyword !== undefined) setKeyword(payload.keyword);
          if (payload.category !== undefined) setSelectedCategory(payload.category);
          if (payload.inStockOnly !== undefined) setInStockOnly(payload.inStockOnly);
          break;
        }

        case 'SELECT_ITEM': {
          if (payload.itemId) {
            setSelectedItemId(payload.itemId);
            const found = CATALOG_DATA.find(i => i.id === payload.itemId);
            if (found) {
              setFormData(prev => ({ ...prev, itemId: found.id, serviceCategory: found.category }));
            }
          }
          break;
        }

        case 'AUTOFILL_FORM': {
          setFormData(prev => ({
            ...prev,
            ...payload,
          }));
          if (payload.itemId) {
            setSelectedItemId(payload.itemId);
          }
          setLastAutofillSource(source || 'WebMCP Agent');

          // Dynamically modulate telemetry if bearing fault or trip notes injected
          if (payload.urgencyLevel === 'emergency' || (payload.notes && payload.notes.includes('bearing'))) {
            setFaultMode('bearing_fault');
            setVRms(7.85);
            setDominantFreq(142.5);
          } else {
            setFaultMode('normal');
            setVRms(0.42);
            setDominantFreq(30.0);
          }
          break;
        }

        case 'TRIGGER_EMERGENCY_THROTTLE': {
          const target = payload.targetRpm || 300;
          setShaftRpm(target);
          setVRms(0.68);
          setDominantFreq(5.0);
          setFaultMode('normal');
          setFormData(prev => ({
            ...prev,
            urgencyLevel: 'standard',
            notes: `[AUTONOMOUS CLOSED-LOOP ACTION]: Modbus commanded VFD speed drop from 1800 RPM to ${target} RPM. Safe glide engaged.`
          }));
          setLastAutofillSource('Closed-Loop Modbus Agent');
          break;
        }

        case 'GENERATE_MAINTENANCE_AUDIT': {
          const ticket = {
            id: payload.equipmentId || 'TURBOPUMP-04',
            hash: payload.auditHash || `SHA256:${Date.now().toString(16)}`,
            analyst: payload.analyst || 'ISO 18436 Cat-IV Agent'
          };
          setActiveAuditTicket(ticket);
          setTimeout(() => setActiveAuditTicket(null), 8000);
          break;
        }

        case 'RECORD_DEMO': {
          handleTriggerRecordDemo();
          break;
        }

        case 'GENERATE_PDF_REPORT': {
          handleOpenPdfReport();
          break;
        }

        case 'TOGGLE_AI_SPECIALIST': {
          setIsAiModalOpen(payload.open !== false);
          break;
        }

        case 'AUTO_LOCK_COMPONENTS': {
          setAutoLockEnabled(payload.enableTracking !== false);
          break;
        }

        case 'SET_EVM_PARAMETERS': {
          if (payload.alpha) setAlpha(Number(payload.alpha));
          if (payload.lowHz) setLowHz(Number(payload.lowHz));
          if (payload.highHz) setHighHz(Number(payload.highHz));
          if (payload.shaftRpm) setShaftRpm(Number(payload.shaftRpm));
          break;
        }

        case 'CLEAR_FORM': {
          setFormData({
            customerName: '',
            email: '',
            company: '',
            serviceCategory: 'all',
            urgencyLevel: 'standard',
            notes: '',
            itemId: 'prod-001'
          });
          setLastAutofillSource(null);
          break;
        }

        case 'RESET_STATE': {
          setKeyword('');
          setSelectedCategory('all');
          setInStockOnly(false);
          setSelectedItemId('prod-001');
          setFaultMode('normal');
          setVRms(0.42);
          setDominantFreq(30.0);
          setShaftRpm(1800);
          setAlpha(50);
          setAutoLockEnabled(true);
          setFormData({
            customerName: '',
            email: '',
            company: '',
            serviceCategory: 'all',
            urgencyLevel: 'standard',
            notes: '',
            itemId: 'prod-001'
          });
          setLastAutofillSource(null);
          setActiveAuditTicket(null);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('webmcp-action', handleWebMCPAction);
    return () => window.removeEventListener('webmcp-action', handleWebMCPAction);
  }, []);

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItemId(item.id === selectedItemId ? null : item.id);
    setFormData(prev => ({
      ...prev,
      itemId: item.id,
      serviceCategory: item.category,
    }));
  };

  const handleFormSubmit = (data: AutofillPayload) => {
    console.log('[RFQ Submitted]:', data);
  };

  const handleFormClear = () => {
    setFormData({
      customerName: '',
      email: '',
      company: '',
      serviceCategory: 'all',
      urgencyLevel: 'standard',
      notes: '',
      itemId: 'prod-001'
    });
    setLastAutofillSource(null);
  };

  return (
    <div className="w-full min-h-screen px-6 py-4 bg-[#06090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white space-y-4">
      
      {/* Top Header Navigation */}
      <Navbar 
        onOpenInspector={() => setIsInspectorOpen(!isInspectorOpen)} 
        isInspectorOpen={isInspectorOpen}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onRecordDemo={handleTriggerRecordDemo}
        onOpenAiSpecialist={() => setIsAiModalOpen(true)}
        onOpenPdfReport={handleOpenPdfReport}
        userRole={userRole}
        onRoleChange={setUserRole}
        recordingSecondsLeft={recordingSecondsLeft}
      />

      {/* Audit Certificate Ready Banner */}
      {activeAuditTicket && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-400 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center justify-between font-mono text-xs animate-slideDown">
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="font-bold text-white">ISO 17025 SHA-256 AUDIT CERTIFICATE GENERATED</span>
              <div className="text-[10px] text-slate-300">
                Asset: <b className="text-cyan-300">{activeAuditTicket.id}</b> • Signature: <b className="text-emerald-300">{activeAuditTicket.hash}</b> • Signed by: {activeAuditTicket.analyst}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center space-x-1.5 transition shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Open PDF Audit</span>
          </button>
        </div>
      )}

      {/* Control Bar & Live Protocol HUD */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900/70 border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow text-xs font-mono gap-3">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-emerald-400">
            <input 
              type="checkbox" 
              checked={autoLockEnabled} 
              onChange={() => setAutoLockEnabled(!autoLockEnabled)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 cursor-pointer"
            />
            <span>Auto-Lock Components</span>
          </label>
          <span className="text-slate-700">|</span>
          <span className="text-cyan-300 font-bold">Phase-Based EVM (200x)</span>
          <span className="text-slate-700">|</span>
          <span className="text-amber-300 font-bold">AR Stress Heatmap</span>
        </div>

        {/* Protocol, Coherence, ArUco & Smart Relay Pill HUD */}
        <div className="flex items-center space-x-2 text-[11px] font-mono bg-slate-950/90 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-amber-300 font-semibold">ArUco: AUTO</span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400">Anchor: STAB</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300 font-bold">γ²: 0.98</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Modbus:5020</span>
          <span className="text-slate-600">|</span>
          <span className={faultMode === 'bearing_fault' ? 'text-rose-400 font-black animate-pulse' : 'text-emerald-400 font-bold'}>
            {faultMode === 'bearing_fault' ? 'Relay: SAFE GLIDE' : 'Relay: ARMED'}
          </span>
        </div>
      </div>

      {/* 1. Top Section: Dual Optical Stream (8 cols) & Live Agent Terminal (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Dual Video Stream with Interactive Parameter Sliders (8 cols) */}
        <div className="lg:col-span-8">
          <DualVisionCanvas 
            faultMode={faultMode}
            vRms={vRms}
            dominantFreq={dominantFreq}
            alpha={alpha}
            onAlphaChange={setAlpha}
            autoLockEnabled={autoLockEnabled}
            onToggleAutoLock={() => setAutoLockEnabled(!autoLockEnabled)}
            isRecording={isRecording}
            userRole={userRole}
            lowHz={lowHz}
            highHz={highHz}
            onBandpassChange={(l, h) => { setLowHz(l); setHighHz(h); }}
            nominalRpm={shaftRpm}
            onRpmChange={setShaftRpm}
          />
        </div>

        {/* Cyberpunk Streaming JSON-RPC Agent Terminal (4 cols) */}
        <div className="lg:col-span-4">
          <AgentLiveTerminal />
        </div>

      </div>

      {/* 2. Middle Section: 5 Executive Metric Cards */}
      <ExecutiveMetricsSuite 
        faultMode={faultMode}
        vRms={vRms}
        dominantFreq={dominantFreq}
        shaftRpm={shaftRpm}
        userRole={userRole}
      />

      {/* 3. Live Reactive Telemetry Grid: 3D ODS Twin, PSD Spectrum & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* 3D ODS Digital Twin Wireframe */}
        <Ods3dWireframe
          faultMode={faultMode}
          vRms={vRms}
          shaftRpm={shaftRpm}
        />

        {/* 2D FFT Modal Power Spectrum */}
        <LiveTelemetryPanel
          faultMode={faultMode}
          vRms={vRms}
          dominantFreq={dominantFreq}
          shaftRpm={shaftRpm}
        />

        {/* 7-Day Historical Vibration Trend */}
        <HistoricalTrendPanel
          faultMode={faultMode}
          vRms={vRms}
        />

      </div>

      {/* 4. Bottom Enterprise Automation Section: Equipment Catalog & RFQ Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Equipment Catalog Section (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1 font-mono">
            <h3 className="text-sm font-bold text-slate-200">Industrial Sensor & Digital Twin Catalog</h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
              {filteredItems.length} Available
            </span>
          </div>

          <CatalogGrid
            items={filteredItems}
            keyword={keyword}
            onKeywordChange={setKeyword}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            inStockOnly={inStockOnly}
            onToggleInStock={setInStockOnly}
          />
        </div>

        {/* Enterprise RFQ Booking Form (5 cols) */}
        <div className="lg:col-span-5">
          <BookingForm
            selectedItem={selectedItem}
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleFormSubmit}
            onClear={handleFormClear}
            lastAutofillSource={lastAutofillSource}
          />
        </div>

      </div>

      {/* Slide-over Agent Activity Inspector */}
      <AgentInspector 
        isOpen={isInspectorOpen} 
        onClose={() => setIsInspectorOpen(false)} 
      />

      {/* Hands-Free Voice Agent Trigger Overlay */}
      <VoiceAgentOverlay
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />

      {/* Enterprise Commercial Pricing Modal */}
      <EnterprisePricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      {/* Gemini AI Vibration Specialist Modal */}
      <AiSpecialistModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        faultMode={faultMode}
        vRms={vRms}
        dominantFreq={dominantFreq}
      />

      {/* ISO 17025 PDF Compliance Report Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        faultMode={faultMode}
        vRms={vRms}
        dominantFreq={dominantFreq}
      />

    </div>
  );
}

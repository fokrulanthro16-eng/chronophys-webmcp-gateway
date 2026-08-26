"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { DualVisionCanvas } from '@/components/DualVisionCanvas';
import { LiveTelemetryPanel } from '@/components/LiveTelemetryPanel';
import { Ods3dWireframe } from '@/components/Ods3dWireframe';
import { AgentLiveTerminal } from '@/components/AgentLiveTerminal';
import { CatalogGrid } from '@/components/CatalogGrid';
import { BookingForm } from '@/components/BookingForm';
import { AgentInspector } from '@/components/AgentInspector';
import { RoiCostCard } from '@/components/RoiCostCard';
import { VoiceAgentOverlay } from '@/components/VoiceAgentOverlay';
import { EnterprisePricingModal } from '@/components/EnterprisePricingModal';
import { AiSpecialistModal } from '@/components/AiSpecialistModal';
import { PdfReportModal } from '@/components/PdfReportModal';
import { useWebMCP } from '@/components/WebMCPProvider';
import { CATALOG_DATA } from '@/lib/mock-data';
import { 
  CatalogItem, 
  CategoryType, 
  AutofillPayload, 
  WebMCPActionEventDetail 
} from '@/lib/types';
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Layers, 
  Radio, 
  Sliders,
  Activity,
  ShieldAlert,
  Download,
  FileCheck,
  Video
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
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(true);
  const [alpha, setAlpha] = useState<number>(45);
  const [lastAutofillSource, setLastAutofillSource] = useState<string | null>(null);
  const [activeAuditTicket, setActiveAuditTicket] = useState<{ id: string; hash: string; analyst: string } | null>(null);

  // Dynamic Telemetry State
  const [faultMode, setFaultMode] = useState<'normal' | 'bearing_fault' | 'unbalance' | 'misalignment'>('normal');
  const [vRms, setVRms] = useState<number>(0.42);
  const [dominantFreq, setDominantFreq] = useState<number>(30.0);
  const [shaftRpm, setShaftRpm] = useState<number>(1800);

  const [formData, setFormData] = useState<AutofillPayload>({
    customerName: '',
    email: '',
    company: '',
    serviceCategory: 'all',
    urgencyLevel: 'standard',
    notes: '',
    itemId: 'prod-001'
  });

  // Filter items based on active state
  const filteredItems = useMemo(() => {
    return CATALOG_DATA.filter((item) => {
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

  const handleTriggerRecordDemo = async () => {
    setIsRecording(true);
    try {
      await fetch('http://localhost:8000/api/record_demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 30 })
      });
    } catch (e) {
      console.warn('Backend recording triggered in autonomous fallback mode');
    }
    setTimeout(() => setIsRecording(false), 30000);
  };

  const handleOpenPdfReport = () => {
    window.open('http://localhost:8000/api/generate_pdf', '_blank');
    setIsPdfModalOpen(true);
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
          setIsRecording(true);
          const dur = (payload.duration || 30) * 1000;
          setTimeout(() => setIsRecording(false), dur);
          break;
        }

        case 'GENERATE_PDF_REPORT': {
          setIsPdfModalOpen(true);
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
          if (payload.alpha !== undefined) setAlpha(payload.alpha);
          if (payload.shaftRpm !== undefined) setShaftRpm(payload.shaftRpm);
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
          setAlpha(45);
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
    <div className="w-full min-h-screen bg-[#080b11] text-slate-100 flex flex-col selection:bg-mcp-purple selection:text-white">
      
      {/* Top Header Navbar */}
      <Navbar 
        onOpenInspector={() => setIsInspectorOpen(!isInspectorOpen)} 
        isInspectorOpen={isInspectorOpen}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onRecordDemo={handleTriggerRecordDemo}
        onOpenAiSpecialist={() => setIsAiModalOpen(true)}
        onOpenPdfReport={handleOpenPdfReport}
      />

      {/* Audit Certificate Ready Banner */}
      {activeAuditTicket && (
        <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-400 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center justify-between font-mono text-xs animate-slideDown">
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="font-bold text-white">ISO 17025 SHA-256 AUDIT CERTIFICATE GENERATED</span>
              <div className="text-[10px] text-slate-300">
                Asset: <b className="text-mcp-cyan">{activeAuditTicket.id}</b> • Signature: <b className="text-emerald-300">{activeAuditTicket.hash}</b> • Signed by: {activeAuditTicket.analyst}
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

      {/* Main Full-Width Bento Grid Dashboard */}
      <main className="flex-1 w-full px-3 sm:px-5 py-3 space-y-4">
        
        {/* Top Telemetry & WebMCP Status Ribbon */}
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg font-mono text-xs">
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-slate-100">TELEMETRY RIG:</span>
              <span className="text-emerald-400 font-bold">1800 RPM TURBOPUMP #4</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-slate-400 hidden md:inline">
              ISO Zone: <span className={faultMode === 'bearing_fault' ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'}>
                {faultMode === 'bearing_fault' ? 'ZONE D (CRITICAL)' : 'ZONE A (OPTIMAL)'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">DSP Modes:</span>
            <button
              onClick={() => { setFaultMode('normal'); setVRms(0.42); setDominantFreq(30.0); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                faultMode === 'normal' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-950 text-slate-400'
              }`}
            >
              1X Baseline
            </button>
            <button
              onClick={() => { setFaultMode('unbalance'); setVRms(2.45); setDominantFreq(30.0); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                faultMode === 'unbalance' ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-slate-950 text-slate-400'
              }`}
            >
              1X Unbalance
            </button>
            <button
              onClick={() => { setFaultMode('bearing_fault'); setVRms(7.85); setDominantFreq(142.5); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                faultMode === 'bearing_fault' ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse' : 'bg-slate-950 text-slate-400'
              }`}
            >
              BPFO Fault (Trip)
            </button>
          </div>

        </section>

        {/* 3-Column Enterprise Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Column 1: Dual Vision Optical Rig & Agent Terminal (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <DualVisionCanvas 
              faultMode={faultMode}
              vRms={vRms}
              dominantFreq={dominantFreq}
              alpha={alpha}
              onAlphaChange={setAlpha}
              autoLockEnabled={autoLockEnabled}
              onToggleAutoLock={() => setAutoLockEnabled(!autoLockEnabled)}
              isRecording={isRecording}
            />

            <AgentLiveTerminal />
          </div>

          {/* Column 2: Live FFT Modal Telemetry, 3D ODS & Catalog (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <LiveTelemetryPanel
              faultMode={faultMode}
              vRms={vRms}
              dominantFreq={dominantFreq}
              shaftRpm={shaftRpm}
            />

            <Ods3dWireframe
              faultMode={faultMode}
              vRms={vRms}
              shaftRpm={shaftRpm}
            />

            {/* Equipment Catalog Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-200">Industrial Sensor & Digital Twin Catalog</h3>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
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
          </div>

          {/* Column 3: Enterprise ROI & RFQ Dispatch (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <RoiCostCard 
              faultMode={faultMode}
              vRms={vRms}
            />

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

      </main>

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

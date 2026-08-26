"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { CatalogGrid } from '@/components/CatalogGrid';
import { BookingForm } from '@/components/BookingForm';
import { AgentInspector } from '@/components/AgentInspector';
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
  ArrowUpRight 
} from 'lucide-react';

export default function HomePage() {
  const { grandmaMode } = useWebMCP();

  // State management
  const [keyword, setKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [lastAutofillSource, setLastAutofillSource] = useState<string | null>(null);

  const [formData, setFormData] = useState<AutofillPayload>({
    customerName: '',
    email: '',
    company: '',
    serviceCategory: 'all',
    urgencyLevel: 'standard',
    notes: '',
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

  // Bridge Custom Browser Events ('webmcp-action') to React UI State
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
          });
          setLastAutofillSource(null);
          break;
        }

        case 'RESET_STATE': {
          setKeyword('');
          setSelectedCategory('all');
          setInStockOnly(false);
          setSelectedItemId(null);
          setFormData({
            customerName: '',
            email: '',
            company: '',
            serviceCategory: 'all',
            urgencyLevel: 'standard',
            notes: '',
          });
          setLastAutofillSource(null);
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
    });
    setLastAutofillSource(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      
      {/* Top Navbar */}
      <Navbar 
        onOpenInspector={() => setIsInspectorOpen(!isInspectorOpen)} 
        isInspectorOpen={isInspectorOpen} 
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Hero Banner with WebMCP Architecture Highlights */}
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800/90 p-6 sm:p-7 shadow-2xl ${
          grandmaMode ? 'p-10 border-2 border-amber-400' : ''
        }`}>
          <div className="relative z-10 max-w-4xl space-y-3">
            
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-mcp-purple/20 border border-mcp-purple/40 text-mcp-purple text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The WebMCP Challenge • Production Next.js App Router Implementation</span>
            </div>

            <h2 className={`font-black text-slate-100 tracking-tight ${
              grandmaMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
            }`}>
              WebMCP Agent-Ready Industrial Platform
            </h2>

            <p className={`text-slate-300 leading-relaxed ${
              grandmaMode ? 'text-base font-medium' : 'text-sm'
            }`}>
              Natively integrated with the emerging W3C <code className="text-mcp-cyan bg-slate-950/80 px-1.5 py-0.5 rounded font-mono border border-slate-800">document.modelContext</code> standard. 
              Autonomous browser agents and human plant operators interact with the exact same catalog, telemetry, and custom event bridge in real-time.
            </p>

            {/* Architecture Highlights */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center space-x-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-emerald-300">5 WebMCP Tools Registered</span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center space-x-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>CustomEvent('webmcp-action')</span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center space-x-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Grandma Accessible Mode</span>
              </span>
            </div>
          </div>
        </section>

        {/* Dual Layout: Catalog & RFQ Form */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
          
          {/* Left Column: Interactive Catalog Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-bold text-slate-100">Equipment & Service Catalog</h3>
                <p className="text-xs text-slate-400">Filterable via UI controls or <code className="text-mcp-purple">query_catalog</code> tool</p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                {filteredItems.length} of {CATALOG_DATA.length} Available
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

          {/* Right Column: RFQ Booking Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-bold text-slate-100">Automated Dispatch & RFQ</h3>
                <p className="text-xs text-slate-400">Actionable via UI or <code className="text-emerald-400">execute_action</code> tool</p>
              </div>
            </div>

            <BookingForm
              selectedItem={selectedItem}
              formData={formData}
              onFormChange={setFormData}
              onSubmit={handleFormSubmit}
              onClear={handleFormClear}
              lastAutofillSource={lastAutofillSource}
            />
          </div>
        </section>

      </main>

      {/* Slide-over Agent Activity Inspector */}
      <AgentInspector 
        isOpen={isInspectorOpen} 
        onClose={() => setIsInspectorOpen(false)} 
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>The WebMCP Challenge • Built for W3C <code className="text-slate-400">document.modelContext</code> Standard</span>
          <span>Grandma-Theory Accessible • Next.js App Router • Tailwind CSS</span>
        </div>
      </footer>

    </div>
  );
}

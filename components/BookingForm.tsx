"use client";

import React, { useState, useEffect } from 'react';
import { AutofillPayload, CatalogItem } from '@/lib/types';
import { useWebMCP } from './WebMCPProvider';
import { Send, Sparkles, CheckCircle2, RotateCcw, Building, Mail, User, Clock, FileText } from 'lucide-react';

interface BookingFormProps {
  selectedItem: CatalogItem | null;
  formData: AutofillPayload;
  onFormChange: (data: AutofillPayload) => void;
  onSubmit: (data: AutofillPayload) => void;
  onClear: () => void;
  lastAutofillSource: string | null;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedItem,
  formData,
  onFormChange,
  onSubmit,
  onClear,
  lastAutofillSource,
}) => {
  const { grandmaMode } = useWebMCP();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    onSubmit(formData);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 ${
      grandmaMode ? 'p-8 border-2 border-slate-600' : ''
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className={`font-bold text-slate-100 flex items-center space-x-2 ${
            grandmaMode ? 'text-xl' : 'text-base'
          }`}>
            <span>Enterprise Request for Quote (RFQ)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Form accessible by human operators and browser WebMCP agents
          </p>
        </div>

        {lastAutofillSource && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600 animate-pulse flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Agent Autofilled</span>
          </span>
        )}
      </div>

      {/* Selected Item Callout Banner */}
      {selectedItem && (
        <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-indigo-300 block">Target Equipment / Service</span>
            <span className="text-xs font-bold text-slate-100">{selectedItem.name}</span>
          </div>
          <span className="text-xs font-black text-mcp-cyan">${selectedItem.price.toLocaleString()}</span>
        </div>
      )}

      {/* Form Elements */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className={`text-xs font-semibold text-slate-300 flex items-center space-x-1.5 ${
              grandmaMode ? 'text-sm font-bold' : ''
            }`}>
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={formData.customerName || ''}
              onChange={(e) => onFormChange({ ...formData, customerName: e.target.value })}
              placeholder="e.g. John Matrix"
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple transition ${
                grandmaMode ? 'text-base font-bold py-3 border-2' : ''
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-semibold text-slate-300 flex items-center space-x-1.5 ${
              grandmaMode ? 'text-sm font-bold' : ''
            }`}>
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Corporate Email</span>
            </label>
            <input
              type="email"
              required
              value={formData.email || ''}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
              placeholder="e.g. j.matrix@val-verde.mil"
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple transition ${
                grandmaMode ? 'text-base font-bold py-3 border-2' : ''
              }`}
            />
          </div>
        </div>

        {/* Company & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className={`text-xs font-semibold text-slate-300 flex items-center space-x-1.5 ${
              grandmaMode ? 'text-sm font-bold' : ''
            }`}>
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Company / Plant Facility</span>
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => onFormChange({ ...formData, company: e.target.value })}
              placeholder="e.g. Matrix Energy Turbines"
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple transition ${
                grandmaMode ? 'text-base font-bold py-3 border-2' : ''
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-semibold text-slate-300 flex items-center space-x-1.5 ${
              grandmaMode ? 'text-sm font-bold' : ''
            }`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Urgency Level</span>
            </label>
            <select
              value={formData.urgencyLevel || 'standard'}
              onChange={(e) => onFormChange({ ...formData, urgencyLevel: e.target.value as any })}
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-mcp-purple transition ${
                grandmaMode ? 'text-base font-bold py-3 border-2' : ''
              }`}
            >
              <option value="low">Low (Standard Evaluation)</option>
              <option value="standard">Standard (Next-Day RFQ)</option>
              <option value="emergency">Emergency Trip Alert (Immediate SIL-3 Dispatch)</option>
            </select>
          </div>
        </div>

        {/* Project Notes */}
        <div className="space-y-1">
          <label className={`text-xs font-semibold text-slate-300 flex items-center space-x-1.5 ${
            grandmaMode ? 'text-sm font-bold' : ''
          }`}>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Technical Requirements & Plant Telemetry Notes</span>
          </label>
          <textarea
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
            placeholder="Describe motor shaft RPM, vibration velocity v_RMS, bearing model, or ISO Zone classification..."
            className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple transition ${
              grandmaMode ? 'text-base font-bold py-3 border-2' : ''
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Form</span>
          </button>

          <button
            type="submit"
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-lg ${
              isSubmitted
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-gradient-to-r from-mcp-purple to-indigo-600 hover:from-mcp-purple/90 hover:to-indigo-500 text-white shadow-mcp-purple/20'
            } ${grandmaMode ? 'text-base py-3.5 px-8 font-black' : ''}`}
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>RFQ Submitted Successfully!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit RFQ to Engineering</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

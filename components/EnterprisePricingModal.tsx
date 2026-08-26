"use client";

import React, { useState } from 'react';
import { X, Check, Zap, Shield, Cpu, ArrowRight, Building, Award } from 'lucide-react';
import { dispatchWebMCPAction } from '@/lib/webmcp-tools';

interface EnterprisePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterprisePricingModal: React.FC<EnterprisePricingModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('enterprise');

  if (!isOpen) return null;

  const handleSelectPlan = (plan: string, price: number, name: string) => {
    dispatchWebMCPAction('AUTOFILL_FORM', {
      customerName: 'Enterprise Procurement Desk',
      email: 'procurement@industrial-plant.com',
      company: 'Global Turbomachinery Fleet Ltd.',
      urgencyLevel: 'standard',
      notes: `Deployment Package: ${name} ($${price.toLocaleString()}) with Closed-Loop WebMCP Modbus Interlock.`,
      itemId: plan === 'starter' ? 'prod-001' : (plan === 'fleet' ? 'prod-005' : 'prod-006')
    }, 'human-simulation', 'AUTOFILL_FORM');
    onClose();
  };

  const tiers = [
    {
      id: 'starter',
      name: 'Edge Vision Appliance',
      price: 4950,
      period: 'one-time hardware',
      badge: 'Single Asset',
      description: 'NVIDIA Jetson Orin with Optical Phase-EVM and 60 FPS sub-pixel vibration tracking.',
      features: [
        '1x ChronoPhys Phase-EVM Edge Unit',
        'ISO 10816-3 Dynamic Severity',
        'Local Modbus TCP / MQTT Broker',
        'Sub-pixel 0.001 mm Resolution',
        'Standard WebMCP Tool API'
      ]
    },
    {
      id: 'enterprise',
      name: 'Plant Digital Twin Grid',
      price: 14500,
      period: 'per year / facility',
      badge: 'Most Popular',
      description: 'Full closed-loop autonomous AI agent platform with PINN RUL fatigue twins & multi-camera sync.',
      popular: true,
      features: [
        'Up to 16 Synchronized Optical ROIs',
        'Autonomous Closed-Loop VFD Throttling',
        'PINN Basquin S-N Fatigue Twin',
        'ISO 17025 SHA-256 Audit Sign-offs',
        'Unlimited WebMCP Agent Automations',
        '24/7 Cat-IV Vibration SLA Support'
      ]
    },
    {
      id: 'custom',
      name: 'Critical SIL-3 Turnkey Retrofit',
      price: 35000,
      period: 'turnkey installation',
      badge: 'Mission Critical',
      description: 'Hardware interlock DIN-rail safety relay integration with on-site Cat-IV engineering certification.',
      features: [
        'SIL-3 Certified Hardware Trip Module',
        'On-Premises Dedicated Server Appliance',
        'On-Site Modal Shaker Baseline Testing',
        'Custom SCADA / OPC-UA / DCS Bridges',
        'Signed Engineering Audit Certificate'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 overflow-y-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ChronoPhys Commercial Deployment Tiers
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mcp-purple/20 text-mcp-purple border border-mcp-purple/40 font-bold">
                Enterprise v4.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Closed-Loop Industrial Edge Platforms with W3C WebMCP Standard
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier) => {
            const isPopular = tier.popular;
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.25)]'
                    : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {tier.badge && (
                  <span className={`absolute -top-3 left-6 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                    isPopular ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {tier.badge}
                  </span>
                )}

                <div className="space-y-3 mb-6">
                  <h4 className="font-bold text-lg text-slate-100">{tier.name}</h4>
                  <p className="text-xs text-slate-400">{tier.description}</p>
                  
                  <div className="pt-2">
                    <div className="text-3xl font-black text-white">
                      ${tier.price.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{tier.period}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start space-x-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(tier.id, tier.price, tier.name)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                    isPopular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <span>Select & Dispatch RFQ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Compliance Guarantee Footer */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>ISO 10816-3 & ISO 17025 Certified Telemetry</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-mcp-cyan" />
            <span>Closed-Loop VFD Modbus Interlock (SIL-3 Rated)</span>
          </div>
        </div>

      </div>
    </div>
  );
};

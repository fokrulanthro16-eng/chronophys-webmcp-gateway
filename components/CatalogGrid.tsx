"use client";

import React from 'react';
import { CatalogItem, CategoryType } from '@/lib/types';
import { Search, Check, AlertCircle, Sparkles, SlidersHorizontal, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useWebMCP } from './WebMCPProvider';

interface CatalogGridProps {
  items: CatalogItem[];
  keyword: string;
  onKeywordChange: (val: string) => void;
  selectedCategory: CategoryType;
  onCategoryChange: (cat: CategoryType) => void;
  selectedItemId: string | null;
  onSelectItem: (item: CatalogItem) => void;
  inStockOnly: boolean;
  onToggleInStock: (val: boolean) => void;
}

export const CatalogGrid: React.FC<CatalogGridProps> = ({
  items,
  keyword,
  onKeywordChange,
  selectedCategory,
  onCategoryChange,
  selectedItemId,
  onSelectItem,
  inStockOnly,
  onToggleInStock,
}) => {
  const { grandmaMode } = useWebMCP();

  const categories: { id: CategoryType; label: string }[] = [
    { id: 'all', label: 'All Products & Services' },
    { id: 'ai-edge', label: 'AI Edge Appliances' },
    { id: 'sensors', label: 'Optical & Laser Sensors' },
    { id: 'industrial', label: 'Industrial Failsafe & Twins' },
    { id: 'consulting', label: 'Cat-IV Vibration Audits' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="Search appliances, vibrometers, ISO 10816-3, RUL twins..."
              className={`w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mcp-purple focus:ring-1 focus:ring-mcp-purple transition ${
                grandmaMode ? 'text-base font-bold py-3.5 border-2 border-amber-400' : ''
              }`}
            />
            {keyword && (
              <button
                onClick={() => onKeywordChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* In Stock Checkbox */}
          <label className={`flex items-center space-x-2 cursor-pointer bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 select-none ${
            grandmaMode ? 'text-sm font-bold py-3 px-4' : ''
          }`}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onToggleInStock(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 cursor-pointer"
            />
            <span>In-Stock / Ready</span>
          </label>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-mcp-purple text-white shadow-md shadow-mcp-purple/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                } ${grandmaMode ? 'text-sm py-2.5 px-4 font-bold border-2' : ''}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Grid View */}
      {items.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No matching items found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search keywords or clearing active category filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group relative bg-slate-900/90 border rounded-2xl p-5 shadow-lg cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-mcp-purple bg-gradient-to-b from-slate-900 to-indigo-950/40 ring-2 ring-mcp-purple shadow-mcp-purple/20'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                } ${grandmaMode ? 'p-6 border-2 border-slate-600' : ''}`}
              >
                {/* Top Badge & Rating */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {item.category}
                  </span>

                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{item.badge}</span>
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-start justify-between">
                    <h4 className={`font-bold text-slate-100 group-hover:text-mcp-cyan transition ${
                      grandmaMode ? 'text-lg font-black' : 'text-sm'
                    }`}>
                      {item.name}
                    </h4>
                  </div>
                  <p className={`text-slate-400 line-clamp-2 ${grandmaMode ? 'text-sm' : 'text-xs'}`}>
                    {item.description}
                  </p>
                </div>

                {/* Specs Pill List */}
                <div className="grid grid-cols-2 gap-1.5 mb-4 text-[11px] font-mono text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  {Object.entries(item.specs).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-slate-500 uppercase text-[9px] block">{k}:</span>
                      <span className="font-semibold text-slate-200">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Price, Stock & Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className={`font-black text-slate-100 ${grandmaMode ? 'text-2xl' : 'text-lg'}`}>
                      ${item.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">{item.currency}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {item.inStock ? `● Ships in ${item.leadTimeDays}d` : '● Built to Order'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    } ${grandmaMode ? 'text-sm py-3 px-5' : ''}`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected for RFQ</span>
                      </>
                    ) : (
                      <>
                        <span>Select Item</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Active Agent Selection Glow Ribbon */}
                {isSelected && (
                  <div className="absolute -top-2.5 -right-2.5 bg-mcp-purple text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg border border-indigo-400 flex items-center space-x-1">
                    <Zap className="w-2.5 h-2.5" />
                    <span>Agent Locked</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

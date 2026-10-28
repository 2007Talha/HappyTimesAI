'use client';

/**
 * @fileoverview Smart Vendor Checklist component.
 * Allows filtering by priority, tracking booking status with localStorage persistence,
 * inspecting interview questions to ask vendors, and linking to budget.
 */

import React, { useState, useEffect, useId } from 'react';
import {
  CheckSquare,
  Square,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import type { VendorItem } from '@/schemas/eventSchemas';

interface VendorChecklistProps {
  initialVendors: VendorItem[];
  eventId?: string;
  onVendorsChange?: (vendors: VendorItem[]) => void;
}

export function VendorChecklist({
  initialVendors,
  eventId = 'default-event',
  onVendorsChange,
}: VendorChecklistProps): React.JSX.Element {
  const componentId = useId();
  const [vendors, setVendors] = useState<VendorItem[]>(initialVendors);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'booked' | 'pending'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newCost, setNewCost] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`eventforge_vendors_${eventId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVendors(parsed);
          }
        }
      } catch (err) {
        console.warn('Error reading vendors from localStorage', err);
      }
    }
  }, [eventId]);

  const saveVendors = (newVendors: VendorItem[]) => {
    setVendors(newVendors);
    onVendorsChange?.(newVendors);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`eventforge_vendors_${eventId}`, JSON.stringify(newVendors));
      } catch (err) {
        console.warn('Error saving vendors to localStorage', err);
      }
    }
  };

  const toggleVendorStatus = (id: string) => {
    const updated = vendors.map((v) =>
      v.id === id ? { ...v, isChecked: !v.isChecked } : v
    );
    saveVendors(updated);
  };

  const toggleQuestions = (id: string) => {
    setExpandedVendorId(expandedVendorId === id ? null : id);
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newVendor: VendorItem = {
      id: `custom-vendor-${Date.now()}`,
      name: newName.trim(),
      category: newCategory.trim() || 'General Vendor',
      priority: newPriority,
      isChecked: false,
      estimatedCost: newCost,
      questionsToAsk: [
        'What is your cancellation and refund policy?',
        'Are there any additional setup or overtime fees?',
        'Do you carry liability insurance?',
      ],
      notes: 'Added via custom checklist input',
      dueDate: new Date().toISOString().split('T')[0],
    };

    saveVendors([...vendors, newVendor]);
    setNewName('');
    setNewCategory('');
    setNewCost(0);
    setShowAddForm(false);
  };

  const filteredVendors = vendors.filter((v) => {
    const matchPriority = priorityFilter === 'all' || v.priority === priorityFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'booked' && v.isChecked) ||
      (statusFilter === 'pending' && !v.isChecked);
    return matchPriority && matchStatus;
  });

  const bookedCount = vendors.filter((v) => v.isChecked).length;
  const totalCost = vendors.reduce((acc, v) => acc + (v.estimatedCost || 0), 0);
  const bookedCost = vendors.filter((v) => v.isChecked).reduce((acc, v) => acc + (v.estimatedCost || 0), 0);

  return (
    <section aria-labelledby={`${componentId}-vendor-heading`} className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
            Procurement & Due-Diligence
          </span>
          <h2 id={`${componentId}-vendor-heading`} className="text-2xl font-bold font-editorial text-[#1c192b] mt-1.5 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#6842ed]" aria-hidden="true" />
            Vendor Due-Diligence Checklist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized procurement tracker with pre-loaded interviewer questions & contract checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#6842ed] hover:bg-[#5733dd] text-white transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Add Vendor
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Booked Status</span>
          <span className="text-2xl font-bold font-editorial text-[#1c192b] mt-1 block">
            {bookedCount} of {vendors.length} Finalized
          </span>
          <span className="text-xs text-slate-500">
            {Math.round((bookedCount / (vendors.length || 1)) * 100)}% under contract
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Total</span>
          <span className="text-2xl font-bold font-editorial text-[#1c192b] mt-1 block">
            ${totalCost.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">All vendor targets</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#f0fbf5] border border-[#d8f5e5] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">Committed Outlay</span>
          <span className="text-2xl font-bold font-editorial text-[#127242] mt-1 block">
            ${bookedCost.toLocaleString()}
          </span>
          <span className="text-xs text-[#127242]/80">Confirmed contracts</span>
        </div>
      </div>

      {/* Add Vendor Form Dropdown */}
      {showAddForm && (
        <form onSubmit={handleAddVendor} className="p-5 bg-[#f8f7ff] rounded-2xl border border-[#ece8ff] grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Vendor Name (e.g. Acoustic Duo)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            required
          />
          <input
            type="text"
            placeholder="Category (e.g. Music)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="flex-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <input
              type="number"
              placeholder="Est $"
              value={newCost || ''}
              onChange={(e) => setNewCost(Number(e.target.value))}
              className="w-20 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold bg-[#6842ed] text-white rounded-full hover:bg-[#5733dd] cursor-pointer"
          >
            Add to Checklist
          </button>
        </form>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400">Status:</span>
          {(['all', 'pending', 'booked'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#1c192b] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400">Priority:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => setPriorityFilter(pr)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                priorityFilter === pr
                  ? 'bg-[#6842ed] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {pr.charAt(0).toUpperCase() + pr.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors List */}
      <div className="space-y-3" role="list" aria-label="Vendor checklist">
        {filteredVendors.map((vendor) => {
          const isExpanded = expandedVendorId === vendor.id;
          const priorityStyles =
            vendor.priority === 'high'
              ? 'bg-[#fff0f2] text-[#d93856] border border-[#ffd5dc]'
              : vendor.priority === 'medium'
              ? 'bg-[#fff8ea] text-[#b47818] border border-[#fde8be]'
              : 'bg-slate-100 text-slate-600 border border-slate-200';

          return (
            <article
              key={vendor.id}
              role="listitem"
              className={`rounded-2xl border transition-all ${
                vendor.isChecked
                  ? 'bg-slate-50/70 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left check and title */}
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => toggleVendorStatus(vendor.id)}
                    className="mt-0.5 text-[#6842ed] hover:scale-110 transition-transform cursor-pointer"
                    aria-label={`Mark ${vendor.name} as ${vendor.isChecked ? 'pending' : 'booked'}`}
                  >
                    {vendor.isChecked ? (
                      <CheckSquare className="w-5 h-5 text-[#127242]" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm font-bold ${vendor.isChecked ? 'line-through text-slate-400' : 'text-[#1c192b]'}`}>
                        {vendor.name}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityStyles}`}>
                        {vendor.priority}
                      </span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {vendor.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {vendor.notes || 'Standard agreement check'}
                    </p>
                  </div>
                </div>

                {/* Right cost & interview dropdown */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-mono font-bold text-slate-700">
                    ${vendor.estimatedCost.toLocaleString()}
                  </span>

                  {vendor.questionsToAsk && vendor.questionsToAsk.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleQuestions(vendor.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f1effd] hover:bg-[#e7e3fc] text-[#6842ed] text-xs font-semibold transition-colors cursor-pointer"
                      aria-expanded={isExpanded}
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{vendor.questionsToAsk.length} Interview Qs</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Questions Panel */}
              {isExpanded && vendor.questionsToAsk && (
                <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-[#f8f7ff] rounded-b-2xl">
                  <h4 className="text-xs font-bold text-[#1c192b] mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#6842ed]" aria-hidden="true" />
                    Essential Due-Diligence & Interview Inquiries:
                  </h4>
                  <ul className="space-y-1.5">
                    {vendor.questionsToAsk.map((q, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="text-[#6842ed] font-bold">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

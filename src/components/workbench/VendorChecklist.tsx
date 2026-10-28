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
  Tag,
  DollarSign,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
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

  // New vendor form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newCost, setNewCost] = useState(0);

  // Sync from localStorage if present
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 id={`${componentId}-vendor-heading`} className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Vendor Due-Diligence Checklist
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prioritized procurement tracker with pre-loaded interviewer questions & contract checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Vendor
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Booked Status</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
            {bookedCount} of {vendors.length} Booked
          </span>
          <span className="text-xs text-slate-400">
            {Math.round((bookedCount / (vendors.length || 1)) * 100)}% finalized
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Estimated Total</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
            ${totalCost.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">All vendor targets</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Committed Spend</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ${bookedCost.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Under contract</span>
        </div>
      </div>

      {/* Add Vendor Form Dropdown */}
      {showAddForm && (
        <form onSubmit={handleAddVendor} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Vendor Name (e.g. DJ Soundwave)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            required
          />
          <input
            type="text"
            placeholder="Category (e.g. Entertainment)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
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
              className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            Add to Checklist
          </button>
        </form>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-500">Status:</span>
          {(['all', 'pending', 'booked'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-500">Priority:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => setPriorityFilter(pr)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                priorityFilter === pr
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
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
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              : vendor.priority === 'medium'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

          return (
            <article
              key={vendor.id}
              role="listitem"
              className={`rounded-xl border transition-all ${
                vendor.isChecked
                  ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-75'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left check and title */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleVendorStatus(vendor.id)}
                    className="mt-0.5 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                    aria-label={`Mark ${vendor.name} as ${vendor.isChecked ? 'pending' : 'booked'}`}
                  >
                    {vendor.isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm font-bold ${vendor.isChecked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {vendor.name}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityStyles}`}>
                        {vendor.priority}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {vendor.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {vendor.notes || 'No notes specified'}
                    </p>
                  </div>
                </div>

                {/* Right cost & interview dropdown */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    ${vendor.estimatedCost.toLocaleString()}
                  </span>

                  {vendor.questionsToAsk && vendor.questionsToAsk.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleQuestions(vendor.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 cursor-pointer"
                      aria-expanded={isExpanded}
                      aria-label={`Questions to ask ${vendor.name}`}
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
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-b-xl">
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    Essential Due-Diligence Questions to Ask:
                  </h4>
                  <ul className="space-y-1.5">
                    {vendor.questionsToAsk.map((q, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
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


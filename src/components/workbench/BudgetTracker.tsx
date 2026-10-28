'use client';

/**
 * @fileoverview Interactive Budget Manager component.
 * Allows locking/unlocking categories, adjusting percentages or dollar amounts
 * with penny-accurate rebalancing, tracking actual spend, and detecting over-budget states.
 */

import React, { useState, useId } from 'react';
import {
  DollarSign,
  Lock,
  Unlock,
  AlertTriangle,
  Download,
  CheckCircle2,
  PieChart,
  Plus,
  Coins,
} from 'lucide-react';
import type { BudgetPlan, BudgetCategory } from '@/schemas/eventSchemas';
import {
  rebalanceBudget,
  calculateVariance,
  centsToDollars,
  dollarsToCents,
} from '@/lib/efficiency/budgetCalculator';
import { exportBudgetToCsv, downloadFile } from '@/lib/export/exporters';

interface BudgetTrackerProps {
  initialBudget: BudgetPlan;
  eventName: string;
  onBudgetChange?: (updated: BudgetPlan) => void;
}

export function BudgetTracker({
  initialBudget,
  eventName,
  onBudgetChange,
}: BudgetTrackerProps): React.JSX.Element {
  const componentId = useId();
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan>(initialBudget);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPercent, setNewCatPercent] = useState<number>(5);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const totalCents = dollarsToCents(budgetPlan.totalBudget);

  const internalCategories = budgetPlan.categories.map((c) => ({
    name: c.name,
    estimatedCents: dollarsToCents(c.estimatedAmount),
    actualCents: dollarsToCents(c.actualSpent),
    percentage: c.percentage,
    isLocked: c.isLocked,
  }));

  const varianceData = calculateVariance(internalCategories);
  const totalActualDollars = budgetPlan.categories.reduce((acc, c) => acc + c.actualSpent, 0);
  const totalEstimatedDollars = budgetPlan.categories.reduce((acc, c) => acc + c.estimatedAmount, 0);
  const totalVarianceDollars = totalActualDollars - totalEstimatedDollars;
  const isOverallOverBudget = totalActualDollars > budgetPlan.totalBudget;

  const toggleLock = (index: number) => {
    const updatedCategories = budgetPlan.categories.map((cat, i) =>
      i === index ? { ...cat, isLocked: !cat.isLocked } : cat
    );
    const updated = { ...budgetPlan, categories: updatedCategories };
    setBudgetPlan(updated);
    onBudgetChange?.(updated);
  };

  const handlePercentageChange = (index: number, newPercent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, newPercent));
    const rebalanced = rebalanceBudget(internalCategories, totalCents, index, clampedPercent);

    const updatedCategories: BudgetCategory[] = rebalanced.map((rc, i) => ({
      ...budgetPlan.categories[i],
      percentage: rc.percentage,
      estimatedAmount: centsToDollars(rc.estimatedCents),
    }));

    const updated = { ...budgetPlan, categories: updatedCategories };
    setBudgetPlan(updated);
    onBudgetChange?.(updated);
  };

  const handleActualSpendChange = (index: number, actualVal: number) => {
    const safeVal = Math.max(0, isNaN(actualVal) ? 0 : actualVal);
    const updatedCategories = budgetPlan.categories.map((cat, i) =>
      i === index ? { ...cat, actualSpent: safeVal } : cat
    );
    const updated = { ...budgetPlan, categories: updatedCategories };
    setBudgetPlan(updated);
    onBudgetChange?.(updated);
  };

  const handleExportCsv = () => {
    const csv = exportBudgetToCsv(budgetPlan.categories, budgetPlan.totalBudget);
    downloadFile(csv, `${eventName.replace(/[^a-z0-9]/gi, '_')}_budget.csv`, 'text/csv;charset=utf-8;');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newEstimatedAmount = (newCatPercent / 100) * budgetPlan.totalBudget;
    const newCategory: BudgetCategory = {
      name: newCatName.trim(),
      percentage: newCatPercent,
      estimatedAmount: Math.round(newEstimatedAmount),
      actualSpent: 0,
      isLocked: false,
      notes: 'Custom user category',
    };

    const updatedCategories = [...budgetPlan.categories, newCategory];
    const updated = { ...budgetPlan, categories: updatedCategories };
    setBudgetPlan(updated);
    onBudgetChange?.(updated);
    setNewCatName('');
    setShowAddCategory(false);
  };

  return (
    <section aria-labelledby={`${componentId}-budget-heading`} className="space-y-6">
      {/* Header with KPI cards & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
            Penny-Accurate Arithmetic
          </span>
          <h2 id={`${componentId}-budget-heading`} className="text-2xl font-bold font-editorial text-[#1c192b] mt-1.5 flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#6842ed]" aria-hidden="true" />
            Dynamic Budget Allocation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lock priority categories to auto-rebalance remaining splits. Largest-remainder penny accuracy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add Category
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#6842ed] hover:bg-[#5733dd] text-white shadow-sm transition-colors cursor-pointer"
            aria-label="Export budget to CSV"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Screen Reader Live Status Alert */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOverallOverBudget
          ? `Warning: Overall budget exceeded by $${(totalActualDollars - budgetPlan.totalBudget).toLocaleString()}.`
          : `Budget on track. $${(budgetPlan.totalBudget - totalActualDollars).toLocaleString()} remaining.`}
      </div>

      {/* Summary KPI Cards — Styled in clean modern pastel tints */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Cap</span>
          <span className="text-2xl font-bold text-[#1c192b] font-editorial mt-1 block">
            ${budgetPlan.totalBudget.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">Planned Ceiling</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Allocated</span>
          <span className="text-2xl font-bold text-[#6842ed] font-editorial mt-1 block">
            ${Math.round(totalEstimatedDollars).toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">100.00% Categories</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Logged Outlays</span>
          <span className={`text-2xl font-bold font-editorial mt-1 block ${totalActualDollars > budgetPlan.totalBudget ? 'text-[#d93856]' : 'text-[#1c192b]'}`}>
            ${Math.round(totalActualDollars).toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">Actual Outlays</span>
        </div>

        <div className={`p-5 rounded-2xl border ${isOverallOverBudget ? 'bg-[#fff5f6] border-[#fde4e6]' : 'bg-[#f0fbf5] border-[#d8f5e5]'}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">Remaining</span>
          <span className={`text-2xl font-bold font-editorial mt-1 block flex items-center gap-1.5 ${isOverallOverBudget ? 'text-[#d93856]' : 'text-[#147a46]'}`}>
            {isOverallOverBudget ? (
              <>
                <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                -${Math.abs(Math.round(totalActualDollars - budgetPlan.totalBudget)).toLocaleString()}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                ${Math.abs(Math.round(budgetPlan.totalBudget - totalActualDollars)).toLocaleString()}
              </>
            )}
          </span>
          <span className="text-xs opacity-75">{isOverallOverBudget ? 'Over Cap Warning' : 'Safe Margin'}</span>
        </div>
      </div>

      {/* Add Category Form Dropdown */}
      {showAddCategory && (
        <form onSubmit={handleAddCategory} className="p-5 bg-[#f8f7ff] rounded-2xl border border-[#ece8ff] flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 min-w-[180px] px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
            required
          />
          <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <span>Share:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={newCatPercent}
              onChange={(e) => setNewCatPercent(Number(e.target.value))}
              className="w-16 px-2.5 py-2 text-sm rounded-xl border border-slate-200 bg-white"
            />
            <span>%</span>
          </div>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold bg-[#6842ed] text-white rounded-full hover:bg-[#5733dd]"
          >
            Save Category
          </button>
        </form>
      )}

      {/* Category List & Sliders */}
      <div className="space-y-3" role="list" aria-label="Budget categories list">
        {budgetPlan.categories.map((cat, idx) => {
          const variance = cat.actualSpent - cat.estimatedAmount;
          const isCategoryOver = cat.actualSpent > cat.estimatedAmount && cat.actualSpent > 0;
          const inputId = `${componentId}-cat-${idx}`;

          return (
            <div
              key={cat.name}
              role="listitem"
              className={`p-5 rounded-2xl border transition-all ${
                isCategoryOver
                  ? 'border-[#fdd8de] bg-[#fffbfb]'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                {/* Category Name & Lock Button */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleLock(idx)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      cat.isLocked
                        ? 'bg-[#fff8ea] border-[#fde8be] text-[#b47818]'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                    aria-label={cat.isLocked ? `Unlock ${cat.name}` : `Lock ${cat.name}`}
                  >
                    {cat.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c192b] flex items-center gap-2">
                      {cat.name}
                      {cat.isLocked && (
                        <span className="text-[10px] font-bold bg-[#fff8ea] text-[#b47818] border border-[#fde8be] px-2 py-0.5 rounded-full">
                          LOCKED
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-slate-500">
                      Target: ${Math.round(cat.estimatedAmount).toLocaleString()} ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Actual Spend Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`${inputId}-actual`} className="text-xs text-slate-500 font-medium">
                      Spent:
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        id={`${inputId}-actual`}
                        type="number"
                        min="0"
                        value={cat.actualSpent || ''}
                        onChange={(e) => handleActualSpendChange(idx, Number(e.target.value))}
                        placeholder="0"
                        className="w-24 pl-5 pr-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-[#fafbfe] text-[#1c192b] focus:bg-white focus:border-[#6842ed]"
                        aria-label={`Actual spend for ${cat.name}`}
                      />
                    </div>
                  </div>

                  {/* Variance Badge */}
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                      cat.actualSpent === 0
                        ? 'bg-slate-100 text-slate-500'
                        : isCategoryOver
                        ? 'bg-[#fff0f2] text-[#d93856] border border-[#ffd5dc]'
                        : 'bg-[#f0fbf5] text-[#127242] border border-[#d8f5e5]'
                    }`}
                  >
                    {cat.actualSpent === 0
                      ? 'No spend'
                      : isCategoryOver
                      ? `+$${Math.round(variance).toLocaleString()} Over`
                      : `-$${Math.abs(Math.round(variance)).toLocaleString()} Under`}
                  </span>
                </div>
              </div>

              {/* Allocation Slider */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Rebalance Allocation</span>
                  <span className="font-mono text-[#6842ed] font-semibold">{cat.percentage.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={cat.isLocked}
                  value={cat.percentage}
                  onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value))}
                  className="w-full cursor-pointer disabled:cursor-not-allowed h-2 bg-slate-100 rounded-lg appearance-none"
                  aria-label={`Percentage slider for ${cat.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

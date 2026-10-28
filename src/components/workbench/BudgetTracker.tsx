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

  // Convert categories to the internal BudgetCategory shape for calculations
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 id={`${componentId}-budget-heading`} className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Dynamic Budget Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Penny-accurate allocations, slider lock-rebalancing, and variance audit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Category
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
            aria-label="Export budget to CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Cap</span>
          <span className="text-xl font-black text-slate-900 dark:text-slate-50 mt-1 block">
            ${budgetPlan.totalBudget.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Baseline Budget</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Allocated</span>
          <span className="text-xl font-black text-slate-900 dark:text-slate-50 mt-1 block">
            ${Math.round(totalEstimatedDollars).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Sum of Categories</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Actual Spent</span>
          <span className={`text-xl font-black mt-1 block ${totalActualDollars > budgetPlan.totalBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'}`}>
            ${Math.round(totalActualDollars).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">Logged Outlays</span>
        </div>

        <div className={`p-4 rounded-xl border ${isOverallOverBudget ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'}`}>
          <span className="text-xs font-semibold uppercase tracking-wider block text-slate-600 dark:text-slate-300">Variance</span>
          <span className={`text-xl font-black mt-1 block flex items-center gap-1.5 ${isOverallOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isOverallOverBudget ? (
              <>
                <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                +${Math.abs(Math.round(totalVarianceDollars)).toLocaleString()}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                ${Math.abs(Math.round(budgetPlan.totalBudget - totalActualDollars)).toLocaleString()} left
              </>
            )}
          </span>
          <span className="text-xs opacity-75">{isOverallOverBudget ? 'Over Cap' : 'Within Budget'}</span>
        </div>
      </div>

      {/* Add Category Form Dropdown */}
      {showAddCategory && (
        <form onSubmit={handleAddCategory} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            required
          />
          <div className="flex items-center gap-1 text-sm font-medium">
            <span>Share:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={newCatPercent}
              onChange={(e) => setNewCatPercent(Number(e.target.value))}
              className="w-16 px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
            <span>%</span>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
              className={`p-4 rounded-xl border transition-all ${
                isCategoryOver
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                {/* Category Name & Lock Button */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleLock(idx)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      cat.isLocked
                        ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300'
                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                    aria-label={cat.isLocked ? `Unlock ${cat.name} category from rebalancing` : `Lock ${cat.name} category`}
                  >
                    {cat.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {cat.name}
                      {cat.isLocked && (
                        <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          LOCKED
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Target: ${Math.round(cat.estimatedAmount).toLocaleString()} ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Actual Spend Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`${inputId}-actual`} className="text-xs text-slate-500 font-medium">
                      Actual:
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
                        className="w-24 pl-5 pr-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        aria-label={`Actual spend for ${cat.name}`}
                      />
                    </div>
                  </div>

                  {/* Variance Badge */}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      cat.actualSpent === 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : isCategoryOver
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
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
                  <span>Allocation Percentage</span>
                  <span className="font-mono">{cat.percentage.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={cat.isLocked}
                  value={cat.percentage}
                  onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
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


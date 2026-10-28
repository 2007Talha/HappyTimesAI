'use client';

/**
 * @fileoverview Dual Timeline component: Pre-Event Countdown Roadmap & Day-Of Run-of-Show.
 * Features milestone completion toggling, iCalendar (.ics) export, printable run-of-show,
 * and category filtering.
 */

import React, { useState, useId } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Download,
  Printer,
  ChevronRight,
  Filter,
  User,
  MapPin,
  Timer,
} from 'lucide-react';
import type { TimelineMilestone, DayOfScheduleItem } from '@/schemas/eventSchemas';
import { exportTimelineToIcs, downloadFile } from '@/lib/export/exporters';

interface TimelineRoadmapProps {
  eventName: string;
  eventDate: string;
  initialMilestones: TimelineMilestone[];
  initialDayOfSchedule: DayOfScheduleItem[];
  onMilestonesChange?: (milestones: TimelineMilestone[]) => void;
}

export function TimelineRoadmap({
  eventName,
  eventDate,
  initialMilestones,
  initialDayOfSchedule,
  onMilestonesChange,
}: TimelineRoadmapProps): React.JSX.Element {
  const componentId = useId();
  const [activeTab, setActiveTab] = useState<'countdown' | 'dayOf'>('countdown');
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(initialMilestones);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const toggleMilestone = (id: string) => {
    const updated = milestones.map((m) =>
      m.id === id ? { ...m, isComplete: !m.isComplete } : m
    );
    setMilestones(updated);
    onMilestonesChange?.(updated);
  };

  const handleExportIcs = () => {
    const icsContent = exportTimelineToIcs(eventName, eventDate, milestones, initialDayOfSchedule);
    downloadFile(icsContent, `${eventName.replace(/[^a-z0-9]/gi, '_')}_schedule.ics`, 'text/calendar;charset=utf-8;');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Extract distinct categories
  const categories = ['all', ...Array.from(new Set(milestones.map((m) => m.category).filter(Boolean)))];

  const filteredMilestones = milestones
    .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
    .sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  const completedCount = milestones.filter((m) => m.isComplete).length;
  const progressPercent = Math.round((completedCount / (milestones.length || 1)) * 100);

  return (
    <section aria-labelledby={`${componentId}-timeline-heading`} className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 id={`${componentId}-timeline-heading`} className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Dual Chronological Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pre-event backward countdown roadmap + Day-of minute-by-minute run-of-show.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
            aria-label="Export schedule to iCalendar .ics"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export .ICS
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
            aria-label="Print schedule"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Print Schedule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2" role="tablist" aria-label="Timeline views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'countdown'}
            aria-controls={`${componentId}-countdown-panel`}
            id={`${componentId}-countdown-tab`}
            onClick={() => setActiveTab('countdown')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'countdown'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pre-Event Roadmap ({completedCount}/{milestones.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dayOf'}
            aria-controls={`${componentId}-dayof-panel`}
            id={`${componentId}-dayof-tab`}
            onClick={() => setActiveTab('dayOf')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'dayOf'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Day-Of Run-of-Show ({initialDayOfSchedule.length} Segments)
          </button>
        </div>

        {activeTab === 'countdown' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Progress: {progressPercent}%</span>
            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Countdown Panel */}
      {activeTab === 'countdown' && (
        <div
          id={`${componentId}-countdown-panel`}
          role="tabpanel"
          aria-labelledby={`${componentId}-countdown-tab`}
          className="space-y-4"
        >
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Filter milestones by category">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" aria-hidden="true" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Milestones List */}
          <ol className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-4 space-y-4 my-2">
            {filteredMilestones.map((m) => (
              <li key={m.id} className="ml-6 group">
                <span
                  className={`absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors cursor-pointer ${
                    m.isComplete
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-600'
                  }`}
                  onClick={() => toggleMilestone(m.id)}
                  aria-hidden="true"
                >
                  {m.isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                </span>

                <article className={`p-4 rounded-xl border transition-all ${
                  m.isComplete
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-sm'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => toggleMilestone(m.id)}
                      className="text-left font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 rounded flex items-center gap-2 cursor-pointer"
                    >
                      <span className={m.isComplete ? 'line-through text-slate-400' : ''}>
                        {m.title}
                      </span>
                    </button>
                    <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {m.daysBeforeEvent > 0 ? `T-${m.daysBeforeEvent} Days (${m.dueDate})` : `Day of Event (${m.dueDate})`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2.5">
                    {m.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <User className="w-3 h-3" aria-hidden="true" />
                      {m.owner || 'Unassigned'}
                    </span>
                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium">
                      {m.category}
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Day-Of Schedule Panel */}
      {activeTab === 'dayOf' && (
        <div
          id={`${componentId}-dayof-panel`}
          role="tabpanel"
          aria-labelledby={`${componentId}-dayof-tab`}
          className="space-y-3 print:space-y-2"
        >
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span><strong>Target Date:</strong> {eventDate}</span>
            <span>All times include safety buffer margins</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {initialDayOfSchedule.map((item, idx) => (
              <article
                key={item.id || idx}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-[85px] py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-center shrink-0">
                    <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 block">
                      {item.time}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      to {item.endTime || 'End'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.activity}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.notes}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {item.location || 'Venue'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {item.owner || 'Lead'}
                      </span>
                    </div>
                  </div>
                </div>

                {item.bufferMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-center shrink-0">
                    <Timer className="w-3 h-3" aria-hidden="true" />
                    +{item.bufferMinutes}m buffer
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


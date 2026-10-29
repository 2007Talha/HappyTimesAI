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
  Filter,
  User,
  MapPin,
  Timer,
} from 'lucide-react';
import type { TimelineMilestone, DayOfScheduleItem } from '@/schemas/eventSchemas';
import { exportTimelineToIcs, downloadFile } from '@/lib/export/exporters';
import { fireConfetti } from '@/lib/confetti';
import { DualTimelinesIcon } from '@/components/brand/PillIcons';

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
    let wasChecked = false;
    const updated = milestones.map((m) => {
      if (m.id === id) {
        if (!m.isComplete) wasChecked = true;
        return { ...m, isComplete: !m.isComplete };
      }
      return m;
    });
    setMilestones(updated);
    onMilestonesChange?.(updated);
    if (wasChecked) {
      fireConfetti(1200);
    }
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

  const categories = ['all', ...Array.from(new Set(milestones.map((m) => m.category).filter(Boolean)))];

  const filteredMilestones = milestones
    .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
    .sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  const completedCount = milestones.filter((m) => m.isComplete).length;
  const progressPercent = Math.round((completedCount / (milestones.length || 1)) * 100);

  return (
    <section aria-labelledby={`${componentId}-timeline-heading`} className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
            Dual Chronological Cadence
          </span>
          <h2 id={`${componentId}-timeline-heading`} className="text-2xl font-bold font-editorial text-[#1c192b] mt-1.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5c3beb]/10 text-[#5c3beb] flex items-center justify-center">
              <DualTimelinesIcon className="w-4 h-4" />
            </div>
            Milestones & Run-of-Show
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Backward countdown from target date + minute-by-minute execution schedule.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#f1effd] hover:bg-[#e6e2fc] text-[#6842ed] border border-[#ded8f9] transition-colors cursor-pointer"
            aria-label="Export schedule to iCalendar .ics"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export .ICS
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            aria-label="Print schedule"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print Schedule
          </button>
        </div>
      </div>

      {/* Modern Floating Pill View Switcher */}
      <div className="flex items-center justify-between gap-3 p-1.5 bg-[#f3f4f8] rounded-2xl">
        <div className="flex gap-1.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'countdown'}
            onClick={() => setActiveTab('countdown')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'countdown'
                ? 'bg-white text-[#6842ed] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pre-Event Roadmap ({completedCount}/{milestones.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dayOf'}
            onClick={() => setActiveTab('dayOf')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dayOf'
                ? 'bg-white text-[#6842ed] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Day-Of Run-of-Show ({initialDayOfSchedule.length} Segments)
          </button>
        </div>

        {activeTab === 'countdown' && (
          <div className="hidden sm:flex items-center gap-2 pr-2">
            <span className="text-xs font-semibold text-slate-500">{progressPercent}% Completed</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#127242] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Countdown Panel */}
      {activeTab === 'countdown' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" aria-hidden="true" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#6842ed] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Milestones List */}
          <ol className="relative border-l-2 border-[#e6e2fc] ml-4 space-y-4 my-2">
            {filteredMilestones.map((m) => (
              <li key={m.id} className="ml-6 group">
                <span
                  className={`absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors cursor-pointer ${
                    m.isComplete
                      ? 'bg-[#127242] border-[#127242] text-white'
                      : 'bg-white border-[#6842ed] text-[#6842ed]'
                  }`}
                  onClick={() => toggleMilestone(m.id)}
                  aria-hidden="true"
                >
                  {m.isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                </span>

                <article className={`p-5 rounded-2xl border transition-all ${
                  m.isComplete
                    ? 'bg-slate-50/70 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <button
                      type="button"
                      onClick={() => toggleMilestone(m.id)}
                      className="text-left font-bold text-sm text-[#1c192b] hover:text-[#6842ed] cursor-pointer"
                    >
                      <span className={m.isComplete ? 'line-through text-slate-400' : ''}>
                        {m.title}
                      </span>
                    </button>
                    <span className="text-xs font-mono font-semibold text-[#6842ed] whitespace-nowrap">
                      {m.daysBeforeEvent > 0 ? `T-${m.daysBeforeEvent} Days (${m.dueDate})` : `Day of Event (${m.dueDate})`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {m.description}
                  </p>

                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <User className="w-3 h-3" aria-hidden="true" />
                      {m.owner || 'Unassigned'}
                    </span>
                    <span className="bg-[#f1effd] text-[#6842ed] px-2.5 py-0.5 rounded-full font-semibold border border-[#ded8f9]">
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
        <div className="space-y-3">
          <div className="p-4 bg-[#fffbf0] rounded-2xl border border-[#faeed0] text-xs text-[#a66a07] flex items-center justify-between">
            <span><strong>Target Date:</strong> {eventDate}</span>
            <span>All segments include buffer margins to absorb delays</span>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {initialDayOfSchedule.map((item, idx) => (
              <article
                key={item.id || idx}
                className="p-5 hover:bg-[#fafbfe] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-[90px] py-2 px-3 rounded-xl bg-[#f1effd] border border-[#e2ddfa] text-center shrink-0">
                    <span className="font-mono text-xs font-black text-[#6842ed] block">
                      {item.time}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      to {item.endTime || 'End'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#1c192b]">
                      {item.activity}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.notes}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {item.location || 'Venue'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="w-3 h-3" />
                        {item.owner || 'Lead'}
                      </span>
                    </div>
                  </div>
                </div>

                {item.bufferMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 self-start sm:self-center shrink-0">
                    <Timer className="w-3 h-3" />
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

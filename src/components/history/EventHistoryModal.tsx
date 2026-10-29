'use client';

/**
 * @fileoverview Event History & Saved Projects Modal for HappyTimes.
 * Provides a slide-over/modal drawer displaying all saved event plans with
 * 1-click loading into the workbench, search filtering, CSV export, and deletion.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Users,
  FolderOpen,
  Trash2,
  Download,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { SavedEventRecord } from '@/lib/storage/eventHistory';
import { exportBudgetToCsv, downloadFile } from '@/lib/export/exporters';
import { HappyTimesIcon } from '@/components/brand/HappyTimesLogo';

interface EventHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEvents: SavedEventRecord[];
  onSelectEvent: (eventRecord: SavedEventRecord) => void;
  onDeleteEvent: (id: string) => void;
  onStartNewEvent: () => void;
}

export function EventHistoryModal({
  isOpen,
  onClose,
  savedEvents,
  onSelectEvent,
  onDeleteEvent,
  onStartNewEvent,
}: EventHistoryModalProps): React.JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, confirmDeleteId, onClose]);

  if (!isOpen) return null;

  const filteredEvents = savedEvents.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.intake.eventName.toLowerCase().includes(query) ||
      item.intake.eventType.toLowerCase().includes(query) ||
      item.intake.eventDate.includes(query) ||
      item.intake.themeKeywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  const getVerticalBadgeStyle = (eventType: string) => {
    switch (eventType) {
      case 'wedding':
        return 'bg-[#f1effd] text-[#6842ed] border-[#ded8f9]';
      case 'birthday':
        return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]';
      case 'community':
        return 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleExportCsv = (record: SavedEventRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const csv = exportBudgetToCsv(
      record.plan.budget.categories,
      record.plan.budget.totalBudget
    );
    const filename = `${record.intake.eventName.replace(/[^a-z0-9]/gi, '_')}_budget.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 sm:px-8 border-b border-slate-100 flex items-center justify-between gap-4 bg-[#fafbfe]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5c3beb] via-[#6d46f5] to-[#8c67fa] flex items-center justify-center text-white shadow-sm shadow-[#5c3beb]/25">
              <HappyTimesIcon className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="history-modal-title"
                className="text-xl font-bold font-editorial text-[#171520]"
              >
                Event History & Saved Projects
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {savedEvents.length} {savedEvents.length === 1 ? 'project' : 'projects'} saved locally in your studio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close saved events modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Action Strip */}
        <div className="p-4 sm:px-8 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event name, vertical, or theme..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-full border border-slate-200 bg-[#f7f8fc] text-[#1c192b] focus:bg-white focus:border-[#5c3beb] focus:outline-none transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartNewEvent();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#f1effd] text-[#6842ed] hover:bg-[#e6e2fc] border border-[#ded8f9] transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Plan New Event
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 sm:px-8 space-y-4">
          {savedEvents.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#f1effd] text-[#6842ed] flex items-center justify-center mx-auto shadow-sm">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-base font-bold text-[#171520] font-editorial">
                  No Saved Events Yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every wedding, birthday, or community fair you plan will automatically appear here with full budget and timeline snapshots.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartNewEvent();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#5c3beb] text-white hover:bg-[#4a2ec4] shadow-md shadow-[#5c3beb]/25 transition-all cursor-pointer"
              >
                Start First Event
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            /* No search results */
            <div className="py-12 text-center text-xs text-slate-500">
              No events found matching &ldquo;{searchQuery}&rdquo;. Try another search term.
            </div>
          ) : (
            /* Event Cards */
            <div className="space-y-3.5">
              {filteredEvents.map((record) => {
                const daysAway = Math.ceil(
                  (new Date(record.intake.eventDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                const isConfirming = confirmDeleteId === record.id;

                return (
                  <div
                    key={record.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-[#fafbfe] hover:bg-white hover:border-slate-300 transition-all shadow-2xs hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Left: Metadata */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getVerticalBadgeStyle(
                            record.intake.eventType
                          )}`}
                        >
                          {record.intake.eventType}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {record.intake.eventDate}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-semibold text-amber-800 bg-[#fffbeb] px-2 py-0.5 rounded-full">
                          {daysAway > 0
                            ? `⏰ ${daysAway} Days Away`
                            : daysAway === 0
                            ? '🎉 Today!'
                            : 'Past Event'}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold font-editorial text-[#171520] truncate">
                        {record.intake.eventName}
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-[#5c3beb]">
                          <DollarSign className="w-3.5 h-3.5 text-[#5c3beb]" />
                          ${record.intake.totalBudget.toLocaleString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {record.intake.guestCount} guests
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 text-[10px]">
                          Updated {new Date(record.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {isConfirming ? (
                        <div className="flex items-center gap-2 animate-in fade-in">
                          <span className="text-xs text-[#d93856] font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEvent(record.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#fff0f2] text-[#d93856] border border-[#ffd5dc] hover:bg-[#ffd5dc] transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleExportCsv(record, e)}
                            className="p-2 rounded-full text-slate-400 hover:text-[#5c3beb] hover:bg-[#f1effd] transition-colors cursor-pointer"
                            title="Export Budget CSV"
                            aria-label={`Export CSV for ${record.intake.eventName}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(record.id)}
                            className="p-2 rounded-full text-slate-400 hover:text-[#d93856] hover:bg-[#fff0f2] transition-colors cursor-pointer"
                            title="Delete Event"
                            aria-label={`Delete ${record.intake.eventName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectEvent(record);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#5c3beb] hover:bg-[#4a2ec4] text-white shadow-sm transition-all cursor-pointer"
                          >
                            Open Plan
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-8 border-t border-slate-100 bg-[#fafbfe] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Automatic local auto-save enabled</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

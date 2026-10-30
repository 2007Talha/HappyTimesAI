'use client';

/**
 * @fileoverview Main Page for HappyTimes — Event Planning Assistant.
 * Designed with a spacious, airy light theme, editorial typography,
 * floating pill navigation, and full WCAG 2.1 AA accessibility.
 */

import React, { useState, useCallback } from 'react';
import {
  RefreshCw,
  Info,
  History,
} from 'lucide-react';
import { SkipToContent, AriaLiveAnnouncer, useAnnouncer } from '@/components/a11y/SkipToContent';
import { EventIntakeForm } from '@/components/forms/EventIntakeForm';
import { BudgetTracker } from '@/components/workbench/BudgetTracker';
import { TimelineRoadmap } from '@/components/workbench/TimelineRoadmap';
import { VendorChecklist } from '@/components/workbench/VendorChecklist';
import { IdeaGallery } from '@/components/workbench/IdeaGallery';
import { TelemetryBar } from '@/components/workbench/TelemetryBar';
import { EventHistoryModal } from '@/components/history/EventHistoryModal';
import { HappyTimesBrand, HappyTimesIcon } from '@/components/brand/HappyTimesLogo';
import {
  BudgetTrackerIcon,
  DualTimelinesIcon,
  VendorChecklistIcon,
  IdeasStudioIcon,
  PartyBurstIcon,
} from '@/components/brand/PillIcons';
import type {
  EventIntake,
  EventPlan,
  Telemetry,
  BudgetPlan,
  VendorItem,
  TimelineMilestone,
} from '@/schemas/eventSchemas';
import {
  getSavedEvents,
  saveEventToHistory,
  deleteSavedEvent,
  type SavedEventRecord,
} from '@/lib/storage/eventHistory';
import { generateDeterministic } from '@/services/llmGateway';
import { fireConfetti } from '@/lib/confetti';

export default function HomePage(): React.JSX.Element {
  const [currentIntake, setCurrentIntake] = useState<EventIntake | null>(null);
  const [currentPlan, setCurrentPlan] = useState<EventPlan | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'timeline' | 'vendors' | 'ideas'>('budget');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEventRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    return getSavedEvents();
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const { message: announceMessage, announce } = useAnnouncer();

  const handleFormSubmit = useCallback(async (intakeData: EventIntake) => {
    setIsLoading(true);
    setErrorMessage(null);
    announce(`Synthesizing tailored event plan for ${intakeData.eventName}...`);

    let finalPlan: EventPlan;
    let finalTelemetry: Telemetry;

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeData),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        finalPlan = data.plan;
        finalTelemetry = data.telemetry;
        announce(`Event plan synthesized successfully! Displaying workbench for ${intakeData.eventName}.`);
      } else {
        const fallbackResult = generateDeterministic(intakeData);
        finalPlan = fallbackResult.plan;
        finalTelemetry = {
          inputSanitized: true,
          piiTokensRedacted: 0,
          promptInjectionBlocked: false,
          cacheHit: false,
          latencyMs: fallbackResult.latencyMs,
          schemaValid: true,
          source: 'deterministic',
        };
        announce(`Generated plan using deterministic smart engine.`);
      }
    } catch (err) {
      console.warn('[HappyTimes] API call failed, falling back to deterministic engine:', err);
      const fallbackResult = generateDeterministic(intakeData);
      finalPlan = fallbackResult.plan;
      finalTelemetry = {
        inputSanitized: true,
        piiTokensRedacted: 0,
        promptInjectionBlocked: false,
        cacheHit: false,
        latencyMs: fallbackResult.latencyMs,
        schemaValid: true,
        source: 'deterministic',
      };
      announce(`Plan generated offline using deterministic smart engine.`);
    } finally {
      setIsLoading(false);
    }

    setCurrentIntake(intakeData);
    setCurrentPlan(finalPlan);
    setTelemetry(finalTelemetry);

    // Persist to browser event history
    saveEventToHistory(intakeData, finalPlan, finalTelemetry);
    setSavedEvents(getSavedEvents());
  }, [announce]);

  const handleSelectSavedEvent = (record: SavedEventRecord) => {
    setCurrentIntake(record.intake);
    setCurrentPlan(record.plan);
    setTelemetry(record.telemetry ?? null);
    announce(`Loaded saved event: ${record.intake.eventName}`);
  };

  const handleDeleteSavedEvent = (id: string) => {
    deleteSavedEvent(id);
    const updated = getSavedEvents();
    setSavedEvents(updated);
    announce('Event removed from saved history.');
  };

  const handleBudgetChange = (updatedBudget: BudgetPlan) => {
    if (!currentPlan || !currentIntake) return;
    const updatedPlan: EventPlan = { ...currentPlan, budget: updatedBudget };
    setCurrentPlan(updatedPlan);
    saveEventToHistory(currentIntake, updatedPlan, telemetry);
    setSavedEvents(getSavedEvents());
  };

  const handleVendorsChange = (updatedVendors: VendorItem[]) => {
    if (!currentPlan || !currentIntake) return;
    const updatedPlan: EventPlan = { ...currentPlan, vendors: updatedVendors };
    setCurrentPlan(updatedPlan);
    saveEventToHistory(currentIntake, updatedPlan, telemetry);
    setSavedEvents(getSavedEvents());
  };

  const handleMilestonesChange = (updatedMilestones: TimelineMilestone[]) => {
    if (!currentPlan || !currentIntake) return;
    const updatedPlan: EventPlan = { ...currentPlan, preEventTimeline: updatedMilestones };
    setCurrentPlan(updatedPlan);
    saveEventToHistory(currentIntake, updatedPlan, telemetry);
    setSavedEvents(getSavedEvents());
  };

  const handleReset = () => {
    setCurrentPlan(null);
    setCurrentIntake(null);
    setTelemetry(null);
    announce('Resetting event plan to intake form.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fc] text-[#1c192b]">
      <SkipToContent />
      <AriaLiveAnnouncer message={announceMessage} />

      {/* Spacious, Elegant Top Navigation Bar — Styled after Journal AI reference */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand — Clean, authentic product icon mark */}
          <HappyTimesBrand size="md" />

          {/* Center: Floating Pill Navigation Dock (When plan is generated) */}
          {currentPlan ? (
            <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-[#f1f3f9] rounded-full border border-slate-200/80 shadow-2xs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'budget'}
                onClick={() => setActiveTab('budget')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'budget'
                    ? 'bg-[#5c3beb] text-white shadow-md shadow-[#5c3beb]/30 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <BudgetTrackerIcon className="w-4 h-4" />
                Budget Tracker
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timeline'}
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-[#5c3beb] text-white shadow-md shadow-[#5c3beb]/30 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <DualTimelinesIcon className="w-4 h-4" />
                Dual Timelines
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'vendors'}
                onClick={() => setActiveTab('vendors')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'vendors'
                    ? 'bg-[#5c3beb] text-white shadow-md shadow-[#5c3beb]/30 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <VendorChecklistIcon className="w-4 h-4" />
                Vendor Checklist
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ideas'}
                onClick={() => setActiveTab('ideas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ideas'
                    ? 'bg-[#5c3beb] text-white shadow-md shadow-[#5c3beb]/30 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <IdeasStudioIcon className="w-4 h-4" />
                Ideas Studio
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                Domain Coverage:
              </span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                Weddings
              </span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                Birthdays
              </span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                Community Fairs
              </span>
            </div>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
              title="View saved event history"
            >
              <History className="w-3.5 h-3.5 text-[#5c3beb]" />
              <span className="hidden sm:inline">Saved Events</span>
              <span className="inline sm:hidden">History</span>
              {savedEvents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#f1effd] text-[#5c3beb] border border-[#ded8f9]">
                  {savedEvents.length}
                </span>
              )}
            </button>

            {currentPlan && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Event
              </button>
            )}

            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#f0fbf5] text-[#127242] border border-[#d8f5e5]">
              <span className="w-2 h-2 rounded-full bg-[#127242] animate-pulse" />
              WCAG 2.1 AA
            </span>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        {/* Error Notification */}
        {errorMessage && (
          <div role="alert" className="p-4 rounded-2xl bg-[#fff5f6] border border-[#fde4e6] text-[#b8233f] text-sm flex items-center gap-2">
            <Info className="w-5 h-5 shrink-0 text-[#d93856]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!currentPlan ? (
          /* Intake Studio Mode */
          <div className="space-y-10">
            {/* Hero Banner — Styled like the "Today's Reflection" hero in reference Image 2 */}
            <div className="bg-gradient-to-br from-white via-[#fafbfe] to-[#f4f2ff] rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="max-w-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3.5 py-1 rounded-full border border-[#ded8f9]">
                    Domain-Specialized Intelligence
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Zero-Token Math & Security Guardrails
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold font-editorial text-[#171520] tracking-tight leading-[1.15]">
                  Plan Extraordinary Events with Confidence.
                </h1>
                <p className="text-base text-slate-600 leading-relaxed pt-1">
                  Tailored budgets with automatic category rebalancing, dual countdown and run-of-show schedules, vendor due-diligence questions, and personalized creative ideas.
                </p>

                {savedEvents.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(true)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#5c3beb] bg-white border border-[#ded8f9] px-4 py-2 rounded-full hover:bg-[#f1effd] transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Resume Previously Saved Project ({savedEvents.length})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Decorative Authentic Brand Mark Accent */}
              <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#5c3beb] via-[#6d46f5] to-[#8c67fa] shadow-xl shadow-[#5c3beb]/25 ring-1 ring-white/50 flex items-center justify-center text-white">
                  <HappyTimesIcon className="w-14 h-14" />
                </div>
              </div>
            </div>

            {/* Presets and Main Intake Form */}
            <EventIntakeForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          </div>
        ) : (
          /* Interactive Workbench Mode */
          <div className="space-y-8">
            {/* Event Summary Banner */}
            <div className="p-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f1effd] text-[#6842ed] border border-[#ded8f9]">
                    {currentIntake?.eventType} VERTICAL
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">
                    Event Date: <strong className="text-[#1c192b]">{currentIntake?.eventDate}</strong>
                  </span>
                  {currentIntake?.eventDate && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-amber-800 bg-[#fffbeb] border border-[#fef3c7] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ⏰ {Math.max(0, Math.ceil((new Date(currentIntake.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days Away
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">
                    Guests: <strong className="text-[#1c192b]">{currentIntake?.guestCount}</strong>
                  </span>
                </div>
                <h1 className="text-3xl font-bold font-editorial text-[#171520]">
                  {currentIntake?.eventName}
                </h1>
                <p className="text-xs text-slate-500">
                  {currentIntake?.locationStyle.toUpperCase()} Setting • {currentIntake?.themeKeywords.map(k => `#${k}`).join(' ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Total Budget</span>
                  <span className="text-3xl font-editorial font-bold text-[#5c3beb]">
                    ${currentIntake?.totalBudget.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fireConfetti(2500)}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#f59e0b] via-[#ec4899] to-[#8b5cf6] text-white shadow-md shadow-pink-500/25 hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Fire a celebratory confetti burst!"
                >
                  <PartyBurstIcon className="w-4 h-4" />
                  Party Burst
                </button>
              </div>
            </div>

            {/* Mobile / Responsive Pillar Nav (visible if viewport narrow) */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('budget')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === 'budget' ? 'bg-[#5c3beb] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <BudgetTrackerIcon className="w-3.5 h-3.5" />
                Budget Tracker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === 'timeline' ? 'bg-[#5c3beb] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <DualTimelinesIcon className="w-3.5 h-3.5" />
                Dual Timelines
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vendors')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === 'vendors' ? 'bg-[#5c3beb] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <VendorChecklistIcon className="w-3.5 h-3.5" />
                Vendor Checklist
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ideas')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === 'ideas' ? 'bg-[#5c3beb] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <IdeasStudioIcon className="w-3.5 h-3.5" />
                Ideas Studio
              </button>
            </div>

            {/* Active Pillar Card Container */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm">
              {activeTab === 'budget' && (
                <BudgetTracker
                  initialBudget={currentPlan.budget}
                  eventName={currentIntake?.eventName || 'Event'}
                  onBudgetChange={handleBudgetChange}
                />
              )}

              {activeTab === 'timeline' && (
                <TimelineRoadmap
                  eventName={currentIntake?.eventName || 'Event'}
                  eventDate={currentIntake?.eventDate || '2027-01-01'}
                  initialMilestones={currentPlan.preEventTimeline}
                  initialDayOfSchedule={currentPlan.dayOfSchedule}
                  onMilestonesChange={handleMilestonesChange}
                />
              )}

              {activeTab === 'vendors' && (
                <VendorChecklist
                  initialVendors={currentPlan.vendors}
                  eventId={currentIntake?.eventName}
                  onVendorsChange={handleVendorsChange}
                />
              )}

              {activeTab === 'ideas' && (
                <IdeaGallery initialIdeas={currentPlan.ideas} />
              )}
            </div>
          </div>
        )}

        {/* Real-Time System Engineering & Telemetry Drawer */}
        <TelemetryBar telemetry={telemetry} />
      </main>

      {/* Event History & Saved Projects Modal */}
      <EventHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedEvents={savedEvents}
        onSelectEvent={handleSelectSavedEvent}
        onDeleteEvent={handleDeleteSavedEvent}
        onStartNewEvent={() => {
          handleReset();
          setIsHistoryOpen(false);
        }}
      />

      {/* Semantic Light Footer */}
      <footer className="mt-auto py-10 border-t border-slate-200/80 bg-white text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-[#1c192b]">
              HappyTimes — Event Planning Assistant
            </p>
            <p className="text-slate-400 mt-0.5">
              Strictly engineered for WCAG 2.1 AA accessibility, defensive security, and penny-accurate arithmetic.
            </p>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <span>Security Audited</span>
            <span>•</span>
            <span>Zero-Token Math</span>
            <span>•</span>
            <span>Deterministic Reliability</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

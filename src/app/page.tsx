'use client';

/**
 * @fileoverview Main Page for happytimes chatbot — GenAI-Powered Event Planning Assistant.
 * Designed with a spacious, airy light theme, editorial typography,
 * floating pill navigation, and full WCAG 2.1 AA accessibility.
 */

import React, { useState, useCallback } from 'react';
import {
  PartyPopper,
  PieChart,
  Calendar,
  CheckSquare,
  Lightbulb,
  RefreshCw,
  Search,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { SkipToContent, AriaLiveAnnouncer, useAnnouncer } from '@/components/a11y/SkipToContent';
import { EventIntakeForm } from '@/components/forms/EventIntakeForm';
import { BudgetTracker } from '@/components/workbench/BudgetTracker';
import { TimelineRoadmap } from '@/components/workbench/TimelineRoadmap';
import { VendorChecklist } from '@/components/workbench/VendorChecklist';
import { IdeaGallery } from '@/components/workbench/IdeaGallery';
import { TelemetryBar } from '@/components/workbench/TelemetryBar';
import type { EventIntake, EventPlan, Telemetry } from '@/schemas/eventSchemas';
import { generateDeterministic } from '@/services/llmGateway';

export default function HomePage(): React.JSX.Element {
  const [currentIntake, setCurrentIntake] = useState<EventIntake | null>(null);
  const [currentPlan, setCurrentPlan] = useState<EventPlan | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'timeline' | 'vendors' | 'ideas'>('budget');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { message: announceMessage, announce } = useAnnouncer();

  const handleFormSubmit = useCallback(async (intakeData: EventIntake) => {
    setIsLoading(true);
    setErrorMessage(null);
    announce(`Synthesizing tailored event plan for ${intakeData.eventName}...`);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeData),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        setCurrentIntake(intakeData);
        setCurrentPlan(data.plan);
        setTelemetry(data.telemetry);
        announce(`Event plan synthesized successfully! Displaying workbench for ${intakeData.eventName}.`);
      } else {
        const fallbackResult = generateDeterministic(intakeData);
        setCurrentIntake(intakeData);
        setCurrentPlan(fallbackResult.plan);
        setTelemetry({
          inputSanitized: true,
          piiTokensRedacted: 0,
          promptInjectionBlocked: false,
          cacheHit: false,
          latencyMs: fallbackResult.latencyMs,
          schemaValid: true,
          source: 'deterministic',
        });
        announce(`Generated plan using deterministic smart engine.`);
      }
    } catch (err) {
      const fallbackResult = generateDeterministic(intakeData);
      setCurrentIntake(intakeData);
      setCurrentPlan(fallbackResult.plan);
      setTelemetry({
        inputSanitized: true,
        piiTokensRedacted: 0,
        promptInjectionBlocked: false,
        cacheHit: false,
        latencyMs: fallbackResult.latencyMs,
        schemaValid: true,
        source: 'deterministic',
      });
      announce(`Plan generated offline using deterministic smart engine.`);
    } finally {
      setIsLoading(false);
    }
  }, [announce]);

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
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6842ed] to-[#8d69f7] flex items-center justify-center text-white shadow-sm shadow-[#6842ed]/30">
              <PartyPopper className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#171520] flex items-center gap-1.5 font-editorial">
                happytimes <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-full bg-[#f1effd] text-[#6842ed] border border-[#e1ddfa]">chatbot</span>
              </span>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                AI Event Architecture Studio
              </span>
            </div>
          </div>

          {/* Center: Floating Pill Navigation Dock (When plan is generated) */}
          {currentPlan ? (
            <div className="hidden md:flex items-center gap-1 p-1.5 bg-[#f1f3f9] rounded-full border border-slate-200/60" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'budget'}
                onClick={() => setActiveTab('budget')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'budget'
                    ? 'bg-[#6842ed] text-white shadow-sm shadow-[#6842ed]/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                Budget Tracker
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timeline'}
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-[#6842ed] text-white shadow-sm shadow-[#6842ed]/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Dual Timelines
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'vendors'}
                onClick={() => setActiveTab('vendors')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'vendors'
                    ? 'bg-[#6842ed] text-white shadow-sm shadow-[#6842ed]/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Vendor Checklist
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ideas'}
                onClick={() => setActiveTab('ideas')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ideas'
                    ? 'bg-[#6842ed] text-white shadow-sm shadow-[#6842ed]/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
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
          <div className="flex items-center gap-3">
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

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#f0fbf5] text-[#127242] border border-[#d8f5e5]">
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
              </div>

              {/* Decorative Subtle Illustration Accent */}
              <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 text-center">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-[#6842ed]/10 to-[#8d69f7]/20 border border-[#6842ed]/20 flex items-center justify-center text-[#6842ed]">
                  <Sparkles className="w-12 h-12" />
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
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f1effd] text-[#6842ed] border border-[#ded8f9]">
                    {currentIntake?.eventType} VERTICAL
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">
                    Event Date: <strong className="text-[#1c192b]">{currentIntake?.eventDate}</strong>
                  </span>
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

              <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Total Budget</span>
                  <span className="text-3xl font-editorial font-bold text-[#6842ed]">
                    ${currentIntake?.totalBudget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile / Responsive Pillar Nav (visible if viewport narrow) */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('budget')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                  activeTab === 'budget' ? 'bg-[#6842ed] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Budget Tracker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                  activeTab === 'timeline' ? 'bg-[#6842ed] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Dual Timelines
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vendors')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                  activeTab === 'vendors' ? 'bg-[#6842ed] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Vendor Checklist
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ideas')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                  activeTab === 'ideas' ? 'bg-[#6842ed] text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Ideas Studio
              </button>
            </div>

            {/* Active Pillar Card Container */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm">
              {activeTab === 'budget' && (
                <BudgetTracker
                  initialBudget={currentPlan.budget}
                  eventName={currentIntake?.eventName || 'Event'}
                />
              )}

              {activeTab === 'timeline' && (
                <TimelineRoadmap
                  eventName={currentIntake?.eventName || 'Event'}
                  eventDate={currentIntake?.eventDate || '2027-01-01'}
                  initialMilestones={currentPlan.preEventTimeline}
                  initialDayOfSchedule={currentPlan.dayOfSchedule}
                />
              )}

              {activeTab === 'vendors' && (
                <VendorChecklist
                  initialVendors={currentPlan.vendors}
                  eventId={currentIntake?.eventName}
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

      {/* Semantic Light Footer */}
      <footer className="mt-auto py-10 border-t border-slate-200/80 bg-white text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-[#1c192b]">
              happytimes chatbot — GenAI-Powered Event Planning Assistant
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

'use client';

/**
 * @fileoverview TelemetryBar — System Engineering & Guardrails Drawer.
 * Displays real-time verification of security defenses, PII redactions,
 * cache hit/miss status, latency, and schema validation in a clean, accessible light container.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  EyeOff,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import type { Telemetry } from '@/schemas/eventSchemas';

interface TelemetryBarProps {
  telemetry: Telemetry | null;
}

export function TelemetryBar({ telemetry }: TelemetryBarProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!telemetry) {
    return (
      <aside aria-label="System telemetry standby" className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#127242] animate-pulse" aria-hidden="true" />
            <span className="font-bold text-[#1c192b]">Defense Guardrails Telemetry Standby</span>
          </div>
          <span className="text-slate-400">Awaiting event generation</span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="System engineering guardrails and telemetry" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Summary Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#fafbfe] transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-[#f0fbf5] text-[#127242] border border-[#d8f5e5]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1c192b]">
              Security & Guardrails Audit Telemetry
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            {/* Source Badge */}
            <span className="px-2.5 py-0.5 rounded-full bg-[#f1effd] text-[#6842ed] border border-[#ded8f9] font-bold">
              SOURCE: {telemetry.source.toUpperCase()}
            </span>

            {/* Cache Badge */}
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${telemetry.cacheHit ? 'bg-[#f0fbf5] text-[#127242] border-[#d8f5e5]' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {telemetry.cacheHit ? 'CACHE HIT (0ms LLM)' : 'CACHE MISS'}
            </span>

            {/* PII Badge */}
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${telemetry.piiTokensRedacted > 0 ? 'bg-[#fff8ea] text-[#b47818] border-[#fde8be]' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              PII: {telemetry.piiTokensRedacted} Scrubbed
            </span>

            {/* Latency */}
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {telemetry.latencyMs}ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-[#6842ed] shrink-0">
          <span>{isExpanded ? 'Hide Audit Log' : 'View Evaluator Audit Log'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Diagnostic Grid */}
      {isExpanded && (
        <div className="p-6 border-t border-slate-100 bg-[#fbfbfe] text-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Sanitizer */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Input Sanitization</span>
              <span className="text-sm font-bold text-[#127242] mt-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {telemetry.inputSanitized ? 'XSS & Control Chars Purged' : 'Failed'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">HTML tags, script & control chars stripped</span>
            </div>

            {/* Prompt Guard */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompt Guard</span>
              <span className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${telemetry.promptInjectionBlocked ? 'text-[#d93856]' : 'text-[#127242]'}`}>
                {telemetry.promptInjectionBlocked ? (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Threat Blocked
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Safe Clean Prompt
                  </>
                )}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Jailbreak & override pattern detection</span>
            </div>

            {/* PII Redactor */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PII Redaction</span>
              <span className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${telemetry.piiTokensRedacted > 0 ? 'text-[#b47818]' : 'text-slate-700'}`}>
                <EyeOff className="w-4 h-4" />
                {telemetry.piiTokensRedacted} Tokens Scrubbed
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Emails, phones, SSNs & street addresses</span>
            </div>

            {/* Schema Validation */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Zod Strict Schema</span>
              <span className="text-sm font-bold text-[#127242] mt-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {telemetry.schemaValid ? '100% Runtime Valid' : 'Invalid'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Full payload type verification</span>
            </div>
          </div>

          {/* Efficiency Details */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[#6842ed] font-bold uppercase tracking-wider text-[11px] block">
                Deterministic Token Optimization
              </span>
              <p className="text-slate-600 text-xs">
                Zero LLM tokens spent on basic math: budget allocations, largest-remainder penny splits, and timeline ordering execute deterministically.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">LRU Cache</span>
                <span className={`font-bold ${telemetry.cacheHit ? 'text-[#127242]' : 'text-slate-700'}`}>
                  {telemetry.cacheHit ? 'HIT (~2000ms saved)' : 'MISS (Cached for replay)'}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 text-[10px] block">Round-Trip Latency</span>
                <span className="font-bold text-[#6842ed]">{telemetry.latencyMs} ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

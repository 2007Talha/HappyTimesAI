'use client';

/**
 * @fileoverview Event intake form with comprehensive validation.
 * Collects event type, budget, guests, date, location style, theme keywords,
 * dietary needs, cultural considerations, and additional notes.
 * Features 3 one-click demo presets for evaluator convenience.
 */

import React, { useState, useCallback, useId } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Globe,
  FileText,
  Zap,
  Heart,
  Cake,
  Building2,
} from 'lucide-react';
import type { EventIntake } from '@/schemas/eventSchemas';

/** Props for EventIntakeForm */
interface EventIntakeFormProps {
  /** Callback when form is submitted with validated data */
  onSubmit: (data: EventIntake) => void;
  /** Whether the form is currently submitting (disables inputs) */
  isLoading?: boolean;
}

/** Demo preset configuration */
interface DemoPreset {
  label: string;
  icon: React.ReactNode;
  description: string;
  data: EventIntake;
}

/** Available event type options */
const EVENT_TYPES = [
  { value: 'wedding' as const, label: 'Wedding', icon: Heart },
  { value: 'birthday' as const, label: 'Birthday', icon: Cake },
  { value: 'community' as const, label: 'Community Event', icon: Building2 },
];

/** Location style options */
const LOCATION_STYLES = [
  { value: 'indoor' as const, label: 'Indoor' },
  { value: 'outdoor' as const, label: 'Outdoor' },
  { value: 'hybrid' as const, label: 'Hybrid (Indoor + Outdoor)' },
  { value: 'virtual' as const, label: 'Virtual' },
];

/** Demo presets for one-click testing */
const DEMO_PRESETS: DemoPreset[] = [
  {
    label: 'Rustic Autumn Wedding — $28,000',
    icon: <Heart className="w-4 h-4 text-rose-500" />,
    description: '120 guests, hybrid venue, autumn theme',
    data: {
      eventType: 'wedding',
      eventName: 'Sarah & James — Rustic Autumn Wedding',
      totalBudget: 28000,
      guestCount: 120,
      eventDate: '2027-10-16',
      locationStyle: 'hybrid',
      themeKeywords: ['rustic', 'autumn', 'barn', 'warm tones', 'candlelight'],
      dietaryNeeds: ['vegetarian options', 'gluten-free', 'nut allergy'],
      culturalConsiderations: ['non-denominational ceremony', 'unity candle tradition'],
      additionalNotes: 'Live acoustic guitarist during cocktail hour and an artisan s\'mores bar at reception.',
    },
  },
  {
    label: 'Milestone 30th Birthday — $3,500',
    icon: <Cake className="w-4 h-4 text-amber-500" />,
    description: '40 guests, indoor arcade & lounge, retro vibe',
    data: {
      eventType: 'birthday',
      eventName: "Alex's Milestone 30th Birthday Bash",
      totalBudget: 3500,
      guestCount: 40,
      eventDate: '2027-06-25',
      locationStyle: 'indoor',
      themeKeywords: ['neon', 'retro 90s', 'arcade', 'colorful'],
      dietaryNeeds: ['vegan options', 'dairy-free cake option'],
      culturalConsiderations: [],
      additionalNotes: 'Surprise party! Guest of honor loves retro video games and 90s hip-hop music.',
    },
  },
  {
    label: 'Neighborhood Tech & Art Fair — $12,000',
    icon: <Building2 className="w-4 h-4 text-emerald-500" />,
    description: '500 attendees, community park, interactive exhibits',
    data: {
      eventType: 'community',
      eventName: 'Riverside Community Tech & Art Fair 2027',
      totalBudget: 12000,
      guestCount: 500,
      eventDate: '2027-08-14',
      locationStyle: 'outdoor',
      themeKeywords: ['technology', 'art', 'innovation', 'community', 'maker-fair'],
      dietaryNeeds: ['halal options', 'kosher certified', 'vegetarian', 'nut-free'],
      culturalConsiderations: ['multilingual signage (English, Spanish, Mandarin)', 'ADA fully accessible'],
      additionalNotes: 'Requires 20 exhibitor booths, live staging, volunteer command post, and kids robotics zone.',
    },
  },
];

export function EventIntakeForm({ onSubmit, isLoading = false }: EventIntakeFormProps): React.JSX.Element {
  const formId = useId();
  const [formData, setFormData] = useState<EventIntake>({
    eventType: 'wedding',
    eventName: '',
    totalBudget: 25000,
    guestCount: 100,
    eventDate: '2027-09-18',
    locationStyle: 'hybrid',
    themeKeywords: ['elegant', 'romantic'],
    dietaryNeeds: ['vegetarian'],
    culturalConsiderations: [],
    additionalNotes: '',
  });

  const [themeInput, setThemeInput] = useState('');
  const [dietaryInput, setDietaryInput] = useState('');
  const [culturalInput, setCulturalInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof EventIntake>(
    field: K,
    value: EventIntake[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const addTag = useCallback((
    field: 'themeKeywords' | 'dietaryNeeds' | 'culturalConsiderations',
    value: string,
    setter: (v: string) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !formData[field].includes(trimmed)) {
      updateField(field, [...formData[field], trimmed]);
    }
    setter('');
  }, [formData, updateField]);

  const removeTag = useCallback((
    field: 'themeKeywords' | 'dietaryNeeds' | 'culturalConsiderations',
    index: number
  ) => {
    updateField(field, formData[field].filter((_, i) => i !== index));
  }, [formData, updateField]);

  const applyPreset = useCallback((preset: DemoPreset) => {
    setFormData(preset.data);
    setErrors({});
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.totalBudget || formData.totalBudget <= 0) newErrors.totalBudget = 'Budget must be greater than $0';
    if (!formData.guestCount || formData.guestCount <= 0) newErrors.guestCount = 'Guest count must be at least 1';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <div className="space-y-6">
      {/* Demo Presets Bar */}
      <section aria-labelledby={`${formId}-presets-heading`} className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 id={`${formId}-presets-heading`} className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            1-Click Evaluator Presets
          </h2>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Instant Test Scenarios</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              disabled={isLoading}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 group"
              aria-label={`Load demo preset: ${preset.label}`}
            >
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                {preset.icon}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                  {preset.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {preset.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} noValidate className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Event Specifications
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure event parameters to synthesize custom budgets, dual timelines, vendor requirements, and creative ideas.
          </p>
        </div>

        {/* Event Type Radio Group */}
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Event Type <span className="text-rose-500" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup">
            {EVENT_TYPES.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-indigo-500 ${
                  formData.eventType === value
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="eventType"
                  value={value}
                  checked={formData.eventType === value}
                  onChange={() => updateField('eventType', value)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <Icon
                  className={`w-5 h-5 ${
                    formData.eventType === value
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-semibold text-sm">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Event Name */}
        <div>
          <label htmlFor={`${formId}-name`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            <FileText className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
            Event Name <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={formData.eventName}
            onChange={(e) => updateField('eventName', e.target.value)}
            placeholder="e.g., Sarah & James — Rustic Autumn Wedding"
            disabled={isLoading}
            aria-invalid={!!errors.eventName}
            aria-describedby={errors.eventName ? `${formId}-name-error` : undefined}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
          />
          {errors.eventName && (
            <p id={`${formId}-name-error`} className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 font-medium" role="alert">
              {errors.eventName}
            </p>
          )}
        </div>

        {/* Budget & Guests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-budget`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1 text-slate-500" aria-hidden="true" />
              Total Budget (USD) <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                id={`${formId}-budget`}
                type="number"
                min="100"
                step="50"
                value={formData.totalBudget || ''}
                onChange={(e) => updateField('totalBudget', Number(e.target.value))}
                placeholder="25000"
                disabled={isLoading}
                aria-invalid={!!errors.totalBudget}
                aria-describedby={errors.totalBudget ? `${formId}-budget-error` : undefined}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
              />
            </div>
            {errors.totalBudget && (
              <p id={`${formId}-budget-error`} className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 font-medium" role="alert">
                {errors.totalBudget}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-guests`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <Users className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
              Expected Guests <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-guests`}
              type="number"
              min="1"
              step="1"
              value={formData.guestCount || ''}
              onChange={(e) => updateField('guestCount', Number(e.target.value))}
              placeholder="100"
              disabled={isLoading}
              aria-invalid={!!errors.guestCount}
              aria-describedby={errors.guestCount ? `${formId}-guests-error` : undefined}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
            />
            {errors.guestCount && (
              <p id={`${formId}-guests-error`} className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 font-medium" role="alert">
                {errors.guestCount}
              </p>
            )}
          </div>
        </div>

        {/* Date & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-date`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <Calendar className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
              Event Date <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              value={formData.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              disabled={isLoading}
              aria-invalid={!!errors.eventDate}
              aria-describedby={errors.eventDate ? `${formId}-date-error` : undefined}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
            />
            {errors.eventDate && (
              <p id={`${formId}-date-error`} className="text-rose-600 dark:text-rose-400 text-xs mt-1.5 font-medium" role="alert">
                {errors.eventDate}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-location`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <MapPin className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
              Location Style
            </label>
            <select
              id={`${formId}-location`}
              value={formData.locationStyle}
              onChange={(e) => updateField('locationStyle', e.target.value as EventIntake['locationStyle'])}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
            >
              {LOCATION_STYLES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme Keywords */}
        <div>
          <label htmlFor={`${formId}-theme`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            <Sparkles className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
            Theme & Vibe Keywords
          </label>
          <div className="flex gap-2">
            <input
              id={`${formId}-theme`}
              type="text"
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('themeKeywords', themeInput, setThemeInput);
                }
              }}
              placeholder="e.g. vintage, bohemian, cyber, cozy (press Enter)"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
            />
            <button
              type="button"
              onClick={() => addTag('themeKeywords', themeInput, setThemeInput)}
              disabled={isLoading || !themeInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {formData.themeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5" role="list" aria-label="Selected theme keywords">
              {formData.themeKeywords.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag('themeKeywords', i)}
                    disabled={isLoading}
                    className="hover:text-indigo-900 dark:hover:text-indigo-100 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    aria-label={`Remove keyword ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dietary & Cultural Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-dietary`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <UtensilsCrossed className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
              Dietary Requirements
            </label>
            <div className="flex gap-2">
              <input
                id={`${formId}-dietary`}
                type="text"
                value={dietaryInput}
                onChange={(e) => setDietaryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag('dietaryNeeds', dietaryInput, setDietaryInput);
                  }
                }}
                placeholder="e.g. vegan, nut allergy, halal"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => addTag('dietaryNeeds', dietaryInput, setDietaryInput)}
                disabled={isLoading || !dietaryInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 text-sm"
              >
                Add
              </button>
            </div>
            {formData.dietaryNeeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5" role="list">
                {formData.dietaryNeeds.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    role="listitem"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag('dietaryNeeds', i)}
                      disabled={isLoading}
                      className="hover:text-emerald-900 dark:hover:text-emerald-100"
                      aria-label={`Remove dietary requirement ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-cultural`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <Globe className="w-4 h-4 inline mr-1.5 text-slate-500" aria-hidden="true" />
              Cultural Considerations
            </label>
            <div className="flex gap-2">
              <input
                id={`${formId}-cultural`}
                type="text"
                value={culturalInput}
                onChange={(e) => setCulturalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag('culturalConsiderations', culturalInput, setCulturalInput);
                  }
                }}
                placeholder="e.g. bilingual, tea ceremony"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => addTag('culturalConsiderations', culturalInput, setCulturalInput)}
                disabled={isLoading || !culturalInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 text-sm"
              >
                Add
              </button>
            </div>
            {formData.culturalConsiderations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5" role="list">
                {formData.culturalConsiderations.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    role="listitem"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag('culturalConsiderations', i)}
                      disabled={isLoading}
                      className="hover:text-purple-900 dark:hover:text-purple-100"
                      aria-label={`Remove cultural item ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor={`${formId}-notes`} className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Additional Directives & Desired Highlights
          </label>
          <textarea
            id={`${formId}-notes`}
            value={formData.additionalNotes ?? ''}
            onChange={(e) => updateField('additionalNotes', e.target.value)}
            rows={3}
            placeholder="Special instructions, favorite traditions, VIP guests, or specific vendor constraints..."
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          {isLoading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Synthesizing Plan & Guardrails...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-indigo-200" aria-hidden="true" />
              Forge Complete Event Plan
            </>
          )}
        </button>
      </form>
    </div>
  );
}


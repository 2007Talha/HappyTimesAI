'use client';

/**
 * @fileoverview Event intake form with comprehensive validation and spacious modern styling.
 * Designed with soft pastel preset cards, airy inputs, and clear visual hierarchy.
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
  Heart,
  Cake,
  Building2,
  ArrowRight,
  Check,
} from 'lucide-react';
import type { EventIntake } from '@/schemas/eventSchemas';

interface EventIntakeFormProps {
  onSubmit: (data: EventIntake) => void;
  isLoading?: boolean;
}

interface DemoPreset {
  label: string;
  categoryTag: string;
  badgeColor: string;
  bgStyle: string;
  borderStyle: string;
  textColor: string;
  description: string;
  highlights: string[];
  data: EventIntake;
}

const EVENT_TYPES = [
  {
    value: 'wedding' as const,
    label: 'Wedding Celebration',
    sub: 'Ceremony, reception, florals, photography & banquet',
    icon: Heart,
  },
  {
    value: 'birthday' as const,
    label: 'Milestone Birthday',
    sub: 'Party themes, custom cake, entertainment & music',
    icon: Cake,
  },
  {
    value: 'community' as const,
    label: 'Community Gathering',
    sub: 'Permits, staging, volunteer shifts, AV & sanitation',
    icon: Building2,
  },
];

const LOCATION_STYLES = [
  { value: 'indoor' as const, label: 'Indoor Venue / Hall' },
  { value: 'outdoor' as const, label: 'Open-Air / Park Grounds' },
  { value: 'hybrid' as const, label: 'Hybrid (Indoor Hall + Outdoor Courtyard)' },
  { value: 'virtual' as const, label: 'Virtual / Livestreamed Event' },
];

const DEMO_PRESETS: DemoPreset[] = [
  {
    label: 'Rustic Autumn Wedding',
    categoryTag: 'WEDDING VERTICAL',
    badgeColor: 'bg-[#fff5f6] text-[#c92a47] border border-[#fdd8de]',
    bgStyle: 'bg-[#fff7f8]',
    borderStyle: 'border-[#fde0e5]',
    textColor: 'text-[#9b1c33]',
    description: '120 guests with hybrid rustic barn layout and acoustic cocktail hour.',
    highlights: ['Penny-accurate $28,000 budget split', 'T-180 pre-event timeline', '14-step day-of run-of-show'],
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
    label: 'Milestone 30th Birthday',
    categoryTag: 'BIRTHDAY VERTICAL',
    badgeColor: 'bg-[#fffbf0] text-[#a66a07] border border-[#faeed0]',
    bgStyle: 'bg-[#fffdf5]',
    borderStyle: 'border-[#faeed0]',
    textColor: 'text-[#875504]',
    description: '40 guests in retro neon lounge with interactive DJ sets and custom cake.',
    highlights: ['Zero-math cake & beverage splits', 'Hourly activity schedule', 'Custom decor procurement checklist'],
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
    label: 'Neighborhood Tech & Art Fair',
    categoryTag: 'COMMUNITY VERTICAL',
    badgeColor: 'bg-[#f0fbf5] text-[#147a46] border border-[#d8f5e5]',
    bgStyle: 'bg-[#f5fdf8]',
    borderStyle: 'border-[#dcf7e8]',
    textColor: 'text-[#0d6337]',
    description: '500 attendees with municipal permit compliance, staging, and sanitation.',
    highlights: ['Permit & safety reserves', 'Volunteer coordinator shifts', 'Multilingual signage guides'],
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
    totalBudget: 28000,
    guestCount: 120,
    eventDate: '2027-10-16',
    locationStyle: 'hybrid',
    themeKeywords: ['rustic', 'autumn', 'candlelight'],
    dietaryNeeds: ['vegetarian'],
    culturalConsiderations: [],
    additionalNotes: '',
  });

  const [themeInput, setThemeInput] = useState('');
  const [dietaryInput, setDietaryInput] = useState('');
  const [culturalInput, setCulturalInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);

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

  const applyPreset = useCallback((preset: DemoPreset, idx: number) => {
    setFormData(preset.data);
    setActivePresetIndex(idx);
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
    <div className="space-y-10">
      {/* 3 Pastel Evaluator Preset Cards — Styled directly after reference screenshots */}
      <section aria-labelledby={`${formId}-presets-heading`} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
              Instant 1-Click Evaluation Scenarios
            </span>
            <h2 id={`${formId}-presets-heading`} className="text-xl font-bold text-[#1c192b] mt-1.5 font-editorial">
              Explore Pre-Configured Domain Blueprints
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Select a preset to auto-populate the intake parameters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_PRESETS.map((preset, idx) => {
            const isSelected = activePresetIndex === idx;
            return (
              <div
                key={preset.label}
                className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${preset.bgStyle} ${preset.borderStyle} ${
                  isSelected ? 'ring-2 ring-[#6842ed] shadow-md shadow-[#6842ed]/10' : 'hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${preset.badgeColor}`}>
                      {preset.categoryTag}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6842ed]">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>

                  <h3 className="font-editorial text-lg font-bold text-[#1c192b] mb-1">
                    {preset.label}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {preset.description}
                  </p>

                  <ul className="space-y-1.5 mb-5">
                    {preset.highlights.map((h, i) => (
                      <li key={i} className="text-[11px] text-slate-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6842ed]/60" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => applyPreset(preset, idx)}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-[#1c192b] hover:bg-[#6842ed] hover:text-white hover:border-[#6842ed] transition-all flex items-center justify-center gap-1.5 group cursor-pointer shadow-2xs"
                  aria-label={`Load preset ${preset.label}`}
                >
                  <span>Apply This Scenario</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Intake Form Card */}
      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
            Step 1 • Event Specifications
          </span>
          <h2 className="text-3xl font-bold font-editorial text-[#171520] tracking-tight mt-2">
            Configure Your Event Details
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Specify your guest counts, timeline constraints, aesthetic vibe, and special requirements.
          </p>
        </div>

        {/* Event Type Cards — Styled like the calendar selector in reference photo */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
            Choose Event Domain <span className="text-[#6842ed]">*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup">
            {EVENT_TYPES.map(({ value, label, sub, icon: Icon }) => {
              const isActive = formData.eventType === value;
              return (
                <label
                  key={value}
                  className={`flex flex-col p-5 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#6842ed] bg-[#f8f7ff] shadow-sm shadow-[#6842ed]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={value}
                    checked={isActive}
                    onChange={() => updateField('eventType', value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-[#6842ed] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#6842ed]" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-[#1c192b] block">{label}</span>
                  <span className="text-xs text-slate-500 mt-1 leading-snug">{sub}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Event Name */}
        <div className="space-y-1.5">
          <label htmlFor={`${formId}-name`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Event Title / Name <span className="text-[#6842ed]">*</span>
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={formData.eventName}
            onChange={(e) => updateField('eventName', e.target.value)}
            placeholder="e.g., Sarah & James — Rustic Autumn Wedding"
            disabled={isLoading}
            aria-invalid={!!errors.eventName}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] placeholder-slate-400 focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm"
          />
          {errors.eventName && (
            <p className="text-[#d93856] text-xs font-medium mt-1">{errors.eventName}</p>
          )}
        </div>

        {/* Budget & Guests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-budget`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Budget (USD) <span className="text-[#6842ed]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                id={`${formId}-budget`}
                type="number"
                min="100"
                step="50"
                value={formData.totalBudget || ''}
                onChange={(e) => updateField('totalBudget', Number(e.target.value))}
                placeholder="28000"
                disabled={isLoading}
                aria-invalid={!!errors.totalBudget}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] placeholder-slate-400 focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm font-medium"
              />
            </div>
            {errors.totalBudget && (
              <p className="text-[#d93856] text-xs font-medium mt-1">{errors.totalBudget}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${formId}-guests`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Expected Guests <span className="text-[#6842ed]">*</span>
            </label>
            <input
              id={`${formId}-guests`}
              type="number"
              min="1"
              value={formData.guestCount || ''}
              onChange={(e) => updateField('guestCount', Number(e.target.value))}
              placeholder="120"
              disabled={isLoading}
              aria-invalid={!!errors.guestCount}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] placeholder-slate-400 focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm font-medium"
            />
            {errors.guestCount && (
              <p className="text-[#d93856] text-xs font-medium mt-1">{errors.guestCount}</p>
            )}
          </div>
        </div>

        {/* Date & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-date`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Date <span className="text-[#6842ed]">*</span>
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              value={formData.eventDate}
              onChange={(e) => updateField('eventDate', e.target.value)}
              disabled={isLoading}
              aria-invalid={!!errors.eventDate}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm font-medium"
            />
            {errors.eventDate && (
              <p className="text-[#d93856] text-xs font-medium mt-1">{errors.eventDate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${formId}-location`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Venue / Location Setting
            </label>
            <select
              id={`${formId}-location`}
              value={formData.locationStyle}
              onChange={(e) => updateField('locationStyle', e.target.value as EventIntake['locationStyle'])}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm font-medium"
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
        <div className="space-y-2">
          <label htmlFor={`${formId}-theme`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Aesthetic Themes & Vibe Keywords
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
              placeholder="e.g. vintage, bohemian, candlelight (press Enter)"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] placeholder-slate-400 focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => addTag('themeKeywords', themeInput, setThemeInput)}
              disabled={isLoading || !themeInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {formData.themeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {formData.themeKeywords.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1effd] text-[#6842ed] text-xs font-semibold border border-[#e1ddfa]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag('themeKeywords', i)}
                    className="hover:text-[#4b27cc] cursor-pointer"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dietary & Cultural Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label htmlFor={`${formId}-dietary`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Dietary Inclusions
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
                placeholder="e.g. vegetarian, nut-free"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] text-sm focus:bg-white focus:border-[#6842ed]"
              />
              <button
                type="button"
                onClick={() => addTag('dietaryNeeds', dietaryInput, setDietaryInput)}
                disabled={isLoading || !dietaryInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {formData.dietaryNeeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.dietaryNeeds.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f0fbf5] text-[#127242] text-xs font-semibold border border-[#d8f5e5]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag('dietaryNeeds', i)}
                      className="hover:text-[#0b4d2c]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor={`${formId}-cultural`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Cultural & Traditions
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
                placeholder="e.g. unity candle, tea ceremony"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] text-sm focus:bg-white focus:border-[#6842ed]"
              />
              <button
                type="button"
                onClick={() => addTag('culturalConsiderations', culturalInput, setCulturalInput)}
                disabled={isLoading || !culturalInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {formData.culturalConsiderations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.culturalConsiderations.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fff5f6] text-[#b8233f] text-xs font-semibold border border-[#fde4e6]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag('culturalConsiderations', i)}
                      className="hover:text-[#801429]"
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
        <div className="space-y-1.5">
          <label htmlFor={`${formId}-notes`} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Special Directives & Highlights (Optional)
          </label>
          <textarea
            id={`${formId}-notes`}
            value={formData.additionalNotes ?? ''}
            onChange={(e) => updateField('additionalNotes', e.target.value)}
            rows={3}
            placeholder="Special instructions, VIP guests, entertainment preferences..."
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fafbfe] text-[#1c192b] placeholder-slate-400 focus:bg-white focus:border-[#6842ed] focus:ring-4 focus:ring-[#6842ed]/10 transition-all text-sm"
          />
        </div>

        {/* Submit Button — Solid vibrant purple pill button like Image 1 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-8 rounded-full bg-[#6842ed] hover:bg-[#5733dd] active:scale-[0.99] text-white font-semibold text-base shadow-md shadow-[#6842ed]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synthesizing Event Architecture...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-purple-200" />
                Generate Event Plan & Interactive Workbench
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

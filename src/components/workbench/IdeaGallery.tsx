'use client';

/**
 * @fileoverview Personalized Creative Ideas Studio component.
 * Displays tailored theme concepts, decor inspirations, signature experiences,
 * sustainability practices, inclusivity tips, and interactive soundscape pairings.
 */

import React, { useState, useId } from 'react';
import {
  Sparkles,
  Palette,
  Utensils,
  Smile,
  Leaf,
  Users,
  Star,
  Music,
  Wine,
  Flame,
  Radio,
} from 'lucide-react';
import type { Idea } from '@/schemas/eventSchemas';
import { fireConfetti } from '@/lib/confetti';
import { IdeasStudioIcon } from '@/components/brand/PillIcons';

interface IdeaGalleryProps {
  initialIdeas: Idea[];
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; badgeStyle: string; cardStyle: string }
> = {
  theme: {
    label: 'Theme & Concept',
    icon: <Palette className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#f1effd] text-[#6842ed] border border-[#e1ddfa]',
    cardStyle: 'border-slate-200/90 hover:border-[#6842ed]/40 bg-white',
  },
  decor: {
    label: 'Decor & Ambiance',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#fff5f6] text-[#b8233f] border border-[#fde4e6]',
    cardStyle: 'border-slate-200/90 hover:border-[#b8233f]/40 bg-white',
  },
  menu: {
    label: 'Menu & Culinary',
    icon: <Utensils className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#fffbf0] text-[#a66a07] border border-[#faeed0]',
    cardStyle: 'border-slate-200/90 hover:border-[#a66a07]/40 bg-white',
  },
  activity: {
    label: 'Activities & Fun',
    icon: <Smile className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#dbeafe]',
    cardStyle: 'border-slate-200/90 hover:border-[#1d4ed8]/40 bg-white',
  },
  sustainability: {
    label: 'Eco & Sustainability',
    icon: <Leaf className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#f0fbf5] text-[#147a46] border border-[#d8f5e5]',
    cardStyle: 'border-slate-200/90 hover:border-[#147a46]/40 bg-white',
  },
  inclusivity: {
    label: 'Inclusivity & Access',
    icon: <Users className="w-3.5 h-3.5" />,
    badgeStyle: 'bg-[#faf5ff] text-[#7e22ce] border border-[#f3e8ff]',
    cardStyle: 'border-slate-200/90 hover:border-[#7e22ce]/40 bg-white',
  },
};

const SOUNDSCAPE_VIBES = [
  {
    id: 'sunset-jazz',
    title: '🎷 Sunset Romance & Cocktails',
    playlist: 'Warm Bossa Nova, Acoustic Folk & Neo-Soul',
    cocktail: 'Lavender French 75 (Gin, Champagne, Lemon, Lavender)',
    mocktail: 'Sparkling Blackberry Thyme Spritz',
    icebreaker: 'Polaroid Memory Guestbook with handwritten prompts',
  },
  {
    id: 'retro-disco',
    title: '🪩 90s Neon Dancefloor',
    playlist: '90s Hip-Hop, French House & Funk Revival',
    cocktail: 'Electric Blue Hawaii (Rum, Blue Curacao, Pineapple)',
    mocktail: 'Citrus Yuzu Fizz with edible glitter',
    icebreaker: 'Retro Decade Trivia & Lip-Sync battle',
  },
  {
    id: 'boho-garden',
    title: '🌿 Bohemian Meadow Gathering',
    playlist: 'Indie Folk, Fingerstyle Guitar & Chill Lo-Fi',
    cocktail: 'Elderflower Cucumber Gin Cooler',
    mocktail: 'Hibiscus Ginger Mint Brew',
    icebreaker: 'DIY Herbal Tea Blending & Wildflower Crown station',
  },
  {
    id: 'tech-expo',
    title: '⚡ Innovation & Energy Fair',
    playlist: 'Synthwave, Ambient Electronic & Upbeat Funk',
    cocktail: 'Espresso Martini with nitro cold brew float',
    mocktail: 'Cascara Coffee Berry Tonic',
    icebreaker: 'Collaborative Community Mural & Robotics Demo challenge',
  },
];

export function IdeaGallery({ initialIdeas }: IdeaGalleryProps): React.JSX.Element {
  const componentId = useId();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set());
  const [selectedVibeIndex, setSelectedVibeIndex] = useState<number>(0);

  const toggleSaveIdea = (id: string) => {
    let wasSaved = false;
    setSavedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        wasSaved = true;
      }
      return next;
    });
    if (wasSaved) {
      fireConfetti(1200);
    }
  };

  const categories = [
    { key: 'all', label: 'All Concepts' },
    ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ key: k, label: v.label })),
  ];

  const filteredIdeas = initialIdeas.filter(
    (idea) => selectedCategory === 'all' || idea.category === selectedCategory
  );

  const activeVibe = SOUNDSCAPE_VIBES[selectedVibeIndex];

  return (
    <section aria-labelledby={`${componentId}-ideas-heading`} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6842ed] bg-[#f1effd] px-3 py-1 rounded-full">
            Tailored Ideation Studio
          </span>
          <h2 id={`${componentId}-ideas-heading`} className="text-2xl font-bold font-editorial text-[#1c192b] mt-1.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5c3beb]/10 text-[#5c3beb] flex items-center justify-center">
              <IdeasStudioIcon className="w-4 h-4" />
            </div>
            Curated Themes, Menus & Atmosphere
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sensory concepts, dietary accommodations, guest engagement, and interactive vibes.
          </p>
        </div>

        {savedIdeaIds.size > 0 && (
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#fff8ea] text-[#b47818] border border-[#fde8be] self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
            <Star className="w-3.5 h-3.5 fill-[#b47818] text-[#b47818]" />
            {savedIdeaIds.size} Shortlisted Ideas
          </span>
        )}
      </div>

      {/* Interactive Vibe & Soundscape Generator Widget */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-[#f8f7ff] to-white rounded-3xl border border-[#ece8ff] shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6842ed] bg-white border border-[#ded8f9] px-3 py-0.5 rounded-full">
              Interactive Vibe & Atmosphere Pairing
            </span>
            <h3 className="font-editorial text-xl font-bold text-[#1c192b] mt-1 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#6842ed]" />
              Match Your Playlist, Drinks & Icebreaker
            </h3>
          </div>
          <span className="text-xs text-slate-400">Click a mood to preview crowd pairings</span>
        </div>

        {/* Mood Pills */}
        <div className="flex flex-wrap gap-2">
          {SOUNDSCAPE_VIBES.map((vibe, idx) => (
            <button
              key={vibe.id}
              type="button"
              onClick={() => {
                setSelectedVibeIndex(idx);
                fireConfetti(800);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedVibeIndex === idx
                  ? 'bg-[#6842ed] text-white shadow-sm shadow-[#6842ed]/25'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {vibe.title}
            </button>
          ))}
        </div>

        {/* Selected Vibe Output Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#6842ed]" />
              Suggested Soundscape Vibe
            </span>
            <p className="text-sm font-semibold text-[#1c192b] font-editorial pt-0.5">
              {activeVibe.playlist}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-[#f59e0b]" />
              Signature Drink Pairing
            </span>
            <p className="text-xs text-slate-700 font-medium pt-0.5">
              <strong>Cocktail:</strong> {activeVibe.cocktail}
            </p>
            <p className="text-[11px] text-slate-500">
              <strong>Mocktail:</strong> {activeVibe.mocktail}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#ec4899]" />
              Crowd Icebreaker Activity
            </span>
            <p className="text-xs text-slate-700 font-medium pt-0.5">
              {activeVibe.icebreaker}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="toolbar">
        {categories.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === key
                ? 'bg-[#6842ed] text-white shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ideas Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
        {filteredIdeas.map((idea) => {
          const config = CATEGORY_CONFIG[idea.category] || CATEGORY_CONFIG.theme;
          const isSaved = savedIdeaIds.has(idea.id);

          return (
            <article
              key={idea.id}
              role="listitem"
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-2xs ${config.cardStyle} ${
                isSaved ? 'ring-2 ring-[#b47818] bg-[#fffdf8]' : ''
              }`}
            >
              <div>
                {/* Top Badge & Favorite Button */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${config.badgeStyle}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSaveIdea(idea.id)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#b47818] transition-colors cursor-pointer"
                    aria-label={isSaved ? `Remove ${idea.title} from shortlist` : `Save ${idea.title} to shortlist`}
                  >
                    <Star
                      className={`w-4 h-4 ${isSaved ? 'fill-[#b47818] text-[#b47818]' : ''}`}
                    />
                  </button>
                </div>

                <h3 className="font-editorial text-lg font-bold text-[#1c192b] mb-1.5">
                  {idea.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {idea.description}
                </p>
              </div>

              {/* Bottom Tags & Cost */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {idea.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-500 bg-[#f7f8fc] border border-slate-200/80 px-2 py-0.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {idea.estimatedCost !== undefined && idea.estimatedCost > 0 && (
                  <span className="text-xs font-mono font-bold text-[#6842ed] whitespace-nowrap">
                    ~${idea.estimatedCost.toLocaleString()}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

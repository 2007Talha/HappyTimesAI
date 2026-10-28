'use client';

/**
 * @fileoverview Personalized Creative Ideas Studio component.
 * Displays tailored theme concepts, decor inspirations, signature experiences,
 * sustainability practices, and inclusivity tips.
 */

import React, { useState, useId } from 'react';
import {
  Sparkles,
  Heart,
  Palette,
  Utensils,
  Smile,
  Leaf,
  Users,
  Tag,
  Star,
  Check,
} from 'lucide-react';
import type { Idea } from '@/schemas/eventSchemas';

interface IdeaGalleryProps {
  initialIdeas: Idea[];
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  theme: {
    label: 'Theme & Concept',
    icon: <Palette className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
  },
  decor: {
    label: 'Decor & Ambiance',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300',
  },
  menu: {
    label: 'Menu & Culinary',
    icon: <Utensils className="w-4 h-4" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
  },
  activity: {
    label: 'Activities & Fun',
    icon: <Smile className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300',
  },
  sustainability: {
    label: 'Eco & Sustainability',
    icon: <Leaf className="w-4 h-4" />,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
  },
  inclusivity: {
    label: 'Inclusivity & Access',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300',
  },
};

export function IdeaGallery({ initialIdeas }: IdeaGalleryProps): React.JSX.Element {
  const componentId = useId();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set());

  const toggleSaveIdea = (id: string) => {
    setSavedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = [
    { key: 'all', label: 'All Concepts' },
    ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ key: k, label: v.label })),
  ];

  const filteredIdeas = initialIdeas.filter(
    (idea) => selectedCategory === 'all' || idea.category === selectedCategory
  );

  return (
    <section aria-labelledby={`${componentId}-ideas-heading`} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 id={`${componentId}-ideas-heading`} className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Personalized Creative Studio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            AI-curated sensory experiences, theme styling, dietary menus, eco-practices, and inclusivity blueprints.
          </p>
        </div>

        {savedIdeaIds.size > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 self-start sm:self-auto flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            {savedIdeaIds.size} Shortlisted Ideas
          </span>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Filter ideas by category">
        {categories.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ideas Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
        {filteredIdeas.map((idea) => {
          const config = CATEGORY_CONFIG[idea.category] || CATEGORY_CONFIG.theme;
          const isSaved = savedIdeaIds.has(idea.id);

          return (
            <article
              key={idea.id}
              role="listitem"
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isSaved
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div>
                {/* Top Badge & Favorite Button */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSaveIdea(idea.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-amber-500 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    aria-label={isSaved ? `Remove ${idea.title} from shortlist` : `Save ${idea.title} to shortlist`}
                  >
                    <Star
                      className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`}
                    />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  {idea.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {idea.description}
                </p>
              </div>

              {/* Bottom Tags & Cost */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {idea.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {idea.estimatedCost !== undefined && idea.estimatedCost > 0 && (
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
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


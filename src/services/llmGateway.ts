/**
 * @fileoverview Abstracted Gemini API client with structured JSON schema enforcement.
 * Provides a unified interface for LLM interactions with automatic fallback
 * to deterministic generation when the API key is unavailable or errors occur.
 */

import { GoogleGenAI } from '@google/genai';
import { env, isLLMAvailable } from '@/config/env';
import type { EventIntake, EventPlan } from '@/schemas/eventSchemas';
import { EVENT_CATEGORY_DEFAULTS } from '@/schemas/eventSchemas';
import {
  calculateBudget,
  centsToDollars,
} from '@/lib/efficiency/budgetCalculator';

/** LLM generation result with metadata */
export interface LLMResult {
  /** Generated event plan */
  plan: EventPlan;
  /** Source of the generation */
  source: 'llm' | 'deterministic';
  /** Model used (or 'deterministic-engine' for fallback) */
  modelUsed: string;
  /** Generation latency in milliseconds */
  latencyMs: number;
}

/** Gemini client singleton (null if no API key) */
let genaiClient: GoogleGenAI | null = null;

/**
 * Initialize the Gemini client if API key is available.
 */
function getClient(): GoogleGenAI | null {
  if (!isLLMAvailable) return null;
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
  }
  return genaiClient;
}

/**
 * Build the system prompt for event planning.
 * @param intake - Validated event intake data
 * @returns System prompt string
 */
function buildPrompt(intake: EventIntake): string {
  return `You are HappyTimes, an expert event planner. Generate a comprehensive event plan for:
Event Type: ${intake.eventType}
Event Name: ${intake.eventName}
Total Budget: $${intake.totalBudget}
Guest Count: ${intake.guestCount}
Event Date: ${intake.eventDate}
Location Style: ${intake.locationStyle}
Theme Keywords: ${intake.themeKeywords.join(', ')}
Dietary Needs: ${intake.dietaryNeeds.join(', ')}
Cultural Considerations: ${intake.culturalConsiderations.join(', ')}
${intake.additionalNotes ? `Additional Notes: ${intake.additionalNotes}` : ''}

Respond with a JSON object containing:
1. "preEventTimeline": Array of milestone objects with {id, title, description, dueDate, daysBeforeEvent, isComplete: false, owner, category}. Generate 8-12 milestones counting backward from the event date.
2. "dayOfSchedule": Array of schedule items with {id, time, endTime, activity, location, owner, notes, bufferMinutes}. Generate a full day timeline.
3. "vendors": Array of vendor items with {id, name, category, priority, isChecked: false, estimatedCost, questionsToAsk: string[], notes, dueDate}.
4. "ideas": Array of idea objects with {id, category, title, description, estimatedCost, tags: string[]}. Include themes, decor, menu, activities, sustainability and inclusivity ideas.

Do NOT include budget calculations - those are computed deterministically.
Use realistic, specific, actionable recommendations tailored to the event details provided.`;
}

/**
 * Generate an event plan using the Gemini API with structured JSON output.
 * @param intake - Validated event intake data
 * @returns LLM generation result
 */
async function generateWithLLM(intake: EventIntake): Promise<LLMResult> {
  const client = getClient();
  if (!client) throw new Error('LLM client not available');

  const startTime = Date.now();
  const prompt = buildPrompt(intake);

  const targetModel = env.GEMINI_MODEL || 'gemini-3.8-flash';
  let response;
  let modelUsed = targetModel;

  try {
    response = await client.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
  } catch (primaryError) {
    console.warn(`[HappyTimes] Primary model ${targetModel} unavailable, falling back to gemini-2.5-flash:`, primaryError);
    modelUsed = 'gemini-2.5-flash';
    response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
  }

  const text = response.text ?? '';
  const parsed = JSON.parse(text);

  // Compute budget deterministically
  const defaults = EVENT_CATEGORY_DEFAULTS[intake.eventType];
  const percentages: Record<string, number> = {};
  for (const cat of defaults) {
    percentages[cat.name] = cat.percentage;
  }
  const budgetResult = calculateBudget(intake.totalBudget, percentages);

  const plan: EventPlan = {
    budget: {
      totalBudget: intake.totalBudget,
      categories: budgetResult.categories.map((c) => ({
        name: c.name,
        estimatedAmount: centsToDollars(c.estimatedCents),
        actualSpent: 0,
        percentage: c.percentage,
        isLocked: false,
        notes: '',
      })),
      contingencyPercent: defaults.find((d) => d.name.includes('Contingency'))?.percentage ?? 10,
    },
    preEventTimeline: (parsed.preEventTimeline ?? []).map((m: Record<string, unknown>, i: number) => ({
      id: String(m.id ?? `milestone-${i + 1}`),
      title: String(m.title ?? ''),
      description: String(m.description ?? ''),
      dueDate: String(m.dueDate ?? ''),
      daysBeforeEvent: Number(m.daysBeforeEvent ?? 0),
      isComplete: false,
      owner: String(m.owner ?? ''),
      category: String(m.category ?? ''),
    })),
    dayOfSchedule: (parsed.dayOfSchedule ?? []).map((s: Record<string, unknown>, i: number) => ({
      id: String(s.id ?? `schedule-${i + 1}`),
      time: String(s.time ?? ''),
      endTime: String(s.endTime ?? ''),
      activity: String(s.activity ?? ''),
      location: String(s.location ?? ''),
      owner: String(s.owner ?? ''),
      notes: String(s.notes ?? ''),
      bufferMinutes: Number(s.bufferMinutes ?? 0),
    })),
    vendors: (parsed.vendors ?? []).map((v: Record<string, unknown>, i: number) => ({
      id: String(v.id ?? `vendor-${i + 1}`),
      name: String(v.name ?? ''),
      category: String(v.category ?? ''),
      priority: (['high', 'medium', 'low'].includes(String(v.priority)) ? String(v.priority) : 'medium') as 'high' | 'medium' | 'low',
      isChecked: false,
      estimatedCost: Number(v.estimatedCost ?? 0),
      questionsToAsk: Array.isArray(v.questionsToAsk) ? (v.questionsToAsk as string[]).map(String) : [],
      notes: String(v.notes ?? ''),
      dueDate: String(v.dueDate ?? ''),
    })),
    ideas: (parsed.ideas ?? []).map((idea: Record<string, unknown>, i: number) => ({
      id: String(idea.id ?? `idea-${i + 1}`),
      category: (['theme', 'decor', 'menu', 'activity', 'sustainability', 'inclusivity'].includes(String(idea.category)) ? String(idea.category) : 'theme') as 'theme' | 'decor' | 'menu' | 'activity' | 'sustainability' | 'inclusivity',
      title: String(idea.title ?? ''),
      description: String(idea.description ?? ''),
      estimatedCost: idea.estimatedCost != null ? Number(idea.estimatedCost) : undefined,
      tags: Array.isArray(idea.tags) ? (idea.tags as string[]).map(String) : [],
    })),
  };

  return {
    plan,
    source: 'llm',
    modelUsed,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Generate a comprehensive event plan using the deterministic smart engine.
 * Produces tailored budgets, timelines, vendor checklists, and ideas
 * based on event type, guest count, budget, and theme keywords.
 * @param intake - Validated event intake data
 * @returns Deterministic generation result
 */
export function generateDeterministic(intake: EventIntake): LLMResult {
  const startTime = Date.now();
  const defaults = EVENT_CATEGORY_DEFAULTS[intake.eventType];

  // --- Budget (deterministic math) ---
  const percentages: Record<string, number> = {};
  for (const cat of defaults) {
    percentages[cat.name] = cat.percentage;
  }
  const budgetResult = calculateBudget(intake.totalBudget, percentages);

  // --- Pre-Event Timeline ---
  const eventDate = new Date(intake.eventDate);
  const milestoneTemplates = getMilestoneTemplates(intake.eventType);
  const preEventTimeline = milestoneTemplates.map((m, i) => {
    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() - m.daysBefore);
    return {
      id: `milestone-${i + 1}`,
      title: m.title,
      description: m.description,
      dueDate: dueDate.toISOString().split('T')[0],
      daysBeforeEvent: m.daysBefore,
      isComplete: false,
      owner: m.owner,
      category: m.category,
    };
  });

  // --- Day-Of Schedule ---
  const dayOfSchedule = getDayOfTemplate(intake.eventType).map((s, i) => ({
    id: `schedule-${i + 1}`,
    ...s,
  }));

  // --- Vendors ---
  const vendors = getVendorTemplates(intake.eventType, intake.totalBudget, intake.guestCount).map(
    (v, i) => ({
      id: `vendor-${i + 1}`,
      ...v,
      isChecked: false,
    })
  );

  // --- Ideas ---
  const ideas = getIdeasForEvent(intake).map((idea, i) => ({
    id: `idea-${i + 1}`,
    ...idea,
  }));

  const plan: EventPlan = {
    budget: {
      totalBudget: intake.totalBudget,
      categories: budgetResult.categories.map((c) => ({
        name: c.name,
        estimatedAmount: centsToDollars(c.estimatedCents),
        actualSpent: 0,
        percentage: c.percentage,
        isLocked: false,
        notes: '',
      })),
      contingencyPercent:
        defaults.find((d) => d.name.includes('Contingency'))?.percentage ?? 10,
    },
    preEventTimeline,
    dayOfSchedule,
    vendors,
    ideas,
  };

  return {
    plan,
    source: 'deterministic',
    modelUsed: 'deterministic-engine-v1',
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Main entry point: attempt LLM generation, fall back to deterministic.
 * @param intake - Validated event intake data
 * @returns Event plan result
 */
export async function generateEventPlan(intake: EventIntake): Promise<LLMResult> {
  if (isLLMAvailable) {
    try {
      return await generateWithLLM(intake);
    } catch (error) {
      console.warn('[HappyTimes] LLM generation failed, falling back to deterministic:', error);
    }
  }
  return generateDeterministic(intake);
}

// ──────────────────────────────────────────────────────
// Deterministic template data (private helpers)
// ──────────────────────────────────────────────────────

function getMilestoneTemplates(eventType: string) {
  const shared = [
    { title: 'Set Budget & Priorities', description: 'Define total budget and rank category priorities', daysBefore: 180, owner: 'Planner', category: 'Planning' },
    { title: 'Book Venue', description: 'Research, visit, and secure venue booking with deposit', daysBefore: 150, owner: 'Planner', category: 'Venue' },
    { title: 'Send Save-the-Dates', description: 'Design and distribute save-the-date notices', daysBefore: 120, owner: 'Planner', category: 'Communications' },
  ];

  const eventSpecific: Record<string, typeof shared> = {
    wedding: [
      ...shared,
      { title: 'Book Photographer & Videographer', description: 'Interview and book photo/video team, review portfolios', daysBefore: 140, owner: 'Couple', category: 'Photography' },
      { title: 'Choose Wedding Party Attire', description: 'Select dresses/suits for wedding party and order with alterations buffer', daysBefore: 120, owner: 'Couple', category: 'Attire' },
      { title: 'Hire Caterer & Plan Menu', description: 'Schedule tastings, finalize menu with dietary accommodations', daysBefore: 100, owner: 'Planner', category: 'Catering' },
      { title: 'Book Officiant', description: 'Secure officiant and discuss ceremony preferences', daysBefore: 100, owner: 'Couple', category: 'Ceremony' },
      { title: 'Send Formal Invitations', description: 'Mail or send digital invitations with RSVP deadline', daysBefore: 60, owner: 'Planner', category: 'Communications' },
      { title: 'Final Venue Walkthrough', description: 'Confirm layout, timeline, vendor access, and emergency plans', daysBefore: 14, owner: 'Planner', category: 'Venue' },
      { title: 'Confirm All Vendor Details', description: 'Final confirmation with every vendor: times, locations, contacts', daysBefore: 7, owner: 'Planner', category: 'Vendors' },
      { title: 'Rehearsal & Rehearsal Dinner', description: 'Run through ceremony and host rehearsal dinner', daysBefore: 1, owner: 'Couple', category: 'Ceremony' },
    ],
    birthday: [
      ...shared.map(s => ({ ...s, daysBefore: Math.min(s.daysBefore, 60) })),
      { title: 'Choose Theme & Color Scheme', description: 'Select party theme, colors, and design direction', daysBefore: 45, owner: 'Host', category: 'Design' },
      { title: 'Book Entertainment', description: 'Hire DJ, band, performers, or plan activities', daysBefore: 30, owner: 'Host', category: 'Entertainment' },
      { title: 'Order Cake & Plan Menu', description: 'Design custom cake and finalize food/drink menu', daysBefore: 21, owner: 'Host', category: 'Food' },
      { title: 'Send Invitations', description: 'Send digital or printed invitations with RSVP info', daysBefore: 21, owner: 'Host', category: 'Communications' },
      { title: 'Purchase Decorations & Favors', description: 'Buy all decorations, party favors, and supplies', daysBefore: 10, owner: 'Host', category: 'Decor' },
      { title: 'Confirm Headcount & Dietary Needs', description: 'Follow up on RSVPs and note any dietary restrictions', daysBefore: 7, owner: 'Host', category: 'Planning' },
      { title: 'Final Setup & Prep', description: 'Prepare venue decorations, playlist, and day-of materials', daysBefore: 1, owner: 'Host', category: 'Setup' },
    ],
    community: [
      ...shared,
      { title: 'Obtain Permits & Insurance', description: 'Apply for event permits, secure liability insurance', daysBefore: 120, owner: 'Organizer', category: 'Legal' },
      { title: 'Recruit Volunteers', description: 'Post volunteer signups and assign roles/shifts', daysBefore: 90, owner: 'Coordinator', category: 'Volunteers' },
      { title: 'Launch Marketing Campaign', description: 'Create flyers, social posts, press releases, and community outreach', daysBefore: 60, owner: 'Marketing Lead', category: 'Marketing' },
      { title: 'Book Vendors & Sponsors', description: 'Confirm food vendors, sponsors, and exhibitors', daysBefore: 45, owner: 'Organizer', category: 'Vendors' },
      { title: 'Arrange AV & Staging', description: 'Book sound system, staging, lighting, and tech requirements', daysBefore: 30, owner: 'Tech Lead', category: 'Production' },
      { title: 'Accessibility & Safety Check', description: 'Verify ADA compliance, sanitation stations, first aid, and emergency plan', daysBefore: 14, owner: 'Safety Officer', category: 'Safety' },
      { title: 'Volunteer Briefing', description: 'Brief all volunteers on roles, schedules, and emergency procedures', daysBefore: 3, owner: 'Coordinator', category: 'Volunteers' },
      { title: 'Final Setup & Walkthrough', description: 'Set up venue, test AV, place signage, and final checks', daysBefore: 1, owner: 'Organizer', category: 'Setup' },
    ],
  };

  return eventSpecific[eventType] ?? eventSpecific.wedding;
}

function getDayOfTemplate(eventType: string) {
  const templates: Record<string, Array<{ time: string; endTime: string; activity: string; location: string; owner: string; notes: string; bufferMinutes: number }>> = {
    wedding: [
      { time: '08:00', endTime: '09:00', activity: 'Vendor Setup & Deliveries', location: 'Venue', owner: 'Coordinator', notes: 'Ensure all vendors have access', bufferMinutes: 15 },
      { time: '09:15', endTime: '10:30', activity: 'Hair & Makeup — Wedding Party', location: 'Bridal Suite', owner: 'Beauty Team', notes: 'Start with bridesmaids, bride last', bufferMinutes: 15 },
      { time: '10:45', endTime: '11:15', activity: 'First Look & Couples Photos', location: 'Garden/Grounds', owner: 'Photographer', notes: 'Have emergency kit nearby', bufferMinutes: 15 },
      { time: '11:30', endTime: '12:00', activity: 'Wedding Party Photos', location: 'Ceremony Area', owner: 'Photographer', notes: 'Group shots by family', bufferMinutes: 15 },
      { time: '12:15', endTime: '12:30', activity: 'Guests Arrive & Seating', location: 'Ceremony Area', owner: 'Ushers', notes: 'Hand out programs', bufferMinutes: 10 },
      { time: '12:40', endTime: '13:15', activity: 'Wedding Ceremony', location: 'Ceremony Area', owner: 'Officiant', notes: 'Coordinate music cues', bufferMinutes: 15 },
      { time: '13:30', endTime: '14:30', activity: 'Cocktail Hour', location: 'Lounge Area', owner: 'Caterer', notes: 'Passed appetizers and drinks', bufferMinutes: 15 },
      { time: '14:45', endTime: '15:15', activity: 'Grand Entrance & First Dance', location: 'Reception Hall', owner: 'DJ/Band', notes: 'Announce couple and wedding party', bufferMinutes: 10 },
      { time: '15:25', endTime: '16:30', activity: 'Dinner Service', location: 'Reception Hall', owner: 'Caterer', notes: 'Serve courses, accommodate dietary needs', bufferMinutes: 10 },
      { time: '16:40', endTime: '17:00', activity: 'Toasts & Speeches', location: 'Reception Hall', owner: 'Best Man/Maid of Honor', notes: 'Limit to 3-5 minutes each', bufferMinutes: 10 },
      { time: '17:10', endTime: '17:30', activity: 'Cake Cutting', location: 'Reception Hall', owner: 'Couple', notes: 'Photo opportunity', bufferMinutes: 10 },
      { time: '17:40', endTime: '19:30', activity: 'Open Dancing & Entertainment', location: 'Dance Floor', owner: 'DJ/Band', notes: 'Include special dances', bufferMinutes: 15 },
      { time: '19:45', endTime: '20:00', activity: 'Last Dance & Send-Off', location: 'Venue Exit', owner: 'Coordinator', notes: 'Distribute sparklers/confetti', bufferMinutes: 15 },
      { time: '20:15', endTime: '21:00', activity: 'Vendor Breakdown & Cleanup', location: 'Venue', owner: 'Coordinator', notes: 'Collect gifts, personal items', bufferMinutes: 0 },
    ],
    birthday: [
      { time: '14:00', endTime: '15:30', activity: 'Venue Setup & Decoration', location: 'Venue', owner: 'Host', notes: 'Balloons, banners, table settings', bufferMinutes: 15 },
      { time: '15:45', endTime: '16:00', activity: 'Final Checks & Music Start', location: 'Venue', owner: 'Host', notes: 'Start playlist, check lighting', bufferMinutes: 10 },
      { time: '16:10', endTime: '16:45', activity: 'Guest Arrival & Welcome Drinks', location: 'Entrance/Bar', owner: 'Host', notes: 'Greet guests, offer drinks', bufferMinutes: 15 },
      { time: '17:00', endTime: '17:45', activity: 'Games & Activities', location: 'Main Area', owner: 'Entertainment', notes: 'Icebreakers and group games', bufferMinutes: 10 },
      { time: '17:55', endTime: '18:45', activity: 'Dinner / Food Service', location: 'Dining Area', owner: 'Caterer/Host', notes: 'Serve main dishes, accommodate diets', bufferMinutes: 10 },
      { time: '18:55', endTime: '19:15', activity: 'Cake Cutting & Birthday Song', location: 'Main Area', owner: 'Host', notes: 'Light candles, photo moment', bufferMinutes: 10 },
      { time: '19:25', endTime: '19:45', activity: 'Gift Opening / Speeches', location: 'Seating Area', owner: 'Guest of Honor', notes: 'Optional — can skip if preferred', bufferMinutes: 10 },
      { time: '19:55', endTime: '21:00', activity: 'Dancing & Free Time', location: 'Dance Area', owner: 'DJ/Host', notes: 'Open dance floor, photo booth', bufferMinutes: 10 },
      { time: '21:10', endTime: '21:30', activity: 'Party Favors & Goodbyes', location: 'Exit', owner: 'Host', notes: 'Distribute favors, thank guests', bufferMinutes: 10 },
      { time: '21:40', endTime: '22:30', activity: 'Cleanup', location: 'Venue', owner: 'Host', notes: 'Pack up decorations and gifts', bufferMinutes: 0 },
    ],
    community: [
      { time: '06:00', endTime: '08:00', activity: 'Venue Setup & Staging', location: 'Event Grounds', owner: 'Setup Crew', notes: 'Tents, stages, vendor booths, signage', bufferMinutes: 15 },
      { time: '08:15', endTime: '08:45', activity: 'Volunteer Check-In & Briefing', location: 'Operations HQ', owner: 'Coordinator', notes: 'Distribute radios, badges, and schedules', bufferMinutes: 15 },
      { time: '09:00', endTime: '09:15', activity: 'Opening Ceremony & Welcome', location: 'Main Stage', owner: 'MC/Organizer', notes: 'Sponsor acknowledgments', bufferMinutes: 10 },
      { time: '09:25', endTime: '11:00', activity: 'Morning Programming Block', location: 'Various Stages', owner: 'Program Director', notes: 'Workshops, demos, performances', bufferMinutes: 15 },
      { time: '11:15', endTime: '12:30', activity: 'Lunch Break & Food Vendors', location: 'Food Court Area', owner: 'Food Coordinator', notes: 'Ensure dietary options available', bufferMinutes: 15 },
      { time: '12:45', endTime: '14:30', activity: 'Afternoon Programming Block', location: 'Various Stages', owner: 'Program Director', notes: 'Main acts, panel discussions', bufferMinutes: 15 },
      { time: '14:45', endTime: '15:30', activity: 'Interactive Activities & Booths', location: 'Activity Zone', owner: 'Activities Lead', notes: 'Art, tech demos, community boards', bufferMinutes: 15 },
      { time: '15:45', endTime: '16:30', activity: 'Headline Performance / Keynote', location: 'Main Stage', owner: 'Program Director', notes: 'Flagship event moment', bufferMinutes: 10 },
      { time: '16:40', endTime: '17:00', activity: 'Closing Remarks & Thank Yous', location: 'Main Stage', owner: 'MC/Organizer', notes: 'Announce next event, thank sponsors', bufferMinutes: 10 },
      { time: '17:10', endTime: '19:00', activity: 'Breakdown & Cleanup', location: 'Event Grounds', owner: 'Cleanup Crew', notes: 'Ensure grounds are cleared per venue contract', bufferMinutes: 0 },
    ],
  };

  return templates[eventType] ?? templates.wedding;
}

function getVendorTemplates(eventType: string, budget: number, guestCount: number) {
  const templates: Record<string, Array<{ name: string; category: string; priority: 'high' | 'medium' | 'low'; estimatedCost: number; questionsToAsk: string[]; notes: string; dueDate: string }>> = {
    wedding: [
      { name: 'Wedding Venue', category: 'Venue/Catering', priority: 'high', estimatedCost: Math.round(budget * 0.3), questionsToAsk: ['What is the maximum capacity?', 'Is there a rain/weather backup plan?', 'What is included in the rental fee?', 'What are the setup/breakdown time windows?', 'Do you have preferred vendor lists?'], notes: 'Book 12-18 months in advance', dueDate: '' },
      { name: 'Wedding Caterer', category: 'Venue/Catering', priority: 'high', estimatedCost: Math.round(budget * 0.1 * guestCount / 100), questionsToAsk: ['Do you offer tastings before booking?', 'How do you handle dietary restrictions?', 'What is the price per head?', 'Do you provide staff for service?'], notes: `Estimate $${Math.round(budget * 0.1 / guestCount)} per guest`, dueDate: '' },
      { name: 'Photographer', category: 'Photography/Videography', priority: 'high', estimatedCost: Math.round(budget * 0.08), questionsToAsk: ['How many hours of coverage?', 'Do you offer engagement sessions?', 'What is the delivery timeline?', 'Can we see a full wedding gallery?'], notes: 'Review portfolio style match', dueDate: '' },
      { name: 'Videographer', category: 'Photography/Videography', priority: 'medium', estimatedCost: Math.round(budget * 0.04), questionsToAsk: ['Do you provide a highlight reel?', 'How long is the full edit?', 'Do you use drones?'], notes: 'Optional but recommended', dueDate: '' },
      { name: 'Florist', category: 'Florals/Decor', priority: 'medium', estimatedCost: Math.round(budget * 0.08), questionsToAsk: ['Can you work within our color palette?', 'Do you offer setup and breakdown?', 'What seasonal flowers do you recommend?'], notes: 'Share Pinterest board for inspiration', dueDate: '' },
      { name: 'DJ / Band', category: 'Entertainment', priority: 'medium', estimatedCost: Math.round(budget * 0.06), questionsToAsk: ['Can we provide a must-play and do-not-play list?', 'Do you MC as well?', 'What equipment do you bring?'], notes: 'Confirm sound system compatibility with venue', dueDate: '' },
      { name: 'Officiant', category: 'Officiant/Licenses', priority: 'high', estimatedCost: Math.round(budget * 0.01), questionsToAsk: ['Are you ordained/licensed in our state?', 'Can we customize the ceremony script?', 'Do you attend the rehearsal?'], notes: 'Verify legal requirements', dueDate: '' },
      { name: 'Hair & Makeup Artist', category: 'Attire/Beauty', priority: 'medium', estimatedCost: Math.round(budget * 0.03), questionsToAsk: ['Do you offer trials?', 'How many people can you service?', 'Do you travel to the venue?'], notes: 'Book trial 2 months before', dueDate: '' },
    ],
    birthday: [
      { name: 'Party Venue', category: 'Venue/Rentals', priority: 'high', estimatedCost: Math.round(budget * 0.25), questionsToAsk: ['What is the rental duration?', 'Are tables and chairs included?', 'Is there a kitchen for food prep?', 'What is the cancellation policy?'], notes: 'Consider home venue to save costs', dueDate: '' },
      { name: 'Caterer / Food Service', category: 'Food/Cake/Beverages', priority: 'high', estimatedCost: Math.round(budget * 0.2), questionsToAsk: ['What is the minimum order?', 'Do you accommodate allergies?', 'Is serving equipment included?'], notes: `Budget ~$${Math.round(budget * 0.2 / guestCount)} per guest`, dueDate: '' },
      { name: 'Custom Cake Baker', category: 'Food/Cake/Beverages', priority: 'medium', estimatedCost: Math.round(budget * 0.08), questionsToAsk: ['Can you match our theme?', 'What flavors do you offer?', 'When is the latest you need the final design?'], notes: 'Order 2-3 weeks in advance', dueDate: '' },
      { name: 'Entertainment / DJ', category: 'Entertainment/Activities', priority: 'medium', estimatedCost: Math.round(budget * 0.12), questionsToAsk: ['What is included in your package?', 'Can you bring party games?', 'Do you have experience with this age group?'], notes: 'Match entertainment to guest demographics', dueDate: '' },
      { name: 'Decoration Supplier', category: 'Decor/Party Favors', priority: 'low', estimatedCost: Math.round(budget * 0.08), questionsToAsk: ['Do you offer setup services?', 'Can we customize colors and themes?', 'What is the return policy?'], notes: 'Consider DIY to save budget', dueDate: '' },
      { name: 'Party Favor Supplier', category: 'Decor/Party Favors', priority: 'low', estimatedCost: Math.round(budget * 0.02), questionsToAsk: ['What is the minimum order quantity?', 'Can favors be personalized?'], notes: `Need ${guestCount} favors`, dueDate: '' },
    ],
    community: [
      { name: 'Venue / Grounds', category: 'Venue/Staging/AV', priority: 'high', estimatedCost: Math.round(budget * 0.15), questionsToAsk: ['What permits are required?', 'Is there power/water access?', 'What is the maximum occupancy?', 'Is there parking available?'], notes: 'Verify ADA accessibility', dueDate: '' },
      { name: 'Sound & AV Company', category: 'Venue/Staging/AV', priority: 'high', estimatedCost: Math.round(budget * 0.1), questionsToAsk: ['Is a tech operator included?', 'What is the speaker wattage?', 'Do you provide projectors and screens?'], notes: 'Test equipment day before event', dueDate: '' },
      { name: 'Insurance Provider', category: 'Permits/Insurance/Security', priority: 'high', estimatedCost: Math.round(budget * 0.05), questionsToAsk: ['What does the general liability cover?', 'Do you cover weather cancellations?', 'Is vendor insurance separate?'], notes: 'Required by most public venues', dueDate: '' },
      { name: 'Security Service', category: 'Permits/Insurance/Security', priority: 'medium', estimatedCost: Math.round(budget * 0.05), questionsToAsk: ['How many officers for our crowd size?', 'What are the shift hours?', 'Do officers have first aid training?'], notes: `Recommend 1 guard per ${Math.min(100, guestCount)} attendees`, dueDate: '' },
      { name: 'Food Trucks / Caterers', category: 'Food/Refreshments', priority: 'medium', estimatedCost: Math.round(budget * 0.15), questionsToAsk: ['What are your menu options?', 'Do you carry your own permits?', 'Can you accommodate dietary needs?'], notes: 'Aim for variety of options', dueDate: '' },
      { name: 'Marketing / Print Shop', category: 'Marketing/Outreach', priority: 'medium', estimatedCost: Math.round(budget * 0.05), questionsToAsk: ['What is the turnaround time?', 'Do you handle social media graphics too?', 'Can you print banners and signage?'], notes: 'Start marketing 8 weeks before', dueDate: '' },
      { name: 'Portable Restrooms', category: 'Accessibility/Sanitation', priority: 'medium', estimatedCost: Math.round(budget * 0.04), questionsToAsk: ['Are ADA-compliant units available?', 'What is the delivery/pickup schedule?', 'Do you service during the event?'], notes: `1 unit per 50 guests = ${Math.ceil(guestCount / 50)} units`, dueDate: '' },
    ],
  };

  return templates[eventType] ?? templates.wedding;
}

function getIdeasForEvent(intake: EventIntake) {
  const themeIdeas = getThemeIdeas(intake);
  const decorIdeas = getDecorIdeas(intake);
  const menuIdeas = getMenuIdeas(intake);
  const activityIdeas = getActivityIdeas(intake);
  const sustainabilityIdeas = getSustainabilityIdeas();
  const inclusivityIdeas = getInclusivityIdeas(intake);
  return [...themeIdeas, ...decorIdeas, ...menuIdeas, ...activityIdeas, ...sustainabilityIdeas, ...inclusivityIdeas];
}

function getThemeIdeas(intake: EventIntake) {
  const keywords = intake.themeKeywords.map((k) => k.toLowerCase());
  const ideas: Array<{ category: 'theme'; title: string; description: string; estimatedCost?: number; tags: string[] }> = [];

  if (intake.eventType === 'wedding') {
    ideas.push(
      { category: 'theme', title: 'Elegant Garden Romance', description: 'Lush greenery with soft pastels, fairy lights, and natural textures. Perfect for outdoor or greenhouse venues.', estimatedCost: Math.round(intake.totalBudget * 0.02), tags: ['romantic', 'outdoor', 'garden'] },
      { category: 'theme', title: 'Modern Minimalist Chic', description: 'Clean lines, monochromatic palette, geometric accents. Sleek and sophisticated.', estimatedCost: Math.round(intake.totalBudget * 0.015), tags: ['modern', 'minimal', 'elegant'] },
      { category: 'theme', title: 'Rustic Countryside Charm', description: 'Barn wood, mason jars, wildflowers, and burlap. Warm and inviting.', estimatedCost: Math.round(intake.totalBudget * 0.018), tags: ['rustic', 'country', 'warm'] }
    );
  } else if (intake.eventType === 'birthday') {
    ideas.push(
      { category: 'theme', title: 'Neon Glow Party', description: 'UV lights, neon decorations, glow sticks, and fluorescent face paint. High energy and photogenic.', estimatedCost: Math.round(intake.totalBudget * 0.05), tags: ['neon', 'party', 'fun'] },
      { category: 'theme', title: 'Decades Throwback', description: 'Pick a decade (70s disco, 80s neon, 90s hip-hop) for costumes, music, and decor.', estimatedCost: Math.round(intake.totalBudget * 0.04), tags: ['retro', 'costumes', 'music'] },
      { category: 'theme', title: 'Enchanted Garden Party', description: 'Fairy wings, floral crowns, toadstools, and twinkling lights. Magical and whimsical.', estimatedCost: Math.round(intake.totalBudget * 0.04), tags: ['garden', 'magical', 'whimsical'] }
    );
  } else {
    ideas.push(
      { category: 'theme', title: 'Community Arts Festival', description: 'Local artists, live murals, craft stations, and gallery walks. Celebrates local creativity.', estimatedCost: Math.round(intake.totalBudget * 0.03), tags: ['art', 'community', 'creative'] },
      { category: 'theme', title: 'Tech & Innovation Expo', description: 'Demo booths, coding workshops, robotics displays, and startup pitches.', estimatedCost: Math.round(intake.totalBudget * 0.04), tags: ['tech', 'innovation', 'education'] },
      { category: 'theme', title: 'Cultural Heritage Celebration', description: 'Traditional foods, music, dance, and craft demonstrations from diverse cultures.', estimatedCost: Math.round(intake.totalBudget * 0.03), tags: ['cultural', 'heritage', 'diversity'] }
    );
  }

  // Add keyword-specific ideas
  if (keywords.some((k) => ['rustic', 'barn', 'country', 'autumn', 'fall'].includes(k))) {
    ideas.push({ category: 'theme', title: 'Autumn Harvest Experience', description: 'Pumpkins, warm amber tones, plaid accents, cider bar, and hayrides.', estimatedCost: Math.round(intake.totalBudget * 0.02), tags: ['autumn', 'rustic', 'harvest'] });
  }
  if (keywords.some((k) => ['tropical', 'beach', 'summer', 'island'].includes(k))) {
    ideas.push({ category: 'theme', title: 'Tropical Paradise Vibes', description: 'Palm leaves, exotic flowers, tiki bar, and island-inspired menu.', estimatedCost: Math.round(intake.totalBudget * 0.025), tags: ['tropical', 'beach', 'summer'] });
  }

  return ideas;
}

function getDecorIdeas(intake: EventIntake) {
  return [
    { category: 'decor' as const, title: 'Statement Centerpieces', description: `Unique centerpieces that double as conversation starters. Mix heights and textures for visual interest.`, estimatedCost: Math.round(intake.totalBudget * 0.02), tags: ['centerpieces', 'table', 'floral'] },
    { category: 'decor' as const, title: 'Photo Display Wall', description: 'Create a photo wall with fairy lights, polaroids, and custom frames showcasing memories.', estimatedCost: Math.round(intake.totalBudget * 0.005), tags: ['photos', 'memories', 'display'] },
    { category: 'decor' as const, title: 'Ambient Lighting Design', description: 'String lights, uplighting, candles, and lanterns to create magical atmosphere.', estimatedCost: Math.round(intake.totalBudget * 0.015), tags: ['lighting', 'ambiance', 'atmosphere'] },
  ];
}

function getMenuIdeas(intake: EventIntake) {
  const ideas = [
    { category: 'menu' as const, title: 'Interactive Food Station', description: 'Build-your-own taco, pasta, or poke bowl stations for guest engagement.', estimatedCost: Math.round(intake.totalBudget * 0.05), tags: ['interactive', 'food', 'station'] },
    { category: 'menu' as const, title: 'Signature Cocktail & Mocktail Bar', description: `Custom drinks named for the occasion. Include non-alcoholic options.`, estimatedCost: Math.round(intake.totalBudget * 0.02), tags: ['drinks', 'cocktail', 'bar'] },
  ];

  if (intake.dietaryNeeds.length > 0) {
    ideas.push({ category: 'menu' as const, title: 'Inclusive Menu Planning', description: `Dedicated menu options for: ${intake.dietaryNeeds.join(', ')}. Clearly label all items with allergen info.`, estimatedCost: 0, tags: ['dietary', 'inclusive', 'allergen-free'] });
  }

  return ideas;
}

function getActivityIdeas(intake: EventIntake) {
  if (intake.eventType === 'wedding') {
    return [
      { category: 'activity' as const, title: 'Photo Booth with Props', description: 'Set up a themed photo booth with fun props and instant prints.', estimatedCost: Math.round(intake.totalBudget * 0.015), tags: ['photo', 'fun', 'interactive'] },
      { category: 'activity' as const, title: 'Live Music During Cocktail Hour', description: 'Acoustic guitarist or jazz trio for elegant ambiance.', estimatedCost: Math.round(intake.totalBudget * 0.02), tags: ['music', 'live', 'cocktail'] },
    ];
  } else if (intake.eventType === 'birthday') {
    return [
      { category: 'activity' as const, title: 'Trivia Game About the Guest of Honor', description: 'Fun trivia questions about the birthday person with small prizes.', estimatedCost: Math.round(intake.totalBudget * 0.005), tags: ['game', 'trivia', 'fun'] },
      { category: 'activity' as const, title: 'DIY Craft Station', description: 'Set up a creative station where guests can make keepsakes.', estimatedCost: Math.round(intake.totalBudget * 0.01), tags: ['craft', 'creative', 'diy'] },
    ];
  } else {
    return [
      { category: 'activity' as const, title: 'Community Mural Project', description: 'Collaborative art piece that attendees contribute to throughout the event.', estimatedCost: Math.round(intake.totalBudget * 0.01), tags: ['art', 'community', 'collaborative'] },
      { category: 'activity' as const, title: 'Panel Discussion or Workshop', description: 'Educational sessions with local experts on topics relevant to the community.', estimatedCost: Math.round(intake.totalBudget * 0.005), tags: ['education', 'workshop', 'panel'] },
    ];
  }
}

function getSustainabilityIdeas() {
  return [
    { category: 'sustainability' as const, title: 'Zero-Waste Catering', description: 'Use compostable servingware, minimize food waste with accurate headcount planning, and donate leftovers.', tags: ['eco', 'zero-waste', 'green'] },
    { category: 'sustainability' as const, title: 'Digital Invitations & Programs', description: 'Eliminate paper waste with beautiful digital invites and QR-code event programs.', tags: ['digital', 'paperless', 'eco'] },
    { category: 'sustainability' as const, title: 'Local & Seasonal Sourcing', description: 'Source flowers, food, and materials locally to reduce carbon footprint and support community businesses.', tags: ['local', 'seasonal', 'sustainable'] },
  ];
}

function getInclusivityIdeas(intake: EventIntake) {
  const ideas = [
    { category: 'inclusivity' as const, title: 'Accessible Venue Design', description: 'Ensure wheelchair access, clear signage, sensory-friendly quiet zone, and accessible restrooms.', tags: ['accessible', 'ada', 'inclusive'] },
    { category: 'inclusivity' as const, title: 'Multilingual Signage & Programs', description: 'Provide event materials in multiple languages reflecting your guest demographics.', tags: ['multilingual', 'diverse', 'welcoming'] },
  ];

  if (intake.culturalConsiderations.length > 0) {
    ideas.push({ category: 'inclusivity' as const, title: 'Cultural Sensitivity Planning', description: `Special considerations for: ${intake.culturalConsiderations.join(', ')}. Ensure respectful representation and accommodation.`, tags: ['cultural', 'respect', 'accommodation'] });
  }

  return ideas;
}

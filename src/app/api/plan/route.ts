/**
 * @fileoverview API Route for event planning assistant.
 * Handles POST requests, runs full security and efficiency orchestration,
 * and returns the generated event plan with telemetry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { planEvent } from '@/services/eventPlannerService';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Extract client IP or session for token-bucket rate limiting
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'client-local';

    const result = await planEvent(rawBody, clientIp);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate event plan',
          telemetry: result.telemetry,
        },
        { status: result.error?.includes('Rate limit') ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: result.plan,
      telemetry: result.telemetry,
    });
  } catch (error) {
    console.error('[API /api/plan] Unhandled error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}


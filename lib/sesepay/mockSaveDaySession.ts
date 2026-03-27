import type { SesePayCompletedSegment } from './segmentTypes';

/** Swap this for a Supabase-backed implementation later; same payload shape is intentional. */
export type SaveSesePayDaySessionResult =
  | { ok: true }
  | { ok: false; message: string };

export interface SaveSesePayDaySessionPayload {
  dateLabel: string;
  segments: SesePayCompletedSegment[];
  completedDurationMs: number;
  completedPayCents: number;
}

/** Set to `true` locally to exercise the error UI without changing call sites. */
const FORCE_MOCK_SAVE_FAILURE = false;

const MOCK_LATENCY_MS = 900;

/**
 * Temporary mock persistence for Module 5. Replace with real `saveSesePayDaySession`
 * (e.g. API route + Supabase) while keeping `SaveSesePayDaySessionPayload` stable.
 */
export async function mockSaveSesePayDaySession(
  payload: SaveSesePayDaySessionPayload
): Promise<SaveSesePayDaySessionResult> {
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));

  if (FORCE_MOCK_SAVE_FAILURE) {
    return { ok: false, message: 'Mock save failed. Try again.' };
  }

  if (payload.segments.length === 0) {
    return { ok: false, message: 'Nothing to save.' };
  }

  return { ok: true };
}

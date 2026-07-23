/**
 * Module 7 — End Day: insert completed segments into Supabase `sesepay` (one row per segment).
 *
 * Save path: `sesepaySupabaseClient.supabaseSesepayAnon` → `.from('sesepay').insert(...)` only.
 * Does not use `/api/visitor/init` or `lib/supabaseClient.ts`.
 *
 * Debug: search for `[sesepay/end-day]` in the console; Network → filter `rest/v1/sesepay`.
 */

import { supabaseSesepayAnon } from './sesepaySupabaseClient';
import type { SesePayCompletedSegment } from './segmentTypes';

/** Hardcoded per product requirements (no UI / auth in this module). */
export const SESEPAY_WORKER_NAME = 'Sese' as const;

export type SaveSesePayDaySessionResult =
  | { ok: true }
  | { ok: false; message: string };

export interface SaveSesePayEndDayInput {
  segments: SesePayCompletedSegment[];
  /** Local calendar date for `session_date` (YYYY-MM-DD). */
  sessionDate: string;
}

function newDaySessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `day-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Persists all segments for one “End Day” action. Rows share the same `day_session_id`.
 * Does not set `paid` — rely on DB default.
 */
export async function saveSesePayEndDayToSupabase(
  input: SaveSesePayEndDayInput
): Promise<SaveSesePayDaySessionResult> {
  if (input.segments.length === 0) {
    return { ok: false, message: 'Nothing to save.' };
  }

  const daySessionId = newDaySessionId();

  const rows = input.segments.map((seg) => ({
    worker_name: SESEPAY_WORKER_NAME,
    session_date: input.sessionDate,
    day_session_id: daySessionId,
    job_id: seg.jobId,
    job_label: seg.jobLabel,
    hourly_rate_cents: seg.hourlyRateCents,
    started_at: new Date(seg.startedAtMs).toISOString(),
    ended_at: new Date(seg.endedAtMs).toISOString(),
    duration_ms: seg.durationMs,
    pay_cents: seg.payCents,
  }));

  console.info('[sesepay/end-day] save path', {
    client: 'lib/sesepay/sesepaySupabaseClient.ts → supabaseSesepayAnon',
    table: 'sesepay',
    rowCount: rows.length,
    day_session_id: daySessionId,
    session_date: input.sessionDate,
    completedSegmentsPreview: input.segments.map((s) => ({
      jobId: s.jobId,
      duration_ms: s.durationMs,
      pay_cents: s.payCents,
    })),
  });

  try {
    // No trailing .select() — some RLS policies allow insert but not read-back.
    const { error } = await supabaseSesepayAnon.from('sesepay').insert(rows);

    if (error) {
      console.error('[sesepay/end-day] Supabase insert error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        ok: false,
        message: error.message || 'Could not save your day. Try again.',
      };
    }

    console.info('[sesepay/end-day] insert ok', { insertedRowCount: rows.length });
    return { ok: true };
  } catch (e) {
    console.error('[sesepay/end-day] insert threw (network or runtime)', e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Could not save your day. Try again.',
    };
  }
}

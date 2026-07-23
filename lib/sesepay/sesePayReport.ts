/**
 * Module 9 — Read-only reporting: fetch `sesepay` rows for the hardcoded worker in a date range.
 * Uses the same isolated anon client as End Day save (`sesepaySupabaseClient`).
 */

import { SESEPAY_WORKER_NAME } from './saveDaySessionToSupabase';
import { supabaseSesepayAnon } from './sesepaySupabaseClient';

export interface SesePayReportRow {
  /** Stable list key (DB `id` when present, else derived). */
  rowKey: string;
  session_date: string;
  job_id: string;
  job_label: string;
  duration_ms: number;
  pay_cents: number;
  paid: boolean | null;
  started_at: string;
}

export type FetchSesePayReportResult =
  | { ok: true; rows: SesePayReportRow[] }
  | { ok: false; message: string };

export interface SesePayReportSummary {
  totalEarnedCents: number;
  totalPaidCents: number;
  totalUnpaidCents: number;
  byJob: { jobLabel: string; payCents: number }[];
}

function isPaid(row: SesePayReportRow): boolean {
  return row.paid === true;
}

export function computeSesePayReportSummary(rows: SesePayReportRow[]): SesePayReportSummary {
  let totalEarnedCents = 0;
  let totalPaidCents = 0;
  let totalUnpaidCents = 0;
  const jobMap = new Map<string, number>();

  for (const r of rows) {
    const p = Number.isFinite(r.pay_cents) ? Math.trunc(r.pay_cents) : 0;
    totalEarnedCents += p;
    if (isPaid(r)) {
      totalPaidCents += p;
    } else {
      totalUnpaidCents += p;
    }
    const label = r.job_label || r.job_id;
    jobMap.set(label, (jobMap.get(label) ?? 0) + p);
  }

  const byJob = [...jobMap.entries()]
    .map(([jobLabel, payCents]) => ({ jobLabel, payCents }))
    .sort((a, b) => b.payCents - a.payCents);

  return {
    totalEarnedCents,
    totalPaidCents,
    totalUnpaidCents,
    byJob,
  };
}

/**
 * Inclusive range on `session_date` (YYYY-MM-DD).
 */
export async function fetchSesePayReportRows(
  rangeStart: string,
  rangeEnd: string
): Promise<FetchSesePayReportResult> {
  if (!rangeStart || !rangeEnd) {
    return { ok: false, message: 'Choose a start and end date.' };
  }
  if (rangeStart > rangeEnd) {
    return { ok: false, message: 'Start date must be on or before end date.' };
  }

  const { data, error } = await supabaseSesepayAnon
    .from('sesepay')
    .select('session_date,job_id,job_label,duration_ms,pay_cents,paid,started_at')
    .eq('worker_name', SESEPAY_WORKER_NAME)
    .gte('session_date', rangeStart)
    .lte('session_date', rangeEnd)
    .order('session_date', { ascending: true })
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[sesepay/report] fetch failed', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return { ok: false, message: error.message || 'Could not load report.' };
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: SesePayReportRow[] = raw.map((r, i) => {
    const session_date = String(r.session_date ?? '');
    const started_at = String(r.started_at ?? '');
    const job_id = String(r.job_id ?? '');
    return {
      rowKey: `${session_date}|${started_at}|${job_id}|${i}`,
      session_date,
      job_id,
      job_label: String(r.job_label ?? ''),
      duration_ms: Math.trunc(Number(r.duration_ms) || 0),
      pay_cents: Math.trunc(Number(r.pay_cents) || 0),
      paid: r.paid === true ? true : r.paid === false ? false : null,
      started_at,
    };
  });

  return { ok: true, rows };
}

import type { SesePayJobId } from './jobConfig';
import { SESE_PAY_JOBS } from './jobConfig';
import type { SesePayCompletedSegment } from './segmentTypes';
import type { SesePayTimerHydration } from './useSesePayTimer';

const STORAGE_KEY = 'sesepay-day-session-v1';

export interface SesepayPersistedV1 {
  version: 1;
  /** Local calendar day (YYYY-MM-DD) — session is discarded if it does not match today. */
  dateKey: string;
  selectedJobId: SesePayJobId | null;
  completedSegments: SesePayCompletedSegment[];
  timer: SesePayTimerHydration;
}

export function getSesepayLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidJobId(id: unknown): id is SesePayJobId {
  return typeof id === 'string' && SESE_PAY_JOBS.some((j) => j.id === id);
}

function sanitizeTimer(raw: unknown): SesePayTimerHydration {
  const idle: SesePayTimerHydration = {
    status: 'idle',
    accumulatedMs: 0,
    segmentStartMs: null,
    activeSegment: null,
  };
  if (!raw || typeof raw !== 'object') return idle;
  const t = raw as Record<string, unknown>;
  const status = t.status;
  const accumulatedMs = Number(t.accumulatedMs);
  const segmentStartMs = t.segmentStartMs == null ? null : Number(t.segmentStartMs);
  const active = t.activeSegment;

  if (status !== 'idle' && status !== 'running' && status !== 'paused') return idle;
  if (!Number.isFinite(accumulatedMs) || accumulatedMs < 0) return idle;

  let activeSegment: SesePayTimerHydration['activeSegment'] = null;
  if (active && typeof active === 'object') {
    const a = active as Record<string, unknown>;
    const jobId = a.jobId;
    const jobLabel = a.jobLabel;
    const hourlyRateCents = Number(a.hourlyRateCents);
    const startedAtMs = Number(a.startedAtMs);
    if (
      isValidJobId(jobId) &&
      typeof jobLabel === 'string' &&
      Number.isFinite(hourlyRateCents) &&
      hourlyRateCents >= 0 &&
      Number.isFinite(startedAtMs)
    ) {
      activeSegment = {
        jobId,
        jobLabel,
        hourlyRateCents: Math.trunc(hourlyRateCents),
        startedAtMs: Math.trunc(startedAtMs),
      };
    }
  }

  if (status === 'idle') {
    return idle;
  }

  if (!activeSegment) return idle;

  if (status === 'running') {
    if (segmentStartMs == null || !Number.isFinite(segmentStartMs)) return idle;
    return {
      status: 'running',
      accumulatedMs: Math.trunc(accumulatedMs),
      segmentStartMs: Math.trunc(segmentStartMs),
      activeSegment,
    };
  }

  // paused — must not have a live running-interval start timestamp
  if (segmentStartMs != null) return idle;
  return {
    status: 'paused',
    accumulatedMs: Math.trunc(accumulatedMs),
    segmentStartMs: null,
    activeSegment,
  };
}

export function loadSesepayPersistedSession(): SesepayPersistedV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (o.version !== 1) return null;
    const dateKey = o.dateKey;
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

    const today = getSesepayLocalDateKey();
    if (dateKey !== today) return null;

    let selectedJobId: SesePayJobId | null = null;
    if (o.selectedJobId == null) {
      selectedJobId = null;
    } else if (isValidJobId(o.selectedJobId)) {
      selectedJobId = o.selectedJobId;
    }

    const segs = o.completedSegments;
    const completedSegments: SesePayCompletedSegment[] = Array.isArray(segs)
      ? segs.map(normalizeSegment).filter((s): s is SesePayCompletedSegment => s !== null)
      : [];

    const timer = sanitizeTimer(o.timer);

    return {
      version: 1,
      dateKey,
      selectedJobId,
      completedSegments,
      timer,
    };
  } catch {
    return null;
  }
}

function isValidSegment(x: unknown): x is SesePayCompletedSegment {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    isValidJobId(s.jobId) &&
    typeof s.jobLabel === 'string' &&
    Number.isFinite(Number(s.hourlyRateCents)) &&
    Number.isFinite(Number(s.startedAtMs)) &&
    Number.isFinite(Number(s.endedAtMs)) &&
    Number.isFinite(Number(s.durationMs)) &&
    Number.isFinite(Number(s.payCents))
  );
}

function normalizeSegment(x: unknown): SesePayCompletedSegment | null {
  if (!isValidSegment(x)) return null;
  const s = x as unknown as Record<string, unknown>;
  return {
    id: String(s.id),
    jobId: s.jobId as SesePayJobId,
    jobLabel: String(s.jobLabel),
    hourlyRateCents: Math.trunc(Number(s.hourlyRateCents)),
    startedAtMs: Math.trunc(Number(s.startedAtMs)),
    endedAtMs: Math.trunc(Number(s.endedAtMs)),
    durationMs: Math.trunc(Number(s.durationMs)),
    payCents: Math.trunc(Number(s.payCents)),
  };
}

export function saveSesepayPersistedSession(data: SesepayPersistedV1): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSesepayPersistedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

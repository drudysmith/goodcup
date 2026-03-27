import { useEffect, useMemo, useRef, useState } from 'react';
import type { SesePayJobId } from './jobConfig';
import type { SesePayCompletedSegment } from './segmentTypes';

export type SesePayTimerStatus = 'idle' | 'running' | 'paused';

export interface ActiveSegmentSnapshot {
  jobId: SesePayJobId;
  jobLabel: string;
  hourlyRateCents: number;
  startedAtMs: number;
}

/** Serializable timer state for localStorage hydration (uses wall-clock ms, not tick counters). */
export interface SesePayTimerHydration {
  status: SesePayTimerStatus;
  accumulatedMs: number;
  /** Start of the current running interval; `null` while paused. */
  segmentStartMs: number | null;
  activeSegment: ActiveSegmentSnapshot | null;
}

function clampNonNegativeMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return ms < 0 ? 0 : ms;
}

export function formatElapsedHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatMoneyDollarsFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function payCentsFromMs(hourlyRateCents: number, elapsedMs: number): number {
  const rate = Math.max(0, Math.trunc(hourlyRateCents));
  const ms = clampNonNegativeMs(elapsedMs);
  // cents = floor(rateCentsPerHour * elapsedMs / 3,600,000)
  // Integer cents only (no floating-dollar accumulation).
  return Math.floor((rate * ms) / 3_600_000);
}

export interface UseSesePayTimerArgs {
  hourlyRateCents: number;
  /** Job chosen when Start is pressed; used to build the finalized segment on Stop. */
  selectedJob: { id: SesePayJobId; label: string; hourlyRateCents: number } | null;
  onSegmentComplete?: (segment: SesePayCompletedSegment) => void;
  /** Restored from localStorage on first paint of the session UI only. */
  initialHydration?: SesePayTimerHydration | null;
}

export interface UseSesePayTimerResult {
  status: SesePayTimerStatus;
  isActiveSegment: boolean;
  elapsedMs: number;
  elapsedSeconds: number;
  payCents: number;
  /** Snapshot for persisting wall-clock-based recovery fields. */
  persistSnapshot: SesePayTimerHydration;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function newSegmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeInitialHydration(
  h: SesePayTimerHydration | null | undefined
): SesePayTimerHydration {
  const idle: SesePayTimerHydration = {
    status: 'idle',
    accumulatedMs: 0,
    segmentStartMs: null,
    activeSegment: null,
  };
  if (!h) return idle;
  if (h.status === 'idle') return idle;
  if (!h.activeSegment) return idle;
  if (h.status === 'running') {
    if (h.segmentStartMs == null || !Number.isFinite(h.segmentStartMs)) return idle;
    return {
      status: 'running',
      accumulatedMs: Math.max(0, Math.trunc(h.accumulatedMs)),
      segmentStartMs: Math.trunc(h.segmentStartMs),
      activeSegment: h.activeSegment,
    };
  }
  if (h.status === 'paused') {
    if (h.segmentStartMs != null) return idle;
    return {
      status: 'paused',
      accumulatedMs: Math.max(0, Math.trunc(h.accumulatedMs)),
      segmentStartMs: null,
      activeSegment: h.activeSegment,
    };
  }
  return idle;
}

export function useSesePayTimer({
  hourlyRateCents,
  selectedJob,
  onSegmentComplete,
  initialHydration,
}: UseSesePayTimerArgs): UseSesePayTimerResult {
  const normalized = normalizeInitialHydration(initialHydration ?? null);
  const [status, setStatus] = useState<SesePayTimerStatus>(() => normalized.status);
  const [segmentStartMs, setSegmentStartMs] = useState<number | null>(() =>
    normalized.segmentStartMs
  );
  const [accumulatedMs, setAccumulatedMs] = useState(() => normalized.accumulatedMs);
  const [tick, setTick] = useState(0);
  const activeSegmentRef = useRef<ActiveSegmentSnapshot | null>(normalized.activeSegment);
  const onSegmentCompleteRef = useRef(onSegmentComplete);
  onSegmentCompleteRef.current = onSegmentComplete;

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const elapsedMs = useMemo(() => {
    const base = accumulatedMs;
    if (status !== 'running' || segmentStartMs === null) return clampNonNegativeMs(base);
    return clampNonNegativeMs(base + (Date.now() - segmentStartMs));
    // tick is only used to re-render once/second while running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accumulatedMs, segmentStartMs, status, tick]);

  const elapsedSeconds = useMemo(() => Math.floor(elapsedMs / 1000), [elapsedMs]);
  const payCents = useMemo(() => {
    const rate = activeSegmentRef.current?.hourlyRateCents ?? hourlyRateCents;
    return payCentsFromMs(rate, elapsedMs);
  }, [hourlyRateCents, elapsedMs, status, tick]);

  const persistSnapshot = useMemo((): SesePayTimerHydration => {
    return {
      status,
      accumulatedMs,
      segmentStartMs,
      activeSegment: activeSegmentRef.current,
    };
  }, [status, accumulatedMs, segmentStartMs, tick]);

  const start = () => {
    if (status !== 'idle') return;
    if (!selectedJob) return;
    const startedAtMs = Date.now();
    activeSegmentRef.current = {
      jobId: selectedJob.id,
      jobLabel: selectedJob.label,
      hourlyRateCents: selectedJob.hourlyRateCents,
      startedAtMs,
    };
    setAccumulatedMs(0);
    setSegmentStartMs(startedAtMs);
    setStatus('running');
  };

  const pause = () => {
    if (status !== 'running' || segmentStartMs === null) return;
    setAccumulatedMs((prev) => clampNonNegativeMs(prev + (Date.now() - segmentStartMs)));
    setSegmentStartMs(null);
    setStatus('paused');
  };

  const resume = () => {
    if (status !== 'paused') return;
    setSegmentStartMs(Date.now());
    setStatus('running');
  };

  const stop = () => {
    if (status === 'idle') return;
    let finalMs = accumulatedMs;
    if (status === 'running' && segmentStartMs !== null) {
      finalMs = clampNonNegativeMs(accumulatedMs + (Date.now() - segmentStartMs));
    }
    const snap = activeSegmentRef.current;
    const endedAtMs = Date.now();
    activeSegmentRef.current = null;
    setAccumulatedMs(0);
    setSegmentStartMs(null);
    setStatus('idle');

    if (snap) {
      const payCents = payCentsFromMs(snap.hourlyRateCents, finalMs);
      const segment: SesePayCompletedSegment = {
        id: newSegmentId(),
        jobId: snap.jobId,
        jobLabel: snap.jobLabel,
        hourlyRateCents: snap.hourlyRateCents,
        startedAtMs: snap.startedAtMs,
        endedAtMs,
        durationMs: finalMs,
        payCents,
      };
      onSegmentCompleteRef.current?.(segment);
    }
  };

  return {
    status,
    isActiveSegment: status === 'running' || status === 'paused',
    elapsedMs,
    elapsedSeconds,
    payCents,
    persistSnapshot,
    start,
    pause,
    resume,
    stop,
  };
}


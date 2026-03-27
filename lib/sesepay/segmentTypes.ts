import type { SesePayJobId } from './jobConfig';

/** One finalized work block, ready for later persistence (Supabase, etc.). */
export interface SesePayCompletedSegment {
  id: string;
  jobId: SesePayJobId;
  jobLabel: string;
  hourlyRateCents: number;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  payCents: number;
}

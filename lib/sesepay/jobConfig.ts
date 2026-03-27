export type SesePayJobId = 'misc' | 'kiosk-help' | 'kiosk-solo';

export interface SesePayJob {
  id: SesePayJobId;
  label: string;
  /** Whole currency units in cents (e.g. 875 = $8.75) */
  hourlyRateCents: number;
  /** Omit or `true` to include in selectors; `false` hides without removing config */
  active?: boolean;
}

export const SESE_PAY_JOBS: readonly SesePayJob[] = [
  { id: 'misc', label: 'Misc', hourlyRateCents: 875, active: true },
  { id: 'kiosk-help', label: 'Kiosk Help', hourlyRateCents: 925, active: true },
  { id: 'kiosk-solo', label: 'Kiosk Solo', hourlyRateCents: 1450, active: true },
];

export function formatHourlyRate(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/hr`;
}

export function getSelectableSesePayJobs(): SesePayJob[] {
  return SESE_PAY_JOBS.filter((j) => j.active !== false);
}

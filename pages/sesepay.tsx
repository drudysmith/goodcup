import { useCallback, useEffect, useMemo, useState } from 'react';
import { Quicksand } from 'next/font/google';
import {
  formatHourlyRate,
  getSelectableSesePayJobs,
  type SesePayJobId,
} from '../lib/sesepay/jobConfig';
import { mockSaveSesePayDaySession } from '../lib/sesepay/mockSaveDaySession';
import {
  clearSesepayPersistedSession,
  getSesepayLocalDateKey,
  loadSesepayPersistedSession,
  saveSesepayPersistedSession,
  type SesepayPersistedV1,
} from '../lib/sesepay/sesepayLocalStorage';
import type { SesePayCompletedSegment } from '../lib/sesepay/segmentTypes';
import {
  formatElapsedHMS,
  formatMoneyDollarsFromCents,
  useSesePayTimer,
} from '../lib/sesepay/useSesePayTimer';
import styles from './sesepay.module.css';

const sesepayFont = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sesepay',
});

function resolveInitialJobId(
  persisted: SesepayPersistedV1 | null,
  jobs: ReturnType<typeof getSelectableSesePayJobs>
): SesePayJobId | null {
  const first = jobs[0]?.id ?? null;
  const activeId = persisted?.timer.activeSegment?.jobId;
  if (activeId && jobs.some((j) => j.id === activeId)) return activeId;
  const saved = persisted?.selectedJobId;
  if (saved && jobs.some((j) => j.id === saved)) return saved;
  return first;
}

type SesePaySessionContentProps = {
  persisted: SesepayPersistedV1 | null;
};

function SesePaySessionContent({ persisted }: SesePaySessionContentProps) {
  const selectableJobs = getSelectableSesePayJobs();

  const [selectedJobId, setSelectedJobId] = useState<SesePayJobId | null>(() =>
    resolveInitialJobId(persisted, selectableJobs)
  );
  const [completedSegments, setCompletedSegments] = useState<SesePayCompletedSegment[]>(
    () => persisted?.completedSegments ?? []
  );

  const selectedJob = selectableJobs.find((j) => j.id === selectedJobId) ?? null;
  const activeHourlyRateCents = selectedJob?.hourlyRateCents ?? 0;

  const onSegmentComplete = useCallback((segment: SesePayCompletedSegment) => {
    setCompletedSegments((prev) => [...prev, segment]);
  }, []);

  const timer = useSesePayTimer({
    hourlyRateCents: activeHourlyRateCents,
    selectedJob: selectedJob
      ? {
          id: selectedJob.id,
          label: selectedJob.label,
          hourlyRateCents: selectedJob.hourlyRateCents,
        }
      : null,
    onSegmentComplete,
    initialHydration: persisted?.timer ?? null,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveSesepayPersistedSession({
        version: 1,
        dateKey: getSesepayLocalDateKey(),
        selectedJobId,
        completedSegments,
        timer: timer.persistSnapshot,
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [selectedJobId, completedSegments, timer.persistSnapshot]);

  const completedDurationMs = useMemo(
    () => completedSegments.reduce((sum, s) => sum + s.durationMs, 0),
    [completedSegments]
  );
  const completedPayCents = useMemo(
    () => completedSegments.reduce((sum, s) => sum + s.payCents, 0),
    [completedSegments]
  );

  const totalElapsedMs = completedDurationMs + (timer.isActiveSegment ? timer.elapsedMs : 0);
  const totalPayCents =
    completedPayCents + (timer.isActiveSegment ? timer.payCents : 0);
  const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canEndDay =
    completedSegments.length >= 1 && !timer.isActiveSegment;

  const [endDayModalOpen, setEndDayModalOpen] = useState(false);
  const [endDaySaveInProgress, setEndDaySaveInProgress] = useState(false);
  const [endDayModalError, setEndDayModalError] = useState<string | null>(null);
  const [daySaveNotice, setDaySaveNotice] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!daySaveNotice || daySaveNotice.kind !== 'success') return;
    const tid = window.setTimeout(() => setDaySaveNotice(null), 5000);
    return () => window.clearTimeout(tid);
  }, [daySaveNotice]);

  const openEndDayModal = useCallback(() => {
    setEndDayModalError(null);
    setEndDayModalOpen(true);
  }, []);

  const closeEndDayModal = useCallback(() => {
    if (endDaySaveInProgress) return;
    setEndDayModalOpen(false);
    setEndDayModalError(null);
  }, [endDaySaveInProgress]);

  const handleConfirmEndDay = useCallback(async () => {
    if (endDaySaveInProgress || completedSegments.length === 0) return;
    setEndDayModalError(null);
    setEndDaySaveInProgress(true);

    const result = await mockSaveSesePayDaySession({
      dateLabel: todayLabel,
      segments: completedSegments,
      completedDurationMs,
      completedPayCents,
    });

    setEndDaySaveInProgress(false);

    if (result.ok) {
      setCompletedSegments([]);
      setEndDayModalOpen(false);
      clearSesepayPersistedSession();
      setDaySaveNotice({
        kind: 'success',
        message: 'Day record finalized and saved (mock). You can start a new day.',
      });
    } else {
      setEndDayModalError(result.message);
      setDaySaveNotice({
        kind: 'error',
        message: result.message,
      });
    }
  }, [
    completedDurationMs,
    completedPayCents,
    completedSegments,
    endDaySaveInProgress,
    todayLabel,
  ]);

  return (
    <>
      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-10">
        <div className="max-w-3xl w-full">
          {daySaveNotice && (
            <div
              role="status"
              className={`rounded-2xl border p-4 mb-6 text-xl sm:text-2xl font-semibold ${
                daySaveNotice.kind === 'success'
                  ? 'border-green-500/60 bg-green-100/90 text-green-900'
                  : 'border-red-500/60 bg-red-100/90 text-red-900'
              }`}
            >
              <p>{daySaveNotice.message}</p>
              <button
                type="button"
                onClick={() => setDaySaveNotice(null)}
                className="mt-3 text-lg underline opacity-90 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-lg shadow-fuchsia-300/40">
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Sese Pay
            </h1>
            <p className="mt-3 text-2xl sm:text-3xl text-violet-800/90 font-semibold">{todayLabel}</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-md shadow-violet-200/50">
            <h2 className="text-3xl sm:text-4xl font-bold text-violet-900 mb-5">Job Selection</h2>
            <fieldset className="space-y-3">
              <legend className="sr-only">Select a job</legend>
              {selectableJobs.map((job) => (
                <label
                  key={job.id}
                  className={`${styles.jobOption} text-violet-900 cursor-pointer`}
                >
                  <input
                    type="radio"
                    name="jobType"
                    checked={selectedJobId === job.id}
                    onChange={() => setSelectedJobId(job.id)}
                    disabled={timer.isActiveSegment}
                    className="focus-visible:outline-none"
                  />
                  <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-2xl sm:text-3xl font-semibold">{job.label}</span>
                    <span className="text-xl sm:text-2xl font-bold text-fuchsia-700 tabular-nums">
                      {formatHourlyRate(job.hourlyRateCents)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-md shadow-fuchsia-200/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-fuchsia-200/80 bg-gradient-to-br from-white/90 to-fuchsia-50/90 p-4 shadow-inner">
                <p className="text-xl sm:text-2xl text-violet-700/90 font-semibold">
                  Total Elapsed
                </p>
                <p className="text-sm text-violet-600/90 font-medium mt-1">
                  Completed segments + current segment
                </p>
                <p className="text-4xl sm:text-5xl font-bold mt-2 tabular-nums text-violet-950">
                  {formatElapsedHMS(totalElapsedSeconds)}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-white/90 to-indigo-50/90 p-4 shadow-inner">
                <p className="text-xl sm:text-2xl text-violet-700/90 font-semibold">
                  Total Pay
                </p>
                <p className="text-sm text-violet-600/90 font-medium mt-1">
                  Completed segments + current segment
                </p>
                <p className="text-4xl sm:text-5xl font-bold mt-2 tabular-nums text-violet-950">
                  {formatMoneyDollarsFromCents(totalPayCents)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-md shadow-violet-200/50">
            <h2 className="text-3xl sm:text-4xl font-bold text-violet-900 mb-5">Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={timer.start}
                disabled={!selectedJobId || timer.status !== 'idle'}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 py-3.5 text-xl sm:text-2xl font-bold text-white shadow-md shadow-fuchsia-400/40 transition hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start
              </button>
              <button
                type="button"
                onClick={timer.pause}
                disabled={timer.status !== 'running'}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 py-3.5 text-xl sm:text-2xl font-bold text-white shadow-md shadow-fuchsia-400/40 transition hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={timer.resume}
                disabled={timer.status !== 'paused'}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 py-3.5 text-xl sm:text-2xl font-bold text-white shadow-md shadow-fuchsia-400/40 transition hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={timer.stop}
                disabled={timer.status === 'idle'}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-7 py-3.5 text-xl sm:text-2xl font-bold text-white shadow-md shadow-fuchsia-400/40 transition hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Stop Job
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-md shadow-fuchsia-200/40">
            <h2 className="text-3xl sm:text-4xl font-bold text-violet-900 mb-5">
              Completed Segments
            </h2>
            {completedSegments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-fuchsia-300/70 bg-fuchsia-50/50 p-4">
                <p className="text-2xl sm:text-3xl font-medium text-violet-800/85">
                  No completed segments yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {completedSegments.map((seg) => (
                  <li
                    key={seg.id}
                    className="rounded-xl border border-fuchsia-200/80 bg-gradient-to-br from-white/90 to-fuchsia-50/80 p-4 shadow-inner"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                      <span className="text-2xl sm:text-3xl font-semibold text-violet-950">
                        {seg.jobLabel}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-fuchsia-700 tabular-nums">
                        {formatMoneyDollarsFromCents(seg.payCents)}
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl text-violet-800/90 mt-2 tabular-nums">
                      Duration {formatElapsedHMS(Math.floor(seg.durationMs / 1000))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEndDay && (
            <div className="rounded-2xl border border-white/60 bg-white/65 backdrop-blur-md p-6 mb-6 shadow-md shadow-indigo-200/40">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openEndDayModal}
                  className="rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 px-10 py-4 text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-fuchsia-400/45 transition hover:brightness-105 active:scale-[0.98]"
                >
                  End Day
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {endDayModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-violet-950/50 backdrop-blur-sm"
          role="presentation"
          onClick={closeEndDayModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sesepay-end-day-title"
            className="max-w-lg w-full rounded-2xl border border-white/60 bg-white/95 p-6 shadow-xl text-violet-950"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sesepay-end-day-title" className="text-2xl sm:text-3xl font-bold">
              Done for today?
            </h2>
            <p className="mt-4 text-lg sm:text-xl leading-snug">
              Heads up — you&apos;re about to <strong>save and wrap up</strong> everything you logged
              for <strong>{todayLabel}</strong> (all the jobs you already finished + the pay that
              matches). After you save, this day is <strong>closed out</strong> here so you can start
              clean next time.
            </p>
            <p className="mt-3 text-base sm:text-lg text-violet-800">
              Saving <strong>{completedSegments.length}</strong> segment
              {completedSegments.length === 1 ? '' : 's'} · Total you earned (completed):{' '}
              <strong>{formatMoneyDollarsFromCents(completedPayCents)}</strong>
            </p>

            {endDayModalError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-400/70 bg-red-100 px-4 py-3 text-lg text-red-900 font-medium"
              >
                {endDayModalError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeEndDayModal}
                disabled={endDaySaveInProgress}
                className="rounded-full border-2 border-violet-400 px-6 py-3 text-lg font-bold text-violet-900 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmEndDay()}
                disabled={endDaySaveInProgress}
                className="rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 px-6 py-3 text-lg font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endDaySaveInProgress ? 'Saving…' : 'Confirm & save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SesePayPage() {
  const [storageReady, setStorageReady] = useState(false);
  const [persisted, setPersisted] = useState<SesepayPersistedV1 | null>(null);

  useEffect(() => {
    setPersisted(loadSesepayPersistedSession());
    setStorageReady(true);
  }, []);

  return (
    <div
      className={`${styles.root} ${sesepayFont.variable} ${sesepayFont.className} flex flex-col text-violet-950 antialiased`}
      style={{
        background:
          'linear-gradient(165deg, #e9d5ff 0%, #fbcfe8 28%, #fda4af 58%, #a5b4fc 100%)',
      }}
    >
      {!storageReady ? (
        <div className="flex-1 flex items-center justify-center min-h-screen px-4 text-2xl sm:text-3xl font-semibold text-violet-900">
          Loading…
        </div>
      ) : (
        <SesePaySessionContent persisted={persisted} />
      )}
    </div>
  );
}

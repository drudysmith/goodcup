import Head from 'next/head';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useAdminSession } from '../components/AdminGuard';
import { KDS_STATUSES, KdsOrder, KdsStatus, kdsStatusLabel } from '../lib/kds';

type OrdersResponse = {
  activeOrders: KdsOrder[];
  completedOrders: KdsOrder[];
  generatedAt: string;
};

const STATUS_STYLES: Record<KdsStatus, { border: string; badge: string; selected: string }> = {
  new: {
    border: 'border-orange-500',
    badge: 'bg-orange-100 text-orange-950',
    selected: 'bg-orange-600 text-white ring-orange-700',
  },
  making: {
    border: 'border-blue-600',
    badge: 'bg-blue-100 text-blue-950',
    selected: 'bg-blue-700 text-white ring-blue-800',
  },
  ready: {
    border: 'border-emerald-600',
    badge: 'bg-emerald-100 text-emerald-950',
    selected: 'bg-emerald-700 text-white ring-emerald-800',
  },
  done: {
    border: 'border-slate-400',
    badge: 'bg-slate-200 text-slate-800',
    selected: 'bg-slate-700 text-white ring-slate-800',
  },
};

const shortOrderNumber = (id: string) => id.replaceAll('-', '').slice(0, 6).toUpperCase();

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

const elapsedTime = (value: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};

function KdsLogin() {
  const { login } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error || 'Unable to sign in');
    setSubmitting(false);
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f2efe7] px-5 py-10 text-slate-950">
      <section className="w-full max-w-sm overflow-hidden rounded-[2rem] border-2 border-slate-950 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="bg-slate-950 px-7 py-7 text-white">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Goodcup OS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Order Board</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">Use your existing Goodcup admin login.</p>
        </div>
        <form onSubmit={submit} className="space-y-5 px-7 py-8">
          {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">{error}</div>}
          <div>
            <label htmlFor="kds-email" className="text-sm font-black text-slate-800">Email</label>
            <input id="kds-email" type="email" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15" />
          </div>
          <div>
            <label htmlFor="kds-password" className="text-sm font-black text-slate-800">Password</label>
            <input id="kds-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15" />
          </div>
          <button type="submit" disabled={submitting} className="min-h-14 w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-950/20 transition active:scale-[0.99] disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Open order board'}
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusControl({ order, updating, onChange }: {
  order: KdsOrder;
  updating: boolean;
  onChange: (orderId: string, status: KdsStatus) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label={`Status for order ${shortOrderNumber(order.id)}`}>
      {KDS_STATUSES.map((status) => {
        const selected = order.status === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            disabled={updating}
            onClick={() => onChange(order.id, status)}
            className={`min-h-12 rounded-xl px-1.5 py-2 text-[12px] font-black uppercase tracking-wide ring-2 ring-inset transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${selected ? STATUS_STYLES[status].selected : 'bg-white text-slate-700 ring-slate-300'}`}
          >
            {kdsStatusLabel(status)}
          </button>
        );
      })}
    </div>
  );
}

function OrderCard({ order, now, updating, onStatusChange, completed = false }: {
  order: KdsOrder;
  now: number;
  updating: boolean;
  onStatusChange: (orderId: string, status: KdsStatus) => void;
  completed?: boolean;
}) {
  const styles = STATUS_STYLES[order.status];
  return (
    <article className={`overflow-hidden rounded-2xl border-[3px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.09)] ${styles.border} ${completed ? 'opacity-90' : ''}`}>
      <div className="flex items-start justify-between gap-3 border-b-2 border-slate-200 px-4 py-3.5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Order</p>
          <h2 className="mt-0.5 text-3xl font-black tracking-tight text-slate-950">#{shortOrderNumber(order.id)}</h2>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${styles.badge}`}>{kdsStatusLabel(order.status)}</span>
          <div className="mt-2 flex items-center justify-end gap-1.5 text-sm font-black text-slate-700">
            <ClockIcon className="h-4 w-4" aria-hidden="true" />
            <span>{formatTime(order.paidAt)} · {elapsedTime(order.paidAt, now)}</span>
          </div>
        </div>
      </div>

      <ul className="divide-y-2 divide-slate-100 px-4" aria-label="Order items">
        {order.items.map((item) => (
          <li key={`${item.priceId}:${item.productId}`} className="flex gap-3 py-3.5 text-slate-950">
            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-slate-950 px-2 text-base font-black text-white">{item.quantity}</span>
            <span className="pt-0.5 text-lg font-black leading-snug">{item.name}</span>
          </li>
        ))}
      </ul>

      <div className="border-t-2 border-slate-200 bg-slate-50 p-3">
        <StatusControl order={order} updating={updating} onChange={onStatusChange} />
      </div>
    </article>
  );
}

export default function KdsPage() {
  const { adminSession, isLoading, logoutTo } = useAdminSession();
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const loadOrders = useCallback(async (quiet = false) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    if (!quiet) setLoadingOrders(true);
    try {
      const response = await fetch('/api/kds/orders', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load orders');
      setOrders(data);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load orders');
    } finally {
      if (!quiet) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!adminSession) return;
    loadOrders();
    const refreshTimer = window.setInterval(() => loadOrders(true), 5000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [adminSession, loadOrders]);

  const changeStatus = async (orderId: string, status: KdsStatus) => {
    if (updatingOrderId) return;
    const current = [...(orders?.activeOrders || []), ...(orders?.completedOrders || [])].find((order) => order.id === orderId);
    if (!current || current.status === status) return;

    setUpdatingOrderId(orderId);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/kds/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to change status');
      await loadOrders(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to change status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrders = orders?.activeOrders || [];
  const completedOrders = orders?.completedOrders || [];
  const lastUpdated = useMemo(() => orders?.generatedAt ? formatTime(orders.generatedAt) : null, [orders?.generatedAt]);

  if (isLoading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-[#f2efe7]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700" /></div>;
  }
  if (!adminSession) return <><Head><title>Goodcup Order Board</title><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></Head><KdsLogin /></>;

  return (
    <>
      <Head><title>Goodcup Order Board</title><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></Head>
      <main className="min-h-[100dvh] bg-[#f2efe7] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-950">
        <header className="sticky top-0 z-20 border-b-2 border-slate-950 bg-slate-950 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-lg">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-300"><SignalIcon className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.2em]">Goodcup OS</span></div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Order Board</h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => loadOrders()} disabled={loadingOrders} aria-label="Refresh orders" className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/25 active:scale-95 disabled:opacity-60">
                <ArrowPathIcon className={`h-6 w-6 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={() => logoutTo('/kds')} className="min-h-12 rounded-xl bg-white px-3 text-sm font-black text-slate-950 active:scale-95">Log out</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-xl px-3 py-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Active queue</p>
              <p className="text-2xl font-black">{activeOrders.length} {activeOrders.length === 1 ? 'order' : 'orders'}</p>
            </div>
            {lastUpdated && <p className="text-right text-xs font-bold text-slate-500">Updates automatically<br />Last check {lastUpdated}</p>}
          </div>

          {error && <div role="alert" className="mb-4 flex gap-3 rounded-2xl border-2 border-red-400 bg-red-50 p-4 font-bold text-red-950"><ExclamationTriangleIcon className="h-6 w-6 shrink-0" /><span>{error}</span></div>}

          {loadingOrders && !orders ? (
            <div className="grid min-h-52 place-items-center rounded-2xl border-2 border-slate-300 bg-white"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700" /><p className="mt-3 font-black text-slate-600">Loading orders…</p></div></div>
          ) : activeOrders.length === 0 ? (
            <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-5 py-8 text-center"><CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-700" /><p className="mt-3 text-2xl font-black text-emerald-950">All caught up</p><p className="mt-1 font-semibold text-emerald-900">New paid kiosk orders will appear here automatically.</p></div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => <OrderCard key={order.id} order={order} now={now} updating={updatingOrderId === order.id} onStatusChange={changeStatus} />)}
            </div>
          )}

          {completedOrders.length > 0 && (
            <section className="mt-8 border-t-2 border-slate-300 pt-5">
              <h2 className="text-lg font-black text-slate-700">Recently completed</h2>
              <div className="mt-3 space-y-4">
                {completedOrders.map((order) => <OrderCard key={order.id} order={order} now={now} updating={updatingOrderId === order.id} onStatusChange={changeStatus} completed />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

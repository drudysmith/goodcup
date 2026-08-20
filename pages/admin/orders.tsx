import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminGuard, useAdminSession } from '../../components/AdminGuard';

type Address = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type OrderRow = {
  id: string;
  kind: 'subscription' | 'one_off' | 'unknown';
  stripeId: string | null;
  stripeCustomerId: string | null;
  stripeUrl: string | null;
  status: string;
  active: boolean;
  createdAt: string | null;
  renewalAt: string | null;
  endedAt: string | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string;
  billingInterval: string | null;
  billingIntervalCount: number | null;
  products: Array<{ name: string; quantity: number }>;
  recipient: { name: string; email: string | null; phone: string | null; address: Address | null };
  purchaser: { name: string | null; email: string | null; phone: string | null } | null;
  gift: boolean;
  matchStatus: 'matched' | 'stripe_only' | 'supabase_only';
  shipmentOrderId: string | null;
  shipmentStatus: string | null;
  fulfilledAt: string | null;
  sampleNote: string | null;
  warnings: string[];
};

type OrdersResponse = {
  orders: OrderRow[];
  stats: {
    total: number;
    subscriptions: number;
    activeSubscriptions: number;
    oneOffs: number;
    dueNext30Days: number;
    attention: number;
    unmatched: number;
    pendingShipments: number;
  };
  generatedAt: string;
};

type Scope = 'all' | 'active' | 'subscriptions' | 'one_off' | 'history' | 'attention';
type SortMode = 'attention' | 'newest' | 'renewal' | 'name';
type DueWindow = 'all' | '7' | '30' | '60';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  trialing: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  paid: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  fulfilled: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  pending: 'bg-amber-100 text-amber-900 ring-amber-600/20',
  past_due: 'bg-amber-100 text-amber-900 ring-amber-600/20',
  unpaid: 'bg-red-100 text-red-800 ring-red-600/20',
  paused: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  canceled: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  incomplete: 'bg-orange-100 text-orange-800 ring-orange-600/20',
  incomplete_expired: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  expired: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

const formatStatus = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: string | null, withTime = false) => {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
};

const formatMoney = (amount: number | null, currency: string) => {
  if (amount === null) return 'Amount unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'USD',
  }).format(amount / 100);
};

const addressLines = (address: Address | null) => {
  if (!address) return ['No shipping address found'];
  return [
    [address.line1, address.line2].filter(Boolean).join(', '),
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country && address.country !== 'US' ? address.country : null,
  ].filter(Boolean) as string[];
};

const kindLabel = (kind: OrderRow['kind']) => kind === 'subscription' ? 'Subscription' : kind === 'one_off' ? 'One-time order' : 'Order';

const fetchOrders = async (): Promise<OrdersResponse> => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load orders');
  return data;
};

export function AdminOrderCenter({ embedded = false }: { embedded?: boolean }) {
  const { adminSession, logout } = useAdminSession();
  const [scope, setScope] = useState<Scope>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [matchStatus, setMatchStatus] = useState('all');
  const [dueWindow, setDueWindow] = useState<DueWindow>('all');
  const [sortMode, setSortMode] = useState<SortMode>('attention');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminOrderCenter'],
    queryFn: fetchOrders,
    staleTime: 60 * 1000,
  });

  const statuses = useMemo(() => [...new Set((data?.orders || []).map((order) => order.status))].sort(), [data]);

  const orders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();
    const filtered = (data?.orders || []).filter((order) => {
      if (scope === 'active' && !(order.kind === 'subscription' && order.active)) return false;
      if (scope === 'subscriptions' && order.kind !== 'subscription') return false;
      if (scope === 'one_off' && order.kind !== 'one_off') return false;
      if (scope === 'history' && !(order.kind === 'subscription' && !order.active)) return false;
      if (scope === 'attention' && order.warnings.length === 0) return false;
      if (status !== 'all' && order.status !== status) return false;
      if (matchStatus !== 'all' && order.matchStatus !== matchStatus) return false;

      if (dueWindow !== 'all') {
        if (!order.active || !order.renewalAt) return false;
        const renewalTime = new Date(order.renewalAt).getTime();
        const cutoff = now + Number(dueWindow) * 24 * 60 * 60 * 1000;
        if (renewalTime < now || renewalTime > cutoff) return false;
      }

      if (normalizedQuery) {
        const searchText = [
          order.recipient.name,
          order.recipient.email,
          order.recipient.phone,
          order.purchaser?.name,
          order.purchaser?.email,
          order.purchaser?.phone,
          order.stripeId,
          order.stripeCustomerId,
          order.shipmentOrderId,
          ...order.products.map((product) => product.name),
          ...addressLines(order.recipient.address),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(normalizedQuery)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'name') return a.recipient.name.localeCompare(b.recipient.name);
      if (sortMode === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortMode === 'renewal') {
        if (!a.renewalAt) return 1;
        if (!b.renewalAt) return -1;
        return a.renewalAt.localeCompare(b.renewalAt);
      }
      if (a.warnings.length !== b.warnings.length) return b.warnings.length - a.warnings.length;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [data, dueWindow, matchStatus, query, scope, sortMode, status]);

  const copyOrder = async (order: OrderRow) => {
    const text = [
      order.recipient.name,
      ...addressLines(order.recipient.address),
      order.recipient.email,
      order.recipient.phone,
      order.products.map((product) => `${product.name}${product.quantity > 1 ? ` x${product.quantity}` : ''}`).join(', '),
      order.shipmentOrderId ? `Order: ${order.shipmentOrderId}` : null,
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const stats = data?.stats;
  const scopes: Array<[Scope, string]> = [
    ['all', `All (${stats?.total ?? 0})`],
    ['active', `Active (${stats?.activeSubscriptions ?? 0})`],
    ['subscriptions', `Subscriptions (${stats?.subscriptions ?? 0})`],
    ['one_off', `One-time (${stats?.oneOffs ?? 0})`],
    ['history', 'Older subscriptions'],
    ['attention', `Needs attention (${stats?.attention ?? 0})`],
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f4f3ee] text-slate-900">
        {!embedded && <header className="border-b border-slate-200 bg-white/95">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Goodcup admin</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Order Center</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">Subscriptions and one-time purchases from Stripe, paired with the recipient and shipping details stored in Supabase.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {adminSession && <span className="hidden text-sm text-slate-500 md:inline">Signed in as {adminSession.name || adminSession.email}</span>}
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">{isFetching ? 'Refreshing…' : 'Refresh live data'}</button>
              <button type="button" onClick={logout} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700">Log out</button>
            </div>
          </div>
        </header>}

        <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">
          {embedded && (
            <div className="mb-5 flex justify-end">
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
                {isFetching ? 'Refreshing…' : 'Refresh live data'}
              </button>
            </div>
          )}
          {error ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <h2 className="text-lg font-black text-red-900">The Order Center could not load</h2>
              <p className="mt-1 text-sm text-red-800">{error.message}</p>
              <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-bold text-white">Try again</button>
            </section>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Order summary">
                {[
                  { label: 'Active subscriptions', value: stats?.activeSubscriptions, detail: 'Currently running', color: 'text-emerald-700' },
                  { label: 'Due soon', value: stats?.dueNext30Days, detail: 'Renewing in 30 days', color: 'text-blue-700' },
                  { label: 'One-time orders', value: stats?.oneOffs, detail: 'Stripe checkout orders', color: 'text-violet-700' },
                  { label: 'Pending shipments', value: stats?.pendingShipments, detail: 'Not yet marked paid', color: 'text-amber-700' },
                  { label: 'Needs attention', value: stats?.attention, detail: 'At least one warning', color: 'text-orange-700' },
                  { label: 'Unmatched', value: stats?.unmatched, detail: 'Stripe or Supabase only', color: 'text-rose-700' },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <p className="text-sm font-bold text-slate-500">{card.label}</p>
                    <p className={`mt-2 text-3xl font-black tracking-tight ${card.color}`}>{isLoading ? '—' : card.value ?? 0}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
                  </div>
                ))}
              </section>

              {Boolean(stats?.unmatched) && (
                <button type="button" onClick={() => { setScope('attention'); setMatchStatus('all'); }} className="mt-5 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 transition hover:bg-amber-100">
                  <span className="font-black">{stats?.unmatched} record{stats?.unmatched === 1 ? '' : 's'} need reconciliation.</span> Open the Needs attention view to see Stripe-only and Supabase-only orders.
                </button>
              )}

              <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {scopes.map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setScope(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${scope === value ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}>{label}</button>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, address or ID…" className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 xl:col-span-2" />
                      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-600"><option value="all">Every status</option>{statuses.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}</select>
                      <select value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-600"><option value="all">Any match status</option><option value="matched">Matched records</option><option value="stripe_only">Stripe only</option><option value="supabase_only">Supabase only</option></select>
                      <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-600"><option value="attention">Warnings first</option><option value="newest">Newest first</option><option value="renewal">Next renewal</option><option value="name">Recipient name</option></select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-600">Renewal window:</span>
                      {(['all', '7', '30', '60'] as DueWindow[]).map((value) => <button key={value} type="button" onClick={() => setDueWindow(value)} className={`rounded-full px-3 py-1 font-bold ${dueWindow === value ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 hover:bg-slate-200'}`}>{value === 'all' ? 'Any date' : `${value} days`}</button>)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{isLoading ? 'Loading orders…' : `${orders.length} order${orders.length === 1 ? '' : 's'} shown`}</span>{data?.generatedAt && <span>Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}</div>

                <div className="divide-y divide-slate-200">
                  {isLoading && Array.from({ length: 6 }).map((_, index) => <div key={index} className="animate-pulse p-6"><div className="h-5 w-44 rounded bg-slate-200" /><div className="mt-3 h-4 w-72 rounded bg-slate-100" /></div>)}
                  {!isLoading && orders.length === 0 && <div className="px-5 py-16 text-center"><p className="text-lg font-black text-slate-800">No orders match these filters</p><p className="mt-1 text-sm text-slate-500">Try clearing the search or widening the filters.</p></div>}

                  {orders.map((order) => {
                    const expanded = expandedId === order.id;
                    const primaryDateLabel = order.kind === 'subscription' && order.active ? order.cancelAtPeriodEnd ? 'Ends' : 'Next renewal' : 'Ordered';
                    const primaryDate = order.kind === 'subscription' && order.active ? order.renewalAt : order.createdAt;
                    return (
                      <article key={order.id} className={order.warnings.length ? 'bg-amber-50/25' : ''}>
                        <button type="button" onClick={() => setExpandedId(expanded ? null : order.id)} className="grid w-full gap-5 p-5 text-left transition hover:bg-slate-50/80 sm:p-6 lg:grid-cols-[minmax(230px,1.2fr)_minmax(250px,1.25fr)_minmax(145px,.65fr)_minmax(160px,.7fr)_44px] lg:items-center" aria-expanded={expanded}>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-black text-slate-950">{order.recipient.name}</h2>
                              {order.gift && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-fuchsia-800">Gift</span>}
                              {order.matchStatus !== 'matched' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-900">{order.matchStatus === 'stripe_only' ? 'Stripe only' : 'Supabase only'}</span>}
                            </div>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{kindLabel(order.kind)}</p>
                            <p className="mt-1 truncate text-sm text-slate-500">{order.recipient.email || 'No email'}{order.recipient.phone ? ` · ${order.recipient.phone}` : ''}</p>
                          </div>
                          <div><p className="font-bold text-slate-800">{order.products.map((product) => `${product.name}${product.quantity > 1 ? ` × ${product.quantity}` : ''}`).join(', ') || 'Products unavailable'}</p><p className="mt-1 text-sm text-slate-500">{formatMoney(order.amount, order.currency)}{order.billingInterval ? ` every ${order.billingIntervalCount && order.billingIntervalCount > 1 ? `${order.billingIntervalCount} ` : ''}${order.billingInterval}` : ''}</p></div>
                          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{primaryDateLabel}</p><p className={`mt-1 font-black ${order.cancelAtPeriodEnd ? 'text-amber-800' : 'text-slate-900'}`}>{formatDate(primaryDate)}</p></div>
                          <div className="lg:text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>{formatStatus(order.status)}</span>{order.warnings.length > 0 && <p className="mt-2 text-xs font-bold text-amber-800">{order.warnings.length} warning{order.warnings.length === 1 ? '' : 's'}</p>}</div>
                          <span className={`text-2xl text-slate-400 transition ${expanded ? 'rotate-180' : ''}`}>⌄</span>
                        </button>

                        {expanded && (
                          <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-6 sm:px-6">
                            {order.warnings.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-amber-800">Needs attention</p><ul className="mt-2 space-y-1 text-sm font-semibold text-amber-950">{order.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                              <section><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Recipient & shipping</h3><p className="mt-3 font-black text-slate-900">{order.recipient.name}</p>{addressLines(order.recipient.address).map((line) => <p key={line} className="text-sm text-slate-600">{line}</p>)}<p className="mt-2 text-sm text-slate-600">{order.recipient.email || 'No recipient email'}</p><p className="text-sm text-slate-600">{order.recipient.phone || 'No recipient phone'}</p></section>
                              <section><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Purchaser</h3><p className="mt-3 font-black text-slate-900">{order.purchaser?.name || 'Name unavailable'}</p><p className="text-sm text-slate-600">{order.purchaser?.email || 'No purchaser email'}</p><p className="text-sm text-slate-600">{order.purchaser?.phone || 'No purchaser phone'}</p>{order.gift && <p className="mt-2 text-xs font-black uppercase tracking-wide text-fuchsia-700">Gift order</p>}</section>
                              <section><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Order details</h3><p className="mt-3 text-sm text-slate-600">Created <span className="font-bold text-slate-900">{formatDate(order.createdAt, true)}</span></p><p className="mt-1 text-sm text-slate-600">Shipment <span className="font-bold text-slate-900">{order.shipmentStatus ? formatStatus(order.shipmentStatus) : 'Not linked'}</span></p><p className="mt-1 text-sm text-slate-600">Fulfilled <span className="font-bold text-slate-900">{order.fulfilledAt ? formatDate(order.fulfilledAt, true) : 'Not yet'}</span></p>{order.sampleNote && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">Sample note: <span className="font-bold">{order.sampleNote}</span></p>}</section>
                              <section><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Record IDs</h3><dl className="mt-3 space-y-2 text-xs"><div><dt className="font-bold text-slate-400">Stripe</dt><dd className="break-all font-mono text-slate-700">{order.stripeId || 'Not linked'}</dd></div><div><dt className="font-bold text-slate-400">Supabase shipment</dt><dd className="break-all font-mono text-slate-700">{order.shipmentOrderId || 'Not linked'}</dd></div><div><dt className="font-bold text-slate-400">Stripe customer</dt><dd className="break-all font-mono text-slate-700">{order.stripeCustomerId || 'Not available'}</dd></div></dl></section>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => copyOrder(order)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">{copiedId === order.id ? 'Copied!' : 'Copy order details'}</button>{order.stripeUrl && <a href={order.stripeUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#635bff] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#5149e5]">Open in Stripe ↗</a>}</div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

export default function AdminOrdersPage() {
  return <AdminOrderCenter />;
}

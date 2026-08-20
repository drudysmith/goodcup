import Head from 'next/head';
import { FormEvent, useState } from 'react';
import { useAdminSession } from '../../components/AdminGuard';
import { AdminOperationsDashboard } from '../adminDashboard';
import { AdminOrderCenter } from './orders';

type AdminSection = 'orders' | 'fulfillment' | 'visitors';

function AdminLogin() {
  const { login } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error || 'Unable to sign in');
    setSubmitting(false);
  };

  return (
    <>
      <Head><title>Goodcup Admin Portal</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className="relative min-h-screen overflow-hidden bg-[#f2efe7] px-5 py-10 text-slate-950 sm:grid sm:place-items-center">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)]">
        <div className="bg-slate-950 px-7 py-8 text-white sm:px-9">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950">G</div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Goodcup</p>
              <h1 className="text-2xl font-black tracking-tight">Admin Portal</h1>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-300">One secure place for customer orders, subscriptions, fulfillment, and visitor records.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-8 sm:px-9">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

          <div>
            <label htmlFor="admin-email" className="text-sm font-bold text-slate-700">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@goodcup.me" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
          </div>

          <div>
            <label htmlFor="admin-password" className="text-sm font-bold text-slate-700">Password</label>
            <div className="relative mt-2">
              <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign in to dashboard'}
          </button>

          <div className="border-t border-slate-200 pt-5 text-center">
            <button type="button" onClick={() => setShowRecovery((value) => !value)} className="text-sm font-bold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">Forgot your password?</button>
            {showRecovery && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
                <p className="font-black">Password recovery is being upgraded.</p>
                <p className="mt-1">This account still uses the original owner-managed login, so it cannot safely email a reset link yet. No password or secret should be shared in chat.</p>
              </div>
            )}
          </div>
        </form>
      </section>
      </main>
    </>
  );
}

export default function AdminPage() {
  const { adminSession, isLoading, logout } = useAdminSession();
  const [section, setSection] = useState<AdminSection>('orders');

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#f2efe7]"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700" /><p className="mt-4 text-sm font-bold text-slate-600">Opening admin portal…</p></div></div>;
  }

  if (!adminSession) return <AdminLogin />;

  const tabs: Array<{ id: AdminSection; label: string; detail: string }> = [
    { id: 'orders', label: 'Order Center', detail: 'Subscriptions & purchases' },
    { id: 'fulfillment', label: 'Fulfillment', detail: 'Shipment operations' },
    { id: 'visitors', label: 'Visitors', detail: 'Customer records' },
  ];

  return (
    <>
      <Head><title>Goodcup Admin Portal</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main className="min-h-screen bg-[#f4f3ee] text-slate-950">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-emerald-300">G</div>
              <div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Goodcup</p><h1 className="text-2xl font-black tracking-tight">Admin Portal</h1></div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">{adminSession.name || adminSession.email}</span>
              <button type="button" onClick={logout} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700">Log out</button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-5 pb-4 sm:px-8" aria-label="Admin sections">
            {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setSection(tab.id)} className={`min-w-fit rounded-xl px-4 py-2.5 text-left transition ${section === tab.id ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><span className="block text-sm font-black">{tab.label}</span><span className={`block text-[11px] ${section === tab.id ? 'text-emerald-100' : 'text-slate-500'}`}>{tab.detail}</span></button>)}
          </nav>
        </header>

        {section === 'orders' && <AdminOrderCenter embedded />}
        {section === 'fulfillment' && <AdminOperationsDashboard embedded view="orders" />}
        {section === 'visitors' && <AdminOperationsDashboard embedded view="visitors" />}
      </main>
    </>
  );
}

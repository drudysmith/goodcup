import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from './scrip.module.css';

type Confirmation = {
  paid: boolean;
  customerName: string;
  productName: string;
  confirmation: string;
  completedAt: string;
  receiptUrl: string | null;
};

export default function ScripSuccessPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const sessionId = typeof router.query.session_id === 'string' ? router.query.session_id : '';
    if (!sessionId) {
      setError('This confirmation link is missing its Stripe session.');
      return;
    }
    fetch(`/api/scrip/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to verify payment');
        return data as Confirmation;
      })
      .then(setConfirmation)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to verify payment'));
  }, [router.isReady, router.query.session_id]);

  const paid = confirmation?.paid === true;

  return (
    <>
      <Head>
        <title>{`${paid ? 'Subscription Active' : 'Verifying Subscription'} | Goodcup`}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="theme-color" content="#075c5f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <main className={styles.successPage}>
        <div className={styles.successBrand}><div className={styles.logoMark}><span>G</span></div><strong>Goodcup</strong></div>
        {!confirmation && !error && (
          <div className={styles.verifying} aria-live="polite"><div className={styles.spinner} />Verifying your subscription with Stripe…</div>
        )}
        {error && (
          <div className={styles.failureCard}>
            <h1>Almost there.</h1>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
        {confirmation && !paid && (
          <div className={styles.failureCard}>
            <h1>Payment is still processing.</h1>
            <p>Please wait a moment and refresh this screen. Your free pouch proof appears only after Stripe confirms payment.</p>
            <button type="button" onClick={() => window.location.reload()}>Refresh</button>
          </div>
        )}
        {confirmation && paid && (
          <>
            <section className={styles.successHero}>
              <div className={styles.bigCheck}>✓</div>
              <p>SUBSCRIPTION ACTIVE</p>
              <h1>You get a free<br /><span>2-week pouch</span> today!</h1>
              <div className={styles.showCounter}>SHOW THIS LIVE SCREEN AT THE GOODCUP COUNTER</div>
            </section>
            <section className={styles.proofCard}>
              <div className={styles.proofStatus}><span>MARKET OFFER</span><strong>NOT YET REDEEMED</strong></div>
              <dl>
                <div><dt>Customer</dt><dd>{confirmation.customerName}</dd></div>
                <div><dt>Subscription</dt><dd>{confirmation.productName}</dd></div>
                <div><dt>Payment</dt><dd className={styles.confirmed}>Confirmed ✓</dd></div>
                <div><dt>Date</dt><dd>{new Date(confirmation.completedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
                <div><dt>Confirmation</dt><dd className={styles.confirmationCode}>{confirmation.confirmation}</dd></div>
              </dl>
            </section>
            <section className={styles.aftercare}>
              <h2>No commitment. No surprises.</h2>
              <p>Your email receipt is on its way. We’ll text you 7 days before renewal with a link to cancel if you want—no sweat.</p>
              {confirmation.receiptUrl && <a href={confirmation.receiptUrl} target="_blank" rel="noreferrer">View Stripe receipt</a>}
            </section>
          </>
        )}
      </main>
    </>
  );
}

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
  expiresAt: string;
  specialRedeemed: boolean;
  redemptionReady: boolean;
  receiptUrl: string | null;
};

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export default function ScripSuccessPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [staffCode, setStaffCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionError, setRedemptionError] = useState('');

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

  useEffect(() => {
    if (!confirmation?.expiresAt || confirmation.specialRedeemed) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [confirmation?.expiresAt, confirmation?.specialRedeemed]);

  const paid = confirmation?.paid === true;
  const expiresAtTime = confirmation?.expiresAt ? new Date(confirmation.expiresAt).getTime() : 0;
  const specialRedeemed = confirmation?.specialRedeemed === true;
  const expired = paid && !specialRedeemed && expiresAtTime > 0 && now >= expiresAtTime;
  const offerActive = paid && !specialRedeemed && !expired;
  const remaining = expiresAtTime > 0 ? formatRemaining(expiresAtTime - now) : '00:00:00';

  const redeemOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    const sessionId = typeof router.query.session_id === 'string' ? router.query.session_id : '';
    if (!sessionId || !offerActive) return;
    setRedeeming(true);
    setRedemptionError('');
    try {
      const response = await fetch('/api/scrip/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, staffCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to redeem this offer');
      setConfirmation((current) => current ? { ...current, specialRedeemed: true } : current);
      setStaffCode('');
    } catch (redeemError) {
      setRedemptionError(redeemError instanceof Error ? redeemError.message : 'Unable to redeem this offer');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`${paid ? 'Subscription Active' : 'Verifying Subscription'} | Goodcup`}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="theme-color" content="#075c5f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <main className={styles.successPage}>
        <div className={styles.successBrand}>
          <div className={styles.logoMark}><img src="/media/animated_logo/goodcup-contact-logo.png" alt="" /></div>
          <strong>Goodcup</strong>
        </div>
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
              {specialRedeemed ? (
                <h1>Free pouch<br /><span>redeemed!</span></h1>
              ) : expired ? (
                <h1>Market offer<br /><span>expired</span></h1>
              ) : (
                <h1>You get a free<br /><span>2-week pouch</span> today!</h1>
              )}
              <div className={styles.showCounter}>
                {specialRedeemed ? 'REDEMPTION RECORDED' : expired ? 'THIS MARKET OFFER HAS EXPIRED' : 'SHOW THIS LIVE SCREEN AT THE GOODCUP COUNTER'}
              </div>
            </section>
            <section className={styles.proofCard}>
              <div className={`${styles.proofStatus} ${specialRedeemed ? styles.redeemedStatus : ''} ${expired ? styles.expiredStatus : ''}`}>
                <span>MARKET OFFER</span>
                <strong>{specialRedeemed ? 'REDEEMED' : expired ? 'EXPIRED' : 'NOT YET REDEEMED'}</strong>
              </div>
              <dl>
                <div><dt>Customer</dt><dd>{confirmation.customerName}</dd></div>
                <div><dt>Subscription</dt><dd>{confirmation.productName}</dd></div>
                <div><dt>Payment</dt><dd className={styles.confirmed}>Confirmed ✓</dd></div>
                <div><dt>Date</dt><dd>{new Date(confirmation.completedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
                <div><dt>Confirmation</dt><dd className={styles.confirmationCode}>{confirmation.confirmation}</dd></div>
              </dl>
            </section>
            <section className={styles.redemptionCard}>
              {offerActive && (
                <>
                  <p className={styles.expirationLabel}>REDEEM BEFORE THIS CLOCK REACHES ZERO</p>
                  <div className={styles.countdown} role="timer" aria-live="off">{remaining}</div>
                  <p className={styles.expirationTime}>Expires {new Date(confirmation.expiresAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short',
                  })}</p>
                  <form className={styles.redeemForm} onSubmit={redeemOffer}>
                    <label htmlFor="staff-redemption-code">Staff redemption code</label>
                    <div>
                      <input
                        id="staff-redemption-code"
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={staffCode}
                        onChange={(event) => setStaffCode(event.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        aria-describedby={redemptionError ? 'redemption-error' : undefined}
                      />
                      <button type="submit" disabled={redeeming || staffCode.length !== 3}>
                        {redeeming ? 'REDEEMING…' : 'REDEEM POUCH'}
                      </button>
                    </div>
                  </form>
                  {redemptionError && <p id="redemption-error" className={styles.redemptionError} role="alert">{redemptionError}</p>}
                </>
              )}
              {specialRedeemed && <p className={styles.finalOfferState}>✓ This free pouch has been redeemed.</p>}
              {expired && <p className={styles.finalOfferState}>This same-day market offer is no longer redeemable.</p>}
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

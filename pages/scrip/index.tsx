import Head from 'next/head';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SCRIP_PRODUCTS, type ScripCatalogItem } from '../../lib/scripCatalog';
import styles from './scrip.module.css';

type FormState = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  smsConsent: boolean;
  marketingConsent: boolean;
};

const INITIAL_FORM: FormState = {
  name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', postalCode: '', smsConsent: false, marketingConsent: false,
};

function formatPrice(product: ScripCatalogItem, catalogReady = true) {
  if (product.amount == null || !product.currency || !product.interval) {
    return catalogReady ? 'Temporarily unavailable' : 'Loading price…';
  }
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency.toUpperCase(),
    minimumFractionDigits: product.amount % 100 === 0 ? 0 : 2,
  }).format(product.amount / 100);
  const frequency = product.intervalCount && product.intervalCount > 1
    ? `every ${product.intervalCount} ${product.interval}s`
    : `per ${product.interval}`;
  return `${amount} ${frequency}`;
}

export default function ScripPage() {
  const router = useRouter();
  const detailsRef = useRef<HTMLDivElement>(null);
  const [catalog, setCatalog] = useState<ScripCatalogItem[]>(SCRIP_PRODUCTS.map((product) => ({
    ...product,
    amount: null,
    currency: null,
    interval: null,
    intervalCount: null,
    ingredients: [],
    image: product.fallbackImage,
    available: false,
  })));
  const [catalogReady, setCatalogReady] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ingredientProduct, setIngredientProduct] = useState<ScripCatalogItem | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/scrip/catalog')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load subscriptions');
        return data.products as ScripCatalogItem[];
      })
      .then((products) => {
        if (active) {
          setCatalog(products);
          if (!products.some((product) => product.available)) {
            setError('Subscriptions are temporarily unavailable. Please refresh in a moment.');
          }
        }
      })
      .catch(() => {
        if (active) setError('We could not load subscription prices. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setCatalogReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (router.query.checkout === 'canceled') {
      setError('Checkout was canceled—nothing was charged. Your information is still here when you are ready.');
    }
  }, [router.query.checkout]);

  useEffect(() => {
    if (!ingredientProduct) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIngredientProduct(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [ingredientProduct]);

  const selectedProduct = useMemo(
    () => catalog.find((product) => product.productId === selectedId) || null,
    [catalog, selectedId],
  );

  const update = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const chooseProduct = (product: ScripCatalogItem) => {
    setSelectedId(product.productId);
    setError('');
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProduct?.available) {
      setError('Choose an available Goodcup subscription first.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/scrip/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.productId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          smsConsent: form.smsConsent,
          marketingConsent: form.marketingConsent,
          address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: 'US',
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started');
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Subscription Special | Goodcup</title>
        <meta name="description" content="Subscribe to Goodcup at the market and get a free two-week pouch today." />
        <meta name="theme-color" content="#fff8e8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <main className={styles.page}>
        <div className={styles.cacaoCloud} aria-hidden="true" />
        <header className={styles.brandBar}>
          <div className={styles.logoMark} aria-hidden="true"><span>G</span></div>
          <div>
            <div className={styles.wordmark}>Goodcup</div>
            <div className={styles.tagline}>SMART · DELICIOUS · DIFFERENT</div>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.marketBurst}>TODAY ONLY<br /><small>AT THE MARKET</small></div>
          <p className={styles.eyebrow}>SUBSCRIPTION SPECIAL</p>
          <h1>Get a <span>2-week pouch</span> free today.</h1>
          <p className={styles.heroCopy}>Choose any Goodcup subscription, check out securely, then show the success screen at the counter.</p>
          <div className={styles.reassurance}>
            <strong>No commitment. Cancel anytime.</strong>
            <span>We’ll text you 7 days before every renewal with a link to cancel. No hoops.</span>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="choose-heading">
          <div className={styles.stepLabel}>STEP 1 OF 2</div>
          <h2 id="choose-heading">Pick your Goodcup</h2>
          <div className={styles.productList}>
            {catalog.map((product) => {
              const selected = product.productId === selectedId;
              return (
                <div
                  key={product.productId}
                  className={`${styles.productCard} ${selected ? styles.selectedCard : ''} ${catalogReady && !product.available ? styles.unavailableCard : ''}`}
                >
                  <button
                    type="button"
                    className={styles.productSelect}
                    onClick={() => chooseProduct(product)}
                    disabled={catalogReady && !product.available}
                    aria-pressed={selected}
                    aria-label={`Choose ${product.name}: ${formatPrice(product, catalogReady)}`}
                  />
                  <img src={product.image} alt="" className={styles.productImage} />
                  <span className={styles.productBody}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productDescription}>
                      {product.description}{' '}
                      {product.ingredients.length > 0 && (
                        <button type="button" className={styles.ingredientsLink} onClick={() => setIngredientProduct(product)}>
                          Ingredients
                        </button>
                      )}
                    </span>
                    <span className={styles.productPrice}>{formatPrice(product, catalogReady)}</span>
                  </span>
                  <span className={styles.radio} aria-hidden="true">{selected ? '✓' : ''}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.section} ref={detailsRef} aria-labelledby="details-heading">
          <div className={styles.stepLabel}>STEP 2 OF 2</div>
          <h2 id="details-heading">Where should we send it?</h2>
          <p className={styles.sectionIntro}>We’ll pass these details securely to Stripe so checkout is fast on your phone.</p>

          <form className={styles.form} onSubmit={submit}>
            <label>
              <span>Full name</span>
              <input required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Jane Smith" />
            </label>
            <div className={styles.twoColumn}>
              <label>
                <span>Mobile phone</span>
                <input required type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="(555) 555-0123" />
              </label>
              <label>
                <span>Email</span>
                <input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" />
              </label>
            </div>
            <label>
              <span>Shipping address</span>
              <input required autoComplete="shipping address-line1" value={form.line1} onChange={(event) => update('line1', event.target.value)} placeholder="Street address" />
            </label>
            <label>
              <span className={styles.visuallyHidden}>Apartment, suite, or unit</span>
              <input autoComplete="shipping address-line2" value={form.line2} onChange={(event) => update('line2', event.target.value)} placeholder="Apartment, suite, etc. (optional)" />
            </label>
            <div className={styles.addressGrid}>
              <label className={styles.cityField}>
                <span>City</span>
                <input required autoComplete="shipping address-level2" value={form.city} onChange={(event) => update('city', event.target.value)} />
              </label>
              <label>
                <span>State</span>
                <input required autoComplete="shipping address-level1" maxLength={2} value={form.state} onChange={(event) => update('state', event.target.value.toUpperCase())} placeholder="CA" />
              </label>
              <label>
                <span>ZIP</span>
                <input required autoComplete="shipping postal-code" inputMode="numeric" value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} placeholder="90210" />
              </label>
            </div>

            <label className={styles.consent}>
              <input type="checkbox" checked={form.smsConsent} onChange={(event) => update('smsConsent', event.target.checked)} required />
              <span>I agree to transactional Goodcup texts about this subscription, including a reminder 7 days before renewal and a cancellation link. Msg &amp; data rates may apply. Reply STOP to opt out. <a href="/policy" target="_blank" rel="noreferrer">SMS terms</a>.</span>
            </label>

            <label className={styles.consent}>
              <input type="checkbox" checked={form.marketingConsent} onChange={(event) => update('marketingConsent', event.target.checked)} />
              <span>Please share Goodcup coupons and occasional updates with me by text and email. This is optional and is not required to subscribe. Msg &amp; data rates may apply. Reply STOP to opt out of texts.</span>
            </label>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.checkoutSummary}>
              <span>{selectedProduct ? selectedProduct.name : 'Choose your subscription above'}</span>
              <strong>{selectedProduct ? formatPrice(selectedProduct) : '—'}</strong>
            </div>

            <button className={styles.checkoutButton} type="submit" disabled={submitting || !selectedProduct?.available || !form.smsConsent}>
              {submitting ? 'Opening secure checkout…' : 'SUBSCRIBE & GET MY FREE POUCH'}
            </button>
            <p className={styles.secureNote}><span aria-hidden="true">●</span> Secure, Stripe-hosted checkout · Email receipt included</p>
          </form>
        </section>

        <section className={styles.controlSection}>
          <div className={styles.controlIcon} aria-hidden="true">✓</div>
          <div><strong>You stay in control.</strong><br />Keep it going and do nothing. Want to stop? Tap the cancellation link in your reminder text.</div>
        </section>
        <footer>SIMPLE. GOOD. DAILY. <span>GOODCUP.ME</span></footer>

        {ingredientProduct && (
          <div className={styles.dialogBackdrop} onClick={() => setIngredientProduct(null)}>
            <section
              className={styles.ingredientsDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ingredients-heading"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className={styles.dialogClose} onClick={() => setIngredientProduct(null)} aria-label="Close ingredients" autoFocus>×</button>
              <p>WHAT’S INSIDE</p>
              <h2 id="ingredients-heading">{ingredientProduct.name}</h2>
              <ul>
                {ingredientProduct.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
              </ul>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

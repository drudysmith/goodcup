import Stripe from 'stripe';
import { SCRIP_PRODUCTS, type ScripCatalogItem } from '../scripCatalog';

let stripeClient: Stripe | null = null;

export function getScripStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-07-29.dahlia' as any,
    });
  }

  return stripeClient;
}

export type ResolvedScripProduct = ScripCatalogItem & { priceId: string };

async function resolveOne(productDefinition: (typeof SCRIP_PRODUCTS)[number]): Promise<ResolvedScripProduct> {
  const stripe = getScripStripe();
  const product = await stripe.products.retrieve(productDefinition.productId, {
    expand: ['default_price'],
  });

  if (product.deleted || !product.active) {
    throw new Error(`${productDefinition.name} is not currently available`);
  }

  const expandedDefault = typeof product.default_price === 'object' ? product.default_price : null;
  let price = expandedDefault && !expandedDefault.deleted && expandedDefault.active && expandedDefault.recurring
    ? expandedDefault
    : null;

  if (!price) {
    const recurringPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: 'recurring',
      limit: 100,
    });

    const explicitlyMarked = recurringPrices.data.filter((candidate) => candidate.metadata.scrip_price === 'true');
    if (explicitlyMarked.length === 1) {
      price = explicitlyMarked[0];
    } else if (recurringPrices.data.length === 1) {
      price = recurringPrices.data[0];
    }
  }

  if (!price?.recurring || price.unit_amount == null) {
    throw new Error(`${productDefinition.name} needs one active recurring default price in Stripe`);
  }

  return {
    ...productDefinition,
    name: product.name || productDefinition.name,
    description: product.metadata['short-copy']?.trim() || productDefinition.description,
    ingredients: (product.metadata.ingredients || '')
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean),
    image: product.images[0] || productDefinition.fallbackImage,
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count,
    available: true,
    priceId: price.id,
  };
}

export async function resolveScripProduct(productId: string) {
  const definition = SCRIP_PRODUCTS.find((product) => product.productId === productId);
  if (!definition) throw new Error('That subscription is not part of this offer');
  return resolveOne(definition);
}

export async function resolveScripCatalog(): Promise<ScripCatalogItem[]> {
  return Promise.all(SCRIP_PRODUCTS.map(async (definition) => {
    try {
      const { priceId: _priceId, ...safeProduct } = await resolveOne(definition);
      return safeProduct;
    } catch (error) {
      console.error(`Unable to resolve ${definition.name} for /scrip:`, error);
      return {
        ...definition,
        amount: null,
        currency: null,
        interval: null,
        intervalCount: null,
        ingredients: [],
        image: definition.fallbackImage,
        available: false,
      };
    }
  }));
}

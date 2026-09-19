export type ScripProductDefinition = {
  slug: 'daily' | 'cocomatchana' | 'fire';
  productId: string;
  name: string;
  description: string;
  fallbackImage: string;
};

export type ScripCatalogItem = ScripProductDefinition & {
  amount: number | null;
  currency: string | null;
  interval: string | null;
  intervalCount: number | null;
  image: string;
  available: boolean;
};

export const SCRIP_PRODUCTS: readonly ScripProductDefinition[] = [
  {
    slug: 'daily',
    productId: 'prod_SkftLT1tMg2lIe',
    name: 'Daily Goodcup',
    description: 'Chocolate adaptogen energy + focus for your daily ritual.',
    fallbackImage: '/media/kiosk/daily_goodcup.webp',
  },
  {
    slug: 'cocomatchana',
    productId: 'prod_Skftt9P6qlOqUv',
    name: 'Cocomatchana',
    description: 'A bright, delicious matcha-forward Goodcup ritual.',
    fallbackImage: '/media/kiosk/sweet_goodcup.webp',
  },
  {
    slug: 'fire',
    productId: 'prod_SkfttgwNBj3y4e',
    name: 'Fire Goodcup',
    description: 'Warm spice, smooth energy, and a little extra fire.',
    fallbackImage: '/media/kiosk/fire_goodcup.webp',
  },
] as const;

export const SCRIP_PRODUCT_IDS = new Set(SCRIP_PRODUCTS.map((product) => product.productId));

export function getScripProductDefinition(productId: string) {
  return SCRIP_PRODUCTS.find((product) => product.productId === productId) || null;
}

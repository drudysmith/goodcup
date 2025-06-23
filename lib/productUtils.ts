import { FEATURED_PRODUCT_IDENTIFIERS } from './constants';

interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string };
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  prices: StripePrice[];
}

export const findMostPopularProduct = (products: StripeProduct[]): StripeProduct | undefined => {
  return products.find(p => 
    FEATURED_PRODUCT_IDENTIFIERS.MOST_POPULAR.every(identifier => 
      p.name.toLowerCase().includes(identifier)
    )
  );
};

export const findSuperHealingProduct = (products: StripeProduct[]): StripeProduct | undefined => {
  return products.find(p => 
    FEATURED_PRODUCT_IDENTIFIERS.SUPER_HEALING.some(identifier => 
      p.name.toLowerCase().includes(identifier)
    )
  );
};

export const buildCupgradesGroups = (products: StripeProduct[], mostPopularProduct?: StripeProduct, superHealingProduct?: StripeProduct) => {
  if (!products.length) return [];
  
  // Get featured product IDs to exclude from lists
  const featuredProductIds = new Set([
    mostPopularProduct?.id,
    superHealingProduct?.id
  ].filter(Boolean));
  
  const groups = [
    {
      name: 'See All Cupgrades',
      products: products.filter(p => !featuredProductIds.has(p.id))
    }
    // Removed separate daily and super healing groups - now just one comprehensive list
  ];
  
  return groups.filter(group => group.products.length > 0);
}; 
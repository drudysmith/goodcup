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
  prices: Array<{
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring?: { interval: string };
  }>;
  metadata?: { [key: string]: string };
}

interface CartItem {
  productId: string;
  priceId: string;
  quantity: number;
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

/**
 * Find products that contain a specific ingredient in their metadata
 * @param ingredientName The ingredient to search for (e.g., "cacao", "cordyceps")
 * @param products Array of Stripe products to search through
 * @param maxResults Maximum number of products to return (default: 2)
 * @returns Array of matching products, limited by maxResults
 */
export function findProductsForIngredient(
  ingredientName: string, 
  products: StripeProduct[], 
  maxResults: number = 2
): StripeProduct[] {
  if (!ingredientName || !products?.length) return [];

  // Normalize ingredient name for comparison
  const normalizedIngredient = ingredientName.toLowerCase().trim();
  
  // Don't match very short ingredient names to avoid false positives
  if (normalizedIngredient.length < 3) return [];

  const matchingProducts = products.filter(product => {
    const ingredients = product.metadata?.['ingredients'] || '';
    
    // Skip products with no ingredients metadata
    if (!ingredients.trim()) return false;
    
    // Split by comma, normalize, and filter out empty entries
    const ingredientList = ingredients
      .toLowerCase()
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length >= 3); // Filter out very short ingredients
    
    // Check for exact matches or clear partial matches
    return ingredientList.some(ingredient => {
      // Exact match (preferred)
      if (ingredient === normalizedIngredient) return true;
      
      // Allow partial matching only if the match is substantial
      // Either the ingredient contains the search term (cacao in "raw cacao")
      // OR the search term contains the ingredient if ingredient is long enough
      if (ingredient.includes(normalizedIngredient)) return true;
      if (ingredient.length >= 4 && normalizedIngredient.includes(ingredient)) return true;
      
      return false;
    });
  });

  return matchingProducts.slice(0, maxResults);
}

/**
 * Extract ingredient name from card title for product matching
 * @param cardTitle The title from the card (e.g., "Raw Cacao", "Lion's Mane")
 * @returns Normalized ingredient name
 */
export function extractIngredientFromTitle(cardTitle: string): string {
  return cardTitle
    .toLowerCase()
    .replace(/^raw\s+/, '') // Remove "raw" prefix
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();
} 
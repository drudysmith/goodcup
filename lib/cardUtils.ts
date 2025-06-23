import cardDataJson from '../data/cards.json';

// Card data interface
export interface CardData {
  id: number;
  carouselContent: {
    title: string;
    description: string;
  };
  expandedContent: {
    content: string;
  };
  imageUrl?: string;
}

// Import and validate card data from JSON
export const cardData: CardData[] = cardDataJson as CardData[];

// Helper function to create the full card array by repeating the base cards for the carousel effect
export const createCardArray = (baseCards: CardData[], repetitions: number = 5): CardData[] => {
  const fullArray: CardData[] = [];
  for (let i = 0; i < repetitions; i++) {
    fullArray.push(...baseCards);
  }
  return fullArray;
};

// Default export for the card data
export default cardData; 
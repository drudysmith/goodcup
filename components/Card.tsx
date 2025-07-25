import React, { useState, useEffect } from 'react';
import { StyledText } from '../lib/textUtils';
import { LOG_ENABLED } from '../lib/utils/log';
import { findProductsForIngredient, extractIngredientFromTitle } from '../lib/productUtils';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';

interface CarouselContent {
  title: string;
  description: string;
}

interface ExpandedContent {
  content: string;
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

interface CardProps {
  carouselContent: CarouselContent;
  expandedContent: ExpandedContent;
  imageUrl?: string;
  onClick?: () => void;
  className?: string;
  isExpanded?: boolean;
  products?: StripeProduct[];
  addItem?: (item: CartItem) => void;
  // Refs for debugging computed styles
  imageContainerRef?: React.RefObject<HTMLDivElement | null>;
  textOverlayRef?: React.RefObject<HTMLDivElement | null>;
  tryItButtonRefs?: React.RefObject<HTMLButtonElement | null>[];
}

const Card: React.FC<CardProps> = ({ 
  carouselContent,
  expandedContent,
  imageUrl = '/media/card_art/card_01.webp', // Fallback in case imageUrl is not provided
  onClick,
  className = "",
  isExpanded = false,
  products = [],
  addItem,
  imageContainerRef,
  textOverlayRef,
  tryItButtonRefs = []
}) => {
  const [imageScale, setImageScale] = useState<'normal' | 'expanded' | 'hover'>('normal');
  const [hasPlayedInitial, setHasPlayedInitial] = useState(false);

  // Auto-play animation when card becomes expanded
  useEffect(() => {
    if (isExpanded && !hasPlayedInitial) {
      // Longer delay for more prolonged effect
      const timer = setTimeout(() => {
        setImageScale('expanded');
        setHasPlayedInitial(true);
      }, 800);
      
      return () => clearTimeout(timer);
    } else if (!isExpanded) {
      // Reset when card is no longer expanded
      setImageScale('normal');
      setHasPlayedInitial(false);
    }
  }, [isExpanded, hasPlayedInitial]);

  const handleMouseEnter = () => {
    if (isExpanded && hasPlayedInitial) {
      setImageScale('hover');
    }
  };

  const handleMouseLeave = () => {
    if (isExpanded && hasPlayedInitial) {
      setImageScale('expanded');
    }
  };

  const getImageTransform = () => {
    switch (imageScale) {
      case 'hover':
        return 'scale-100'; // Normal size on hover (reverse)
      case 'expanded':
        return 'scale-110'; // Slightly enlarged when expanded
      case 'normal':
      default:
        return 'scale-100'; // Normal size
    }
  };

  const renderCarouselContent = () => (
    <div className="h-3/5 bg-surface flex flex-col justify-center px-4 text-left">
      {/* Title - larger */}
      <div className="text-neutral-border font-semibold text-2xl mb-2">
        {carouselContent.title}
      </div>
      {/* Description - with flexible text styling */}
      <div className="text-neutral-border text-lg leading-tight whitespace-pre-line">
        <StyledText>{carouselContent.description}</StyledText>
      </div>
    </div>
  );

  const renderExpandedContent = () => {
    // Find matching products for this ingredient
    const ingredientName = extractIngredientFromTitle(carouselContent.title);
    const matchingProducts = findProductsForIngredient(ingredientName, products, 2);
    const { data: promo } = useBannerPromoQuery();

    return (
      <div className="h-3/5 bg-surface flex flex-col justify-start px-6 py-6 text-left overflow-y-visible">
        <div className="text-neutral-border text-xl md:text-lg leading-relaxed whitespace-pre-line mb-4">
          <StyledText>{expandedContent.content}</StyledText>
        </div>
        
        {/* Feel It buttons for matching products */}
        {matchingProducts.length > 0 && addItem && (
          <div className="flex flex-col gap-2 mt-auto">
            {matchingProducts.map((product, index) => {
              const price = product.prices[0];
              let displayPrice = price?.unit_amount || 0;
              let promoPrice = null;
              if (promo && (promo.percent_off || promo.amount_off)) {
                if (promo.percent_off) {
                  promoPrice = displayPrice * (1 - promo.percent_off / 100);
                } else if (promo.amount_off) {
                  promoPrice = displayPrice - promo.amount_off;
                }
              }
              return (
                <button
                  key={product.id}
                  ref={tryItButtonRefs[index]}
                  className="bg-brand-secondary text-white px-4 py-2 rounded-full font-medium text-lg md:text-lg
                           transition-all duration-200 ease-in-out 
                           hover:scale-105 hover:shadow-lg 
                           active:scale-95"
                  onTouchStart={(e) => {
                    console.log('[Modal Debug] Button onTouchStart event details:', {
                      target: e.target,
                      currentTarget: e.currentTarget,
                      touches: e.touches.length,
                      clientX: e.touches[0]?.clientX,
                      clientY: e.touches[0]?.clientY,
                      pageX: e.touches[0]?.pageX,
                      pageY: e.touches[0]?.pageY,
                      targetTagName: e.target instanceof Element ? e.target.tagName : 'unknown',
                      targetClass: e.target instanceof Element ? e.target.className : 'unknown'
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[Modal Debug] ENTER onClick handler');
                    console.log('[Modal Debug] Button onClick triggered');
                    console.log('[Modal Debug] Button onClick event details:', {
                      target: e.target,
                      currentTarget: e.currentTarget,
                      clientX: e.clientX,
                      clientY: e.clientY,
                      pageX: e.pageX,
                      pageY: e.pageY,
                      isTrusted: e.isTrusted,
                      type: e.type,
                      targetTagName: e.target instanceof Element ? e.target.tagName : 'unknown',
                      targetClass: e.target instanceof Element ? e.target.className : 'unknown'
                    });
                    console.log('[Modal Debug] product object:', product);
                    console.log('[Modal Debug] addItem function invoked');
                    setTimeout(() => {
                      console.log('[Modal Debug] Button click handler reached (delayed)');
                    }, 0);
                    if (product.prices[0]) {
                      addItem({
                        productId: product.id,
                        priceId: product.prices[0].id,
                        quantity: 1
                      });
                      if (LOG_ENABLED) {
                        console.log('Feel It clicked for:', product.name);
                      }
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault(); // Prevent synthetic click from being generated
                    console.log('[Modal Debug] ENTER onTouchEnd handler');
                    console.log('[Modal Debug] Button onTouchEnd triggered');
                    console.log('[Modal Debug] Button onTouchEnd event details:', {
                      target: e.target,
                      currentTarget: e.currentTarget,
                      changedTouches: e.changedTouches.length,
                      clientX: e.changedTouches[0]?.clientX,
                      clientY: e.changedTouches[0]?.clientY,
                      pageX: e.changedTouches[0]?.pageX,
                      pageY: e.changedTouches[0]?.pageY,
                      targetTagName: e.target instanceof Element ? e.target.tagName : 'unknown',
                      targetClass: e.target instanceof Element ? e.target.className : 'unknown'
                    });
                    console.log('[Modal Debug] product object:', product);
                    console.log('[Modal Debug] addItem function invoked');
                    setTimeout(() => {
                      console.log('[Modal Debug] Button click handler reached (delayed)');
                    }, 0);
                    if (product.prices[0]) {
                      addItem({
                        productId: product.id,
                        priceId: product.prices[0].id,
                        quantity: 1
                      });
                      if (LOG_ENABLED) {
                        console.log('Feel It touched for:', product.name);
                      }
                    }
                  }}
                >
                  Try {product.name.split('(')[0].trim()}
                  <span className="ml-2">
                    {promoPrice && promoPrice < displayPrice ? (
                      <>
                        <span className="line-through text-lg opacity-60 mr-1">${(displayPrice / 100).toFixed(2)}</span>
                        <span className="text-lg font-bold">${(promoPrice / 100).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">${(displayPrice / 100).toFixed(2)}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`w-full h-full bg-white rounded-lg overflow-hidden shadow-md flex flex-col cursor-pointer ${!isExpanded ? 'transition-transform duration-200 hover:scale-105' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Image section - top 2/5 */}
      <div 
        className="h-2/5 relative overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={imageContainerRef}
          className={`relative z-0 w-full h-full bg-cover bg-center transition-transform duration-[4000ms] ease-out ${getImageTransform()}`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        
        {/* Text overlay - only visible when expanded */}
        {isExpanded && (
          <div ref={textOverlayRef} className="absolute top-4 left-4 z-20 pointer-events-none">
            <h2 className="text-white font-light text-4xl md:text-5xl lg:text-6xl drop-shadow-lg leading-tight">
              {carouselContent.title.split(' ').map((word, index) => (
                <div key={index}>{word}</div>
              ))}
            </h2>
          </div>
        )}
      </div>
      
      {/* Content section - bottom 3/5 */}
      {isExpanded ? renderExpandedContent() : renderCarouselContent()}
    </div>
  );
};

export default Card; 

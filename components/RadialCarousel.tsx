import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { CardData, cardData as defaultCardData, createCardArray } from '../lib/cardUtils';
import { findProductsForIngredient, extractIngredientFromTitle } from '../lib/productUtils';
import { createPortal } from 'react-dom';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}



// Responsive positioning configuration - easy to adjust manually
const RESPONSIVE_CONFIG = {

  // Navigation button positioning
  buttons: {
    mobile: {
      left: '10%',        // Left button horizontal position
      right: '10%',       // Right button horizontal position  
      top: '54%',         // Vertical position for both buttons
    },
    desktop: {
      left: '22%',        // Left button horizontal position
      right: '45%',       // Right button horizontal position
      top: '55%',         // Vertical position for both buttons
    }
  },
  
  // Wheel container margins and positioning
  wheelContainer: {
    mobile: {
      marginTop: '100px',    // Top margin (negative pulls up)
      marginBottom: '20px',  // Bottom margin (positive pushes down)
      height: '75vh',        // Section height
      //paddingTop: '20px',
      wheelTop: '30%',       // Wheel vertical position within section
      wheelLeft: '30%',      // Wheel horizontal position (centered on mobile)
    },
    desktop: {
      marginTop: '-60px',    // Top margin (negative pulls up)  
      marginBottom: '10px',   // Bottom margin

      height: '125vh',        // Section height
      wheelTop: '37%',       // Wheel vertical position within section
      wheelLeft: '30%',      // Wheel horizontal position (offset left on desktop)
    }
  },
  
  // Wheel sizing control - the invisible circular container that cards rotate around
  wheelSize: {
    mobile: {
      width: '650vw',        // Wheel width (viewport width units for responsiveness) - increased for wider arc
      height: '650vw',       // Wheel height (should match width for perfect circle)
      maxWidth: '2800px',    // Maximum wheel width in pixels (prevents too large on big screens)
      maxHeight: '2800px',   // Maximum wheel height in pixels
    },
    desktop: {
      width: '550vw',        // Larger wheel on desktop for more dramatic effect - increased for wider arc
      height: '550vw',       // Larger wheel height (should match width)
      maxWidth: '3300px',    // Higher maximum for desktop
      maxHeight: '3300px',   // Higher maximum for desktop
    }
  },
  
  // Individual carousel card sizing control
  cardSize: {
    mobile: {
      widthPercent: '8%',    // Card width as percentage of wheel container
      maxWidth: '160px',     // Maximum card width in pixels
      aspectRatio: '2/3',    // Card aspect ratio (width/height) - 2:3 is portrait
    },
    desktop: {
      widthPercent: '6%',    // Smaller percentage on desktop (since wheel is bigger)
      maxWidth: '185px',     // Larger maximum width on desktop
      aspectRatio: '2/3',    // Same aspect ratio for consistency
    }
  },
  
  // Breakpoint for mobile/desktop detection (pixels)
  mobileBreakpoint: 768
};

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

interface RadialCarouselProps {
  className?: string;
  cardData?: CardData[];
  products?: StripeProduct[];
  addItem?: (item: CartItem) => void;
}

const RadialCarousel: React.FC<RadialCarouselProps> = ({ 
  className = "",
  cardData = defaultCardData,
  products = [],
  addItem
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTriggerRef = useRef<any>(null);
  
  const [currentRotation, setCurrentRotation] = useState(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  
  // Responsive state management
  const [isMobile, setIsMobile] = useState(false);

  // Expanded card size configuration
  const EXPANDED_CARD_CONFIG = {
    mobile: {
      minWidth: '320px',
      viewportPercent: '80vw', 
      maxWidth: '400px',
    },
    desktop: {
      minWidth: '320px',
      viewportPercent: '25vw', 
      maxWidth: '400px',
    }
  };

  // Create the full card array for the carousel
  const fullCardArray = createCardArray(cardData);
  const cardAngleStep = 360 / fullCardArray.length;
  
  // Helper function to get current responsive config
  const getCurrentConfig = () => {
    return isMobile ? 'mobile' : 'desktop';
  };
  
  // Helper functions to get responsive values with clear commenting
  const getButtonPositions = () => {
    const config = RESPONSIVE_CONFIG.buttons[getCurrentConfig()];
    return {
      left: config.left,
      right: config.right,
      top: config.top
    };
  };
  
  const getWheelContainerStyle = () => {
    const config = RESPONSIVE_CONFIG.wheelContainer[getCurrentConfig()];
    return {
      marginTop: config.marginTop,
      marginBottom: config.marginBottom,
      height: config.height,
      wheelTop: config.wheelTop,
      wheelLeft: config.wheelLeft
    };
  };
  
  const getWheelSizeStyle = () => {
    const config = RESPONSIVE_CONFIG.wheelSize[getCurrentConfig()];
    return {
      width: `min(${config.width}, ${config.maxWidth})`, // Use min() to cap at maximum
      height: `min(${config.height}, ${config.maxHeight})`, // Use min() to cap at maximum
      maxWidth: 'none', // Remove default maxWidth since we're using min()
    };
  };
  
  const getCardSizeStyle = () => {
    const config = RESPONSIVE_CONFIG.cardSize[getCurrentConfig()];
    return {
      width: config.widthPercent,     // Width as percentage of wheel
      maxWidth: config.maxWidth,      // Maximum width in pixels
      aspectRatio: config.aspectRatio, // CSS aspect-ratio property
    };
  };

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Mouse drag handling
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragEnd, setDragEnd] = useState(0);
  const [lastDragTime, setLastDragTime] = useState(0);

  // Enhanced navigation with momentum - elegant and smooth
  const rotateWheel = (rotationAmount: number, withMomentum = false) => {
    if (!wheelRef.current) return;
    
    // Get the actual current rotation from GSAP for accuracy
    const actualCurrentRotation = gsap.getProperty(wheelRef.current, "rotation") as number;
    const newRotation = actualCurrentRotation + rotationAmount;
    const duration = withMomentum ? Math.min(1.2, Math.abs(rotationAmount) / 180) : 0.6; // More restrained for elegance
    
    // Create a manual animation that overrides ScrollTrigger temporarily
    // This approach is cleaner than disable/enable cycle
    gsap.to(wheelRef.current, {
      rotation: newRotation,
      duration: Math.max(0.4, duration), // Slightly faster for responsiveness
      ease: withMomentum ? "power2.out" : "power1.out",
      overwrite: "auto" // This prevents conflicts with ScrollTrigger
    });
    
    // Update state to match the new rotation
    setCurrentRotation(newRotation);
  };

  // Button navigation functions
  const navigateLeft = () => rotateWheel(cardAngleStep);
  const navigateRight = () => rotateWheel(-cardAngleStep);

  // Touch handlers for swipe with momentum
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
    setLastDragTime(Date.now());
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    // Prevent page scrolling when interacting with carousel
    if (Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const timeDiff = Date.now() - lastDragTime;
    const velocity = Math.abs(distance) / timeDiff;
    
    // Calculate rotation with momentum - more restrained for elegance
    let rotationAmount = (distance / 150) * cardAngleStep; // Reduced sensitivity for smoother control
    
    // Add momentum if swipe was fast, but keep it moderate
    if (velocity > 0.3) {
      rotationAmount *= Math.min(1.5, velocity); // Much more restrained momentum
    }
    
    // Apply minimum threshold for intentional swipes
    if (Math.abs(distance) > 20) {
      rotateWheel(-rotationAmount, true); // Negative because touch coordinates are inverted
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragEnd(0);
    setLastDragTime(Date.now());
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragEnd(e.clientX);
    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart) return;
    
    const distance = dragStart - (dragEnd || dragStart);
    const timeDiff = Date.now() - lastDragTime;
    const velocity = Math.abs(distance) / timeDiff;
    
    // Calculate rotation with momentum - more restrained for elegance
    let rotationAmount = (distance / 150) * cardAngleStep; // Reduced sensitivity to match touch
    
    // Add momentum if drag was fast, but keep it moderate
    if (velocity > 0.3) {
      rotationAmount *= Math.min(1.2, velocity); // Consistent with touch momentum
    }
    
    // Apply minimum threshold for intentional drags
    if (Math.abs(distance) > 20) {
      rotateWheel(-rotationAmount, true);
    }
    
    setIsDragging(false);
    document.body.style.cursor = 'auto';
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  // Card expansion handlers
  const handleCardClick = (index: number) => {
    setExpandedCard(index);
  };

  const handleCloseExpanded = () => {
    setExpandedCard(null);
  };

  // Close on escape key
  useLayoutEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedCard !== null) {
        handleCloseExpanded();
      }
    };

    if (expandedCard !== null) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [expandedCard]);

  // Responsive breakpoint detection effect
  useLayoutEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < RESPONSIVE_CONFIG.mobileBreakpoint);
    };
    
    // Initial check
    checkScreenSize();
    
    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useLayoutEffect(() => {
    if (!sectionRef.current || !wheelRef.current) return;

    const wheel = wheelRef.current;
    const cardElements = cardRefs.current.filter(Boolean);
    
    // Setup function to position cards in circle
    const setup = () => {
      if (!wheel || cardElements.length === 0) return;
      
      const radius = wheel.offsetWidth / 2;
      const center = radius;
      const slice = 360 / cardElements.length;
      const DEG2RAD = Math.PI / 180;

      gsap.set(cardElements, {
        x: (i) => center + radius * Math.sin(i * slice * DEG2RAD),
        y: (i) => center - radius * Math.cos(i * slice * DEG2RAD),
        rotation: (i) => i * slice,
        xPercent: -50,
        yPercent: -50
      });
    };

    // Initial setup
    setup();

    // Create ScrollTrigger with center zone detection and dynamic scrub
    const scrollTrigger = gsap.to(wheel, {
      rotation: -360,
      ease: "power1.out", // More elegant easing, previously set to "none"
      duration: cardElements.length * 0.1, // Slower rotation - increased duration
      scrollTrigger: {
        start: 0,
        end: "max",
        scrub: 2, // Constant scrub speed - soft interaction layer removed
        onUpdate: (self) => {
          // Track current rotation for manual controls
          setCurrentRotation(-360 * self.progress);
        }
      }
    });

    scrollTriggerRef.current = scrollTrigger;

    // Handle resize
    const handleResize = () => {
      setup();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollTrigger.scrollTrigger) {
        scrollTrigger.scrollTrigger.kill();
      }
      scrollTrigger.kill();
      // Reset cursor on cleanup
      document.body.style.cursor = 'auto';
    };
  }, [fullCardArray.length]);

  // Get current responsive styles
  const wheelContainerStyle = getWheelContainerStyle();
  const wheelSizeStyle = getWheelSizeStyle();
  const cardSizeStyle = getCardSizeStyle();
  const buttonPositions = getButtonPositions();

  const expandedCardRef = useRef<HTMLDivElement | null>(null);
  const tryItButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // Additional refs for Card internal elements
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const textOverlayRef = useRef<HTMLDivElement | null>(null);
  const tryItButtonRefs = useRef<React.RefObject<HTMLButtonElement>[]>([]);

  // Initialize button refs for the expanded card
  useEffect(() => {
    if (expandedCard !== null && products?.length) {
      const card = fullCardArray[expandedCard];
      if (card) {
        const ingredientName = extractIngredientFromTitle(card.carouselContent.title);
        const matchingProducts = findProductsForIngredient(ingredientName, products, 2);
        tryItButtonRefs.current = matchingProducts.map(() => React.createRef<HTMLButtonElement>());
      }
    }
  }, [expandedCard, products]);

  useEffect(() => {
    if (expandedCardRef.current) {
      // const cardStyles = window.getComputedStyle(expandedCardRef.current);
      // console.log('[Modal Debug] Expanded card (mount) computed styles:', {
      //   position: cardStyles.position,
      //   zIndex: cardStyles.zIndex,
      //   pointerEvents: cardStyles.pointerEvents,
      //   transform: cardStyles.transform
      // });
    }
    if (imageContainerRef.current) {
      // const imageStyles = window.getComputedStyle(imageContainerRef.current);
      // console.log('[Modal Debug] Image container (mount) computed styles:', {
      //   position: imageStyles.position,
      //   zIndex: imageStyles.zIndex,
      //   pointerEvents: imageStyles.pointerEvents,
      //   transform: imageStyles.transform
      // });
    }
    if (textOverlayRef.current) {
      // const textStyles = window.getComputedStyle(textOverlayRef.current);
      // console.log('[Modal Debug] Text overlay (mount) computed styles:', {
      //   position: textStyles.position,
      //   zIndex: textStyles.zIndex,
      //   pointerEvents: textStyles.pointerEvents,
      //   transform: textStyles.transform
      // });
    }
    tryItButtonRefs.current.forEach((ref, index) => {
      if (ref.current) {
        // const btnStyles = window.getComputedStyle(ref.current);
        // console.log(`[Modal Debug] Try It button ${index} (mount) computed styles:`, {
        //   position: btnStyles.position,
        //   zIndex: btnStyles.zIndex,
        //   pointerEvents: btnStyles.pointerEvents,
        //   transform: btnStyles.transform
        // });
      }
    });
  }, [expandedCard]);

  return (
    <section 
      ref={sectionRef}
      className={`relative w-full min-h-[350px] select-none ${className}`}
      onTouchStart={expandedCard !== null ? undefined : handleTouchStart}
      onTouchMove={expandedCard !== null ? undefined : handleTouchMove}
      onTouchEnd={expandedCard !== null ? undefined : handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'pan-y',
        contain: 'layout style', // CSS containment to isolate layout
        overflow: 'hidden', // Explicit overflow hidden
        height: wheelContainerStyle.height, // Responsive height
        marginTop: wheelContainerStyle.marginTop, // Responsive top margin
        marginBottom: wheelContainerStyle.marginBottom, // Responsive bottom margin
	
      }}
    >
      {/* Wheel container - responsive positioning and sizing with fade-out edges */}
      <div 
        ref={wheelRef}
        className="absolute flex items-center justify-center"
        style={{ 
          top: wheelContainerStyle.wheelTop, // Responsive vertical position
          left: wheelContainerStyle.wheelLeft, // Responsive horizontal position (centered on mobile, offset on desktop)
          transform: 'translateX(-50%)', // Always center horizontally based on left position
          width: wheelSizeStyle.width, // Responsive wheel width
          height: wheelSizeStyle.height, // Responsive wheel height (matches width for perfect circle)
          maxWidth: wheelSizeStyle.maxWidth, // Responsive maximum width
          contain: 'layout style size', // Strict containment
        }}
      >
        {/* Cards positioned in circle - responsive sizing */}
        {fullCardArray.map((cardData, index) => (
          <div
            key={`${cardData.id}-${index}`}
            ref={el => { cardRefs.current[index] = el; }}
            className="absolute top-0 left-0"
            style={{
              width: cardSizeStyle.width,           // Responsive card width as percentage
              maxWidth: cardSizeStyle.maxWidth,     // Responsive maximum width in pixels
              aspectRatio: cardSizeStyle.aspectRatio, // Responsive aspect ratio
            }}
          >
            <Card
              carouselContent={cardData.carouselContent}
              expandedContent={cardData.expandedContent}
              imageUrl={cardData.imageUrl}
              onClick={() => handleCardClick(index)}
              products={products}
              addItem={addItem}
            />
          </div>
        ))}
      </div>

      {/* Expanded Card Modal */}
      <AnimatePresence>
        {expandedCard !== null && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 backdrop-blur-md z-0 flex items-start justify-center pt-0 md:pt-40 p-4 pb-20"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCloseExpanded();
                }
              }}
            />
            {/* Expanded Card rendered via portal */}
            {typeof window !== 'undefined' && createPortal(
              <motion.div
                ref={expandedCardRef}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="fixed left-0 top-0 w-full h-full flex items-start justify-center z-[21] pointer-events-auto"
                style={{
                  pointerEvents: 'auto',
                  // Lower the card on mobile by increasing top padding
                  paddingTop: isMobile ? '20vh' : '10vh',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingBottom: '5vh',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="bg-white rounded-xl shadow-2xl overflow-hidden relative"
                  style={{
                    aspectRatio: '2/3',
                    width: isMobile 
                      ? `clamp(${EXPANDED_CARD_CONFIG.mobile.minWidth}, ${EXPANDED_CARD_CONFIG.mobile.viewportPercent}, ${EXPANDED_CARD_CONFIG.mobile.maxWidth})`
                      : `clamp(${EXPANDED_CARD_CONFIG.desktop.minWidth}, ${EXPANDED_CARD_CONFIG.desktop.viewportPercent}, ${EXPANDED_CARD_CONFIG.desktop.maxWidth})`,
                    maxHeight: '80vh'
                  }}
                >
                  {/* Close button - always visible, high z-index */}
                  <button
                    onClick={handleCloseExpanded}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 transition-colors duration-200 z-50 shadow-md border border-neutral-border"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    aria-label="Close expanded card"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1">
                      <Card
                        key={`expanded-${expandedCard}`}
                        carouselContent={fullCardArray[expandedCard].carouselContent}
                        expandedContent={fullCardArray[expandedCard].expandedContent}
                        imageUrl={fullCardArray[expandedCard].imageUrl}
                        isExpanded={true}
                        products={products}
                        addItem={addItem}
                        imageContainerRef={imageContainerRef}
                        textOverlayRef={textOverlayRef}
                        tryItButtonRefs={tryItButtonRefs.current}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>

      {/* Navigation arrows - always visible, responsive positioning */}
      <>
        {/* Left arrow - responsive positioning */}
        <button
          onClick={navigateLeft}
          className="absolute bg-white/10 backdrop-blur-sm rounded-full p-3 text-white hover:bg-white/20 transition-all duration-200 z-20"
          style={{
            left: buttonPositions.left, // Responsive horizontal position for left button
            top: buttonPositions.top,   // Responsive vertical position
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow - responsive positioning */}
        <button
          onClick={navigateRight}
          className="absolute bg-white/10 backdrop-blur-sm rounded-full p-3 text-white hover:bg-white/20 transition-all duration-200 z-20"
          style={{
            right: buttonPositions.right, // Responsive horizontal position for right button
            top: buttonPositions.top,     // Responsive vertical position
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </>

    </section>
  );
};

export default RadialCarousel; 

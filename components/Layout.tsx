'use client';

import React, { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSupabaseSession } from '../lib/queries/sessionQueries';
import LogoAnimated from "./LogoAnimated";
import Link from 'next/link';
import { UserIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../store/cartStore';
import { useVisitor } from '../lib/contexts/VisitorContext';
// @ts-expect-error: No types for flubber
import * as flubber from "flubber";

// Imported components
import CartPanel from './CartPanel';
import CupgradesPanel from './CupgradesPanel';
import NotificationBanner from './NotificationBanner';
import NavMenu from './NavMenu';
import { ContactInfoPopup } from './ContactInfoPopup';

// Imported constants and utilities
import { navLinks } from '../lib/constants';
import { findMostPopularProduct, findSuperHealingProduct } from '../lib/productUtils';
import { getHeaderTextClasses } from '../lib/styleUtils';

interface LayoutProps {
  children: ReactNode;
  overlay?: ReactNode;
}

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

// Query function for products
const fetchProducts = async (): Promise<{ products: StripeProduct[] }> => {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
};

// Module 7: User profile data fetching
const fetchUserProfile = async (session: any) => {
  if (!session?.user?.id) {
    throw new Error('No user session provided');
  }

  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
};

// Mutation function for contact info submission
const submitContactInfo = async ({ 
  visitorId, 
  email, 
  phone, 
  name 
}: { 
  visitorId: string; 
  email: string; 
  phone?: string; 
  name?: string; 
}) => {
  console.log('📡 Submitting contact info to Module 4 API:', { email, phone, name });
  
  const response = await fetch('/api/visitor/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      visitor_id: visitorId,
      email,
      phone,
      name
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit contact info');
  }

  return response.json();
};

const Layout: React.FC<LayoutProps> = ({ children, overlay }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isScrolledAndNarrow, setIsScrolledAndNarrow] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);
  const [cupgradesHovered, setCupgradesHovered] = useState(false);
  const [cupgradesClosing, setCupgradesClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const cupgradesRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<{ animateToNext: () => void }>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Module 7: Supabase User Session Handling
  const sessionQuery = useSupabaseSession();
  const userSession = sessionQuery.data;

  // Module 7: User profile query for authenticated users
  const userProfileQuery = useQuery({
    queryKey: ['userProfile', userSession?.user?.id],
    queryFn: () => fetchUserProfile(userSession),
    enabled: !!userSession?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Module 7: Derive user object from session and profile data
  const user = userSession ? {
    id: userSession.user.id,
    email: userSession.user.email || userProfileQuery.data?.email || '',
    name: userProfileQuery.data?.name || userSession.user.user_metadata?.name || ''
  } : null;

  const signOut = async () => {
    console.log('🚪 User signing out');
    if (userSession) {
      const { supabaseAnon } = await import('../lib/supabaseClient');
      await supabaseAnon.auth.signOut();
    }
    clearCart();
  };

  // Get centralized header text classes
  const headerStyles = getHeaderTextClasses({ isScrolled, isScrolledAndNarrow });

  // Scroll control for text containers
  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
	if (entry.isIntersecting) {
	  console.log('Animating:', entry.target); //test the listener
          const el = entry.target as HTMLElement;
          el.classList.remove('reveal-init');
          el.classList.add(`animate-${el.dataset.reveal}`);
          observer.unobserve(el);
	}
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  
  // Optimize cart store selectors
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const addItem = useCartStore((state) => state.addItem);

  // Visitor context for contact info popup
  const { visitorId, jwt, visitorData, isReady: visitorReady, updateVisitorIdentity, syncCartToDatabase } = useVisitor();

  // Module 7: Session handling and fallback logic
  useEffect(() => {
    if (sessionQuery.isSuccess) {
      if (userSession) {
        console.log('✅ Module 7: User session active - user data hydration in progress');
      } else if (visitorReady) {
        console.log('✅ Module 7: No user session - falling back to visitor auth');
      }
    }
  }, [sessionQuery.isSuccess, userSession, visitorReady]);

  // Track cart hydration to prevent SSR/hydration mismatch
  const [isCartHydrated, setIsCartHydrated] = useState(false);

  // Effect to mark cart as hydrated after client-side mount
  useEffect(() => {
    setIsCartHydrated(true);
  }, []);

  // Calculate total items in cart with useMemo
  const totalItems = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0), 
    [items]
  );

  // Products query
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Contact info submission mutation
  const contactInfoMutation = useMutation({
    mutationFn: submitContactInfo,
    onSuccess: (data) => {
      if (data.merged) {
        console.log(`🔁 Merge result: updated visitor_id ${data.visitor_id} and JWT`);
      } else {
        console.log(`📝 Enriched visitor_id ${data.visitor_id} with contact info`);
      }

      // Update visitor identity in context and localStorage
      updateVisitorIdentity(data.visitor_id, data.jwt, {
        name: data.visitor.name,
        email: data.visitor.email,
        phone: data.visitor.phone,
        cart: data.visitor.cart,
        street: data.visitor.street || null,
        unit: data.visitor.unit || null,
        city: data.visitor.city || null,
        state: data.visitor.state || null,
        postal_code: data.visitor.postal_code || null,
        country: data.visitor.country || null
      });

      setShowContactPopup(false);
      console.log('✅ Contact info merge completed successfully');
    },
    onError: (error) => {
      console.error('Failed to submit contact info:', error.message);
      // Could show user-facing error here
    },
  });

  // Find featured products using utility functions
  const mostPopularProduct = useMemo(() => {
    const products = productsQuery.data?.products || [];
    return findMostPopularProduct(products);
  }, [productsQuery.data?.products]);
  
  const superHealingProduct = useMemo(() => {
    const products = productsQuery.data?.products || [];
    return findSuperHealingProduct(products);
  }, [productsQuery.data?.products]);

  const closeMenu = useCallback(() => {
    if (menuOpen) {
      setMenuClosing(true);
      setTimeout(() => {
        setMenuOpen(false);
        setMenuClosing(false);
      }, 300); // Match animation duration
    }
  }, [menuOpen]);

  const closeCupgrades = useCallback(() => {
    if (cupgradesHovered) {
      setCupgradesClosing(true);
      setTimeout(() => {
        setCupgradesHovered(false);
        setCupgradesClosing(false);
      }, 300); // Match animation duration
    }
  }, [cupgradesHovered]);

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      setMenuOpen(true);
    }
  };

  // Handle banner visibility with localStorage and expiration
  useEffect(() => {
    const checkBannerDismissed = () => {
      const dismissedTime = localStorage.getItem('bannerDismissedAt');
      
      if (!dismissedTime) {
        setShowBanner(true);
        return;
      }
      
      // Check if 3 days have passed since dismissal
      const dismissedDate = new Date(dismissedTime);
      const currentDate = new Date();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      
      if (currentDate.getTime() - dismissedDate.getTime() > threeDaysInMs) {
        // 3 days have passed, show the banner again
        localStorage.removeItem('bannerDismissedAt');
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    };
    
    checkBannerDismissed();
    
    // Add reset function for developers
    window.resetNotificationBanner = () => {
      localStorage.removeItem('bannerDismissedAt');
      setShowBanner(true);
      console.log('Notification banner has been reset');
    };
    
    return () => {
      // Clean up the global function when component unmounts
      delete window.resetNotificationBanner;
    };
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('bannerDismissedAt', new Date().toISOString());
  };

  // Add scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Add scroll and resize detection for mobile header background
  useEffect(() => {
    const check = () => {
      const isNarrow = window.innerWidth < 1024; // Tailwind lg = 1024px
      setIsScrolledAndNarrow(window.scrollY > 0 && isNarrow);
      // 10% scroll logic
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setIsScrolledPast(scrollPercent > 0.1);
    };
    window.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    check();
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  // Add click outside effect to close menu
  useEffect(() => {
    if (!menuOpen || menuClosing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        menuButtonRef.current && 
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen, menuClosing, closeMenu]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeCart = useCallback(() => {
    if (cartHovered && !cartClosing) {
      setCartClosing(true);
      setTimeout(() => {
        setCartHovered(false);
        setCartClosing(false);
      }, 300);
    }
  }, [cartHovered, cartClosing]);

  // Check if contact info popup should be shown when cart opens
  useEffect(() => {
    if (cartHovered && visitorReady) {
      // Check if visitor is missing contact info
      const hasContactInfo = visitorData?.email || visitorData?.phone || visitorData?.name;
      console.log('🔍 Visitor data:', visitorData);
      if (!hasContactInfo) {
        console.log('🛒 User triggered contact info collection');
        setShowContactPopup(true);
      }
    }
  }, [cartHovered, visitorReady, visitorData]);

  const handleContactInfoSubmit = async (contactInfo: { email: string; phone?: string; name?: string }) => {
    if (!visitorId || !jwt) {
      console.error('Cannot submit contact info: missing visitor ID or JWT');
      return;
    }

    try {
      // Ensure cart is synced to database before merge
      console.log('🔄 Flushing cart updates before identity merge...');
      await syncCartToDatabase(items, jwt);
      console.log('✅ Cart flushed - proceeding with identity merge');
      
      // Use mutation instead of direct fetch
      contactInfoMutation.mutate({
        visitorId,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name: contactInfo.name
      });
    } catch (error) {
      console.error('Error syncing cart before contact info submission:', error);
      // Could show user-facing error here
    }
  };

  // Modern CSS scrollbar-gutter handles layout shift prevention automatically
  // This effect only manages scroll locking behavior
  useEffect(() => {
    if (cartHovered && !cartClosing) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [cartHovered, cartClosing]);

  // Cupgrades scroll lock effect
  useEffect(() => {
    if (cupgradesHovered && !cupgradesClosing) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [cupgradesHovered, cupgradesClosing]);

  // Hide wireframes globally - can be commented out to restore borders
  useEffect(() => {
    document.body.classList.add('hide-wireframes');
    
    return () => {
      document.body.classList.remove('hide-wireframes');
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      {/* Notification Banner */}
      <NotificationBanner 
        show={showBanner}
        onDismiss={dismissBanner}
      />

      {/* Fixed Header with scroll animation */}
      <header 
        ref={headerRef}
        className={`fixed ${showBanner ? 'top-[41px]' : 'top-0'} left-0 w-full border-b border-transparent flex items-center justify-center z-20 transition-all duration-300 ease-in-out bg-neutral-clear ${
          isScrolled ? 'h-[5.4rem]' : 'h-[6rem]'
        }${isScrolledAndNarrow ? ' scrolled' : ''}`}
      >
        <nav className={`w-full max-w-5xl xl:max-w-none xl:mx-0 flex items-center justify-between px-4 xl:px-12 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-0'
        }`}>
          {/* Left: Hamburger Menu and Search - now always visible */}
          <div className="flex items-center gap-3">
            <button
              ref={menuButtonRef}
              className={`flex flex-col justify-center items-center relative z-30 transition-all duration-300 ${headerStyles.iconSize} ${headerStyles.textColor} group`}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={toggleMenu}
            >
              <span
                className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
                  menuOpen ? 'rotate-45 translate-y-1.5' : 'group-hover:translate-y-[-2px]'
                }`}
              />
              <span
                className={`block w-6 h-0.5 my-1 bg-current transition-all duration-300 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-current transition-all duration-300 ${
                  menuOpen ? '-rotate-45 -translate-y-1.5' : 'group-hover:translate-y-[2px]'
                }`}
              />
            </button>

            {/* Search/Magnifying Glass Icon */}
            <div 
              ref={cupgradesRef}
              className="relative group"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setCupgradesHovered(!cupgradesHovered);
                }}
                className={`flex items-center justify-center transition-all duration-300 ${headerStyles.iconSize} ${headerStyles.textColor} hover:opacity-70`}
                aria-label="Discover Cupgrades"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 bg-neutral-border text-surface-background rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40 whitespace-nowrap">
                Discover Cupgrades
              </div>
            </div>
          </div>

          {/* Center: Goodcup Title */}
          <div className="flex items-center">
            <Link href="/" className={`font-light transition-all duration-300 ${headerStyles.logoSize} ${headerStyles.textColor} hover:opacity-80`}
            style={{ height: '90%', lineHeight: '1' }}>
              Goodcup
            </Link>
          </div>

          {/* Right: Cart and Account Icons */}
          <div className="flex items-center gap-4">
            {/* Account Icon */}
            <div className={user ? 'relative group' : 'relative group'}>
              {user ? (
                <>
                  <Link href="/dashboard" className={`font-medium hover:underline transition-all duration-300 transition-colors ${headerStyles.navSize} ${headerStyles.textColor} flex items-center hover:opacity-70`}>
                    <UserIcon className="h-6 w-6" aria-label="Dashboard" />
                  </Link>
                  <button
                    onClick={() => { signOut(); clearCart(); }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 bg-neutral-border text-surface-background rounded shadow text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-40"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className={`font-medium hover:underline transition-all duration-300 transition-colors ${headerStyles.navSize} ${headerStyles.textColor} hover:opacity-70`}>
                    <UserIcon className="h-6 w-6" aria-label="Dashboard" />
                  </Link>
                  {/* Tooltip for non-logged in users */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 bg-neutral-border text-surface-background rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40 whitespace-nowrap">
                    Dashboard
                  </div>
                </>
              )}
            </div>

            {/* Cart Icon with hover popup */}
            <div 
              ref={cartRef}
              className="relative"
            >
              <button
                onClick={(e) => {
                    e.preventDefault();
                    setCartHovered(!cartHovered);
                }}
                className={`font-medium hover:underline transition-all duration-300 transition-colors ${headerStyles.navSize} ${headerStyles.textColor} relative flex items-center cursor-pointer`}
              >
                {/* Simple Shopping Cart Icon to match image */}
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  aria-label="Cart"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="20" cy="20" r="1" />
                </svg>
                
                {/* Item Count Circle */}
                {isCartHydrated && totalItems > 0 && (
                  <span className="cart-count-badge">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Cart Hover Popup */}
              {(cartHovered || cartClosing) && (
                <CartPanel
                  items={items}
                  cartClosing={cartClosing}
                  onClose={closeCart}
                  cartActions={{ updateQuantity, removeItem }}
                  products={productsQuery.data?.products || []}
                  isOpen={cartHovered}
                />
              )}
            </div>

            {/* Cupgrades Panel */}
            {(cupgradesHovered || cupgradesClosing) && (
              <CupgradesPanel
                products={productsQuery.data?.products || []}
                cupgradesClosing={cupgradesClosing}
                onClose={closeCupgrades}
                addItem={addItem}
              />
            )}
          </div>
        </nav>
      </header>

      {/* Main Content Area - adjust padding-top based on header size and banner visibility */}
      <main className={`flex-1 w-full px-0 bg-surface transition-all duration-300 ${
        showBanner 
          ? (isScrolled ? 'pt-[6.5rem]' : 'pt-[7rem]') 
          : (isScrolled ? 'pt-[4.5rem]' : 'pt-[5rem]')
      }`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full h-36 bg-brand-dark border-t border-neutral-border flex flex-col items-center justify-start z-10 relative">
        {/* Animated Logo at top-center of footer */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-surface-background">
          <div onClick={() => logoRef.current?.animateToNext()} style={{ cursor: 'pointer' }}>
          <LogoAnimated ref={logoRef} />
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-surface-background">Footer (Fixed)</span>
        </div>
        
        {/* Developer reset button, subtle and unobtrusive */}
        <button 
          onClick={() => window.resetNotificationBanner?.()}
          className="absolute right-4 bottom-4 text-surface-background opacity-30 hover:opacity-100 text-xs"
          aria-label="Reset notification banner (developer only)"
        >
          Reset Banner
        </button>
        {/* Preview for Tailwind JIT */}
        <div className="text-surface-background" style={{position: 'absolute', left: -9999}}>Preview text</div>
      </footer>

      {/* Contact Info Popup */}
      {showContactPopup && (
        <ContactInfoPopup
          onClose={() => setShowContactPopup(false)}
          onSubmit={handleContactInfoSubmit}
        />
      )}

      {/* Overlay/Modal Placeholder */}
      {overlay && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-neutral-foreground bg-opacity-30">
          {overlay}
        </div>
      )}

      {/* Full-width Banner Dropdown Menu */}
      <NavMenu
        menuOpen={menuOpen}
        menuClosing={menuClosing}
        navLinks={navLinks}
        showBanner={showBanner}
        isScrolled={isScrolled}
      />
    </div>
  );
};

// Add global type for notification banner reset function
declare global {
  interface Window {
    resetNotificationBanner?: () => void;
  }
}

export default Layout; 

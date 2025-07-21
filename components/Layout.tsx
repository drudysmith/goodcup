'use client';

import React, { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSupabaseSession, useSupabaseSessionHelpers, useSessionExpiryMutation } from '../lib/queries/sessionQueries';
import { useWebhookSync } from '../lib/queries/webhookQueries';
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
import { AuthModal } from './AuthModal';
import { openAuthModal, updateCachedCredentials } from '../store/authModalStore';

// Imported constants and utilities
import { navLinks } from '../lib/constants';
import { findMostPopularProduct, findSuperHealingProduct } from '../lib/productUtils';
import { getHeaderTextClasses } from '../lib/styleUtils';
import { LOG_ENABLED } from '../lib/utils/log';

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

// SMU 4.3b: User profile response interface
interface UserProfileResponse {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  stripe_customer_id: string | null;
}

// Query function for products
const fetchProducts = async (): Promise<{ products: StripeProduct[] }> => {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
};

// Module 7: User profile data fetching (with Module 8 session expiry handling)
const fetchUserProfile = async (session: any, sessionExpiryHandler?: () => Promise<boolean>): Promise<UserProfileResponse> => {
  if (!session?.user?.id) {
    throw new Error('No user session provided');
  }

  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    // Module 8: Handle session expiry (401/403 errors)
    if ((response.status === 401 || response.status === 403) && sessionExpiryHandler) {
      if (LOG_ENABLED) {
        console.log('⏰ User session expired — prompting re-auth');
      }
      const refreshed = await sessionExpiryHandler();
      if (refreshed) {
        // Retry the request with the refreshed session
        return fetchUserProfile(session, sessionExpiryHandler);
      }
    }
    throw new Error('Failed to fetch user profile');
  }

  const profileData = await response.json();
  
  // SMU 4.3b: Log the Stripe customer ID from client
  if (LOG_ENABLED) {
    console.log('🔄 SMU 4.3b: Stripe customer ID loaded:', profileData.stripe_customer_id);
  }
  
  return profileData;
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
  if (LOG_ENABLED) {
    console.log('📡 Submitting contact info to Module 4 API:', { email, phone, name });
  }
  
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
  
  // Module 7.5: Session status popup state
  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [sessionPopupMessage, setSessionPopupMessage] = useState('');
  const [sessionPopupTimer, setSessionPopupTimer] = useState<NodeJS.Timeout | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const cupgradesRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<{ animateToNext: () => void }>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Module 7: Supabase User Session Handling
  const sessionQuery = useSupabaseSession();
  const userSession = sessionQuery.data;
  
  // Module 8: Session expiry handling
  const { handleExpiredSession } = useSupabaseSessionHelpers();
  const sessionExpiryMutation = useSessionExpiryMutation();

  // Module B: Webhook sync for real-time Stripe data updates
  useWebhookSync();

  // Module 7: User profile query for authenticated users (with Module 8 session expiry handling)
  const userProfileQuery = useQuery({
    queryKey: ['userProfile', userSession?.user?.id],
    queryFn: () => fetchUserProfile(userSession, handleExpiredSession),
    enabled: !!userSession?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Module 8: Don't retry on auth errors - they're handled by session expiry logic
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Module 7: Derive user object from session and profile data
  const user = userSession ? {
    id: userSession.user.id,
    email: userSession.user.email || userProfileQuery.data?.email || '',
    name: userProfileQuery.data?.name || userSession.user.user_metadata?.name || '',
    stripeCustomerId: userProfileQuery.data?.stripe_customer_id || null
  } : null;

  const signOut = async () => {
    if (LOG_ENABLED) {
      console.log('🚪 User signing out');
    }
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
	  if (LOG_ENABLED) {
	    console.log('Animating:', entry.target); //test the listener
	  }
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
        if (LOG_ENABLED) {
          console.log('✅ Module 7: User session active - user data hydration in progress');
        }
      } else if (visitorReady) {
        if (LOG_ENABLED) {
          console.log('✅ Module 7: No user session - falling back to visitor auth');
        }
      }
    }
  }, [sessionQuery.isSuccess, userSession, visitorReady]);

  // Module 7.5: Session status popup management
  const showSessionStatusPopup = (message: string) => {
    // Clear existing timer
    if (sessionPopupTimer) {
      clearTimeout(sessionPopupTimer);
    }
    
    setSessionPopupMessage(message);
    setShowSessionPopup(true);
    
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setShowSessionPopup(false);
    }, 3000);
    
    setSessionPopupTimer(timer);
  };

  // Module 7.5: Track previous session state to detect changes
  const [prevUserSessionId, setPrevUserSessionId] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Module 7.5: Monitor session changes for popup display
  useEffect(() => {
    if (sessionQuery.isSuccess) {
      const currentUserId = userSession?.user?.id || null;
      
      // login notification
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
        if (currentUserId) {
          if (LOG_ENABLED) {
            console.log('✅ Session status popup: user logged in');
          }
          showSessionStatusPopup("You're logged in.");
        }
      } else if (currentUserId && currentUserId !== prevUserSessionId) {
        if (LOG_ENABLED) {
          console.log('✅ Session status popup: user logged in');
        }
        showSessionStatusPopup("You're logged in.");
      }

      setPrevUserSessionId(currentUserId);
    }

    if (sessionQuery.isError) {
      // Show session expired message for actual errors
      if (hasInitialLoad && prevUserSessionId) {
        if (LOG_ENABLED) {
          console.log('⚠️ Session status popup: session expired');
        }
        showSessionStatusPopup('Session expired — please log in again.');
      }
    }
  }, [sessionQuery.isSuccess, sessionQuery.isError, userSession?.user?.id, prevUserSessionId, hasInitialLoad]);

  // Module 7.5: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sessionPopupTimer) {
        clearTimeout(sessionPopupTimer);
      }
    };
  }, [sessionPopupTimer]);

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
        if (LOG_ENABLED) {
          console.log(`🔁 Merge result: updated visitor_id ${data.visitor_id} and JWT`);
        }
      } else {
        if (LOG_ENABLED) {
          console.log(`📝 Enriched visitor_id ${data.visitor_id} with contact info`);
        }
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
      if (LOG_ENABLED) {
        console.log('✅ Contact info merge completed successfully');
      }
    },
    onError: (error) => {
      if (LOG_ENABLED) {
        console.error('Failed to submit contact info:', error.message);
      }
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
      if (LOG_ENABLED) {
        console.log('Notification banner has been reset');
      }
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
    if (cartHovered && visitorReady && !userSession) {
      // Check if visitor is missing contact info
      const hasContactInfo = visitorData?.email || visitorData?.phone || visitorData?.name;
      if (LOG_ENABLED) {
        console.log('🔍 Visitor data:', visitorData);
      }
      if (!hasContactInfo) {
        if (LOG_ENABLED) {
          console.log('🛒 User triggered contact info collection');
        }
        setShowContactPopup(true);
      }
    }
  }, [cartHovered, visitorReady, visitorData, userSession]);

  const handleContactInfoSubmit = async (contactInfo: { email: string; phone?: string; name?: string }) => {
    if (!visitorId || !jwt) {
      if (LOG_ENABLED) {
        console.error('Cannot submit contact info: missing visitor ID or JWT');
      }
      return;
    }

    try {
      // Ensure cart is synced to database before merge
      if (LOG_ENABLED) {
        console.log('🔄 Flushing cart updates before identity merge...');
      }
      await syncCartToDatabase(items, jwt);
      if (LOG_ENABLED) {
        console.log('✅ Cart flushed - proceeding with identity merge');
      }
      
      // Use mutation instead of direct fetch
      contactInfoMutation.mutate({
        visitorId,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name: contactInfo.name
      });
    } catch (error) {
      if (LOG_ENABLED) {
        console.error('Error syncing cart before contact info submission:', error);
      }
      // Could show user-facing error here
    }
  };

  // UxAuth 2: Auto-login prompt for returning visitors with accounts
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check all conditions for auto-login prompt
    const hasAccount = visitorData?.has_account === true;
    const noUserSession = !userSession;
    const loginOffered = sessionStorage.getItem('loginOffered') === 'true';

    if (LOG_ENABLED) {
      console.log('🔄 UxAuth 2: Checking auto-login conditions:', {
        hasAccount,
        noUserSession,
        loginOffered: !loginOffered,
        visitorEmail: visitorData?.email ? '***' + visitorData.email.slice(-8) : undefined
      });
    }

    if (hasAccount && noUserSession && !loginOffered) {
      if (LOG_ENABLED) {
        console.log('🔐 UxAuth 2: Triggering auto-login prompt for returning visitor');
      }
      
      // Get cached password if available
      const cachedCredentials = (() => {
        try {
          const cached = localStorage.getItem('cached_login_info');
          return cached ? JSON.parse(cached) : {};
        } catch {
          return {};
        }
      })();

      // Set flag to prevent repeated prompts this visit
      sessionStorage.setItem('loginOffered', 'true');

      // Open auth modal with prefilled email and password
      openAuthModal(visitorData?.email || undefined, cachedCredentials.password);
    }
  }, [visitorData?.has_account, visitorData?.email, userSession]);

  // UxAuth 2: Clear loginOffered flag when user signs in
  useEffect(() => {
    if (userSession) {
      if (LOG_ENABLED) {
        console.log('🔄 UxAuth 2: User signed in, clearing loginOffered flag');
      }
      sessionStorage.removeItem('loginOffered');
    }
  }, [userSession]);

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
          <div className="flex items-center gap-5">
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

            {/* Cupgrades / Market Icon */}
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
                aria-label="Cupgrades Market"
              >
                {/* Replaced magnifying glass with market5.svg, slightly larger and using currentColor */}
                <svg 
                  className="w-7 h-7" // slightly larger than w-6 h-6 or w-5 h-5
                  strokeWidth="2"
                  viewBox="0 0 98.69 82.49"
                  fill="currentColor"
                
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Cupgrades Market"
                >
                  <g>
                    <path fill="currentColor" stroke="currentColor" strokeWidth="3" d="M49.3,0c12.9,0,25.79,0,38.69,0,1.45,0,1.57.06,2.04,1.43,2.85,8.43,5.7,16.87,8.49,25.32.23.68.23,1.53.07,2.24-.74,3.29-2.77,5.49-5.91,6.68-.31.12-.62.26-.95.33-.98.23-1.31.86-1.29,1.81.07,3.67.14,7.33.17,11,.03,3.36,0,6.72.02,10.09.05,7.36.12,14.73.19,22.09.01,1.36,0,1.38-1.36,1.38-21.38.04-42.76.08-64.14.11-5.81,0-11.61.01-17.42,0-1.36,0-1.53-.14-1.54-1.52-.01-1.77.07-3.54.08-5.31.04-10.91.06-21.82.09-32.74,0-1.71.03-3.42.11-5.13.05-1.21-.36-1.97-1.52-2.51-2.63-1.21-4.52-3.19-5.02-6.11-.2-1.17-.03-2.51.34-3.65C2.96,17.55,5.6,9.61,8.21,1.66,8.68.22,8.98,0,10.52,0c10.73,0,21.45,0,32.18,0,2.2,0,4.4,0,6.6,0ZM89.28,81.23c.03-.35.07-.59.07-.83,0-2.87,0-5.75,0-8.62,0-11.34,0-22.68.01-34.02,0-.73-.07-1.17-.99-1.21-4.02-.16-7.18-1.93-9.44-5.28-.09-.13-.26-.21-.44-.35-2.2,3.75-5.42,5.54-9.7,5.55-4.31,0-7.49-1.93-9.7-5.63-2.36,3.74-5.62,5.58-9.86,5.61-4.29.03-7.52-1.91-9.82-5.59-2.2,3.82-5.42,5.61-9.71,5.61-4.34,0-7.52-1.92-9.74-5.73-2.74,4.7-6.92,6.17-11.98,5.66v44.99h8.99c0-.47,0-.86,0-1.25,0-11.4,0-22.8,0-34.2,0-1.53,0-1.54,1.51-1.54,7,0,14,0,21,0,1.65,0,1.82.18,1.82,1.85,0,11.28,0,22.56-.01,33.84,0,.38,0,.76,0,1.15h48ZM18.18,81.45c.47,0,.81,0,1.14,0,6.26,0,12.52,0,18.78,0,1.7,0,1.96-.27,1.96-1.96,0-8.28-.01-16.56-.02-24.84,0-2.66-.01-5.32,0-7.97,0-.84-.25-1.21-1.22-1.2-6.47.05-12.95.02-19.43.03-1.21,0-1.21,0-1.21,1.18,0,11.21,0,22.42,0,33.64v1.13ZM57.79,1.19c.06.83.13,1.58.18,2.34.15,2.34.28,4.69.44,7.03.21,3.07.44,6.14.66,9.2.19,2.58.31,5.17.61,7.74.21,1.78.66,3.52,2,4.89,3.33,3.43,8.96,3.98,12.91,1.19,2.11-1.49,3.45-3.49,3.23-6.1-.3-3.47-.87-6.93-1.36-10.38-.55-3.79-1.15-7.57-1.73-11.35-.24-1.53-.49-3.05-.73-4.57h-16.2ZM24.82,1.16c-.57,3.52-1.13,6.99-1.7,10.46-.77,4.74-1.54,9.47-2.31,14.21-.37,2.26-.08,4.37,1.44,6.2,2.67,3.19,7.47,4.29,11.43,2.55,2.74-1.2,4.66-3.09,5.03-6.22.12-1,.2-2,.28-3,.3-3.73.59-7.47.89-11.2.22-2.79.45-5.59.66-8.38.11-1.51.19-3.03.28-4.61h-16.01Z"/>
                  <path  fill="currentColor" stroke="currentColor" strokeWidth="3" d="M64.61,44.38c4.89,0,9.77,0,14.66,0,1.27,0,1.44.17,1.44,1.41,0,7.18,0,14.36,0,21.54,0,1.18-.2,1.38-1.39,1.38-9.9,0-19.79,0-29.69,0-1.14,0-1.32-.18-1.32-1.33,0-7.15,0-14.3,0-21.45,0-1.49.06-1.55,1.55-1.55,4.92,0,9.84,0,14.75,0ZM79.28,45.54h-29.51v21.9c.32.02.58.06.85.06,9.26,0,18.51,0,27.77.02.8,0,.95-.28.94-1.01-.02-6.69-.01-13.38-.02-20.08,0-.27-.02-.54-.04-.89Z"/>
                  <path d="M38.38,61.96c0,1.15-.88,1.97-2.15,1.98-1.23.01-2.21-.84-2.22-1.94,0-1.07,1.01-2.01,2.18-2.02,1.22-.01,2.18.86,2.19,1.97ZM36.17,60.68c-.38.53-.65.91-1.06,1.47.48.22.86.52,1.23.51.26,0,.78-.54.73-.66-.17-.44-.53-.81-.9-1.32Z"/>
                  <path d="M70.39,49.95c-.23.39-.38.86-.71,1.15-3.41,3.04-6.85,6.05-10.28,9.07-.88.78-1.79,1.53-2.68,2.29-.52-.64-.51-1.05.06-1.55,3.99-3.45,7.94-6.94,11.92-10.39.41-.35.95-.55,1.44-.82.08.08.17.16.25.25Z"/>
                  <path d="M55.84,57.19c-.73-.48-.69-.91-.2-1.34,2.1-1.85,4.19-3.71,6.32-5.53.31-.27.79-.33,1.19-.49.06.07.12.13.19.2-.14.3-.21.69-.44.9-2.35,2.12-4.73,4.2-7.07,6.27Z"/>
                  <path d="M73.66,53.2c-.16.3-.25.66-.49.87-2.13,1.91-4.28,3.8-6.46,5.66-.26.22-.72.22-1.09.31.13-.4.15-.93.42-1.17,2.06-1.85,4.17-3.65,6.28-5.44.29-.25.71-.35,1.06-.53.09.09.18.19.27.28Z"/>
                </g>
                </svg>
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 bg-neutral-border text-surface-background rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40 whitespace-nowrap">
                Cupgrades Market
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
                    Dashboard/Login
                  </button>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className={`font-medium hover:underline transition-all duration-300 transition-colors ${headerStyles.navSize} ${headerStyles.textColor} hover:opacity-70`}>
                    <UserIcon className="h-6 w-6" aria-label="Dashboard" />
                  </Link>
                  {/* Tooltip for non-logged in users */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 bg-neutral-border text-surface-background rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40 whitespace-nowrap">
                    Dashboard/Login
                  </div>
                </>
              )}

              {/* Module 7.5: Session Status Popup */}
              {showSessionPopup && (
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-2 bg-brand-secondary text-white rounded-lg shadow-lg text-sm z-50 whitespace-nowrap transition-all duration-300 ${
                    showSessionPopup ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
                  }`}
                  onClick={() => setShowSessionPopup(false)}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                >
                  {sessionPopupMessage}
                  {/* Small arrow pointing down */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-brand-secondary"></div>
                </div>
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
      <footer className="w-full bg-brand-dark border-t border-neutral-border flex flex-col items-center py-8 z-10 relative">
        {/* Animated Logo at top-center of footer */}
        <div className="mb-6 text-surface-background">
          <div onClick={() => logoRef.current?.animateToNext()} style={{ cursor: 'pointer' }}>
          <LogoAnimated ref={logoRef} />
          </div>
        </div>
        
        {/* Main Footer Content Container */}
        <div className="w-full max-w-4xl mx-auto px-4 text-center">
          {/* Tagline */}
          <h3 className="text-xl font-medium text-surface-background mb-6">
            Brew Better. Feel Better.
          </h3>
          
          {/* Social & Contact Info */}
          <div className="space-y-4 mb-8">
            {/* Instagram */}
            <div className="text-surface-background">
              <span className="text-base">Follow us: </span>
              <a 
                href="https://instagram.com/goodcup.me" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base font-medium hover:opacity-70 transition-opacity"
              >
                @goodcup.me
              </a>
            </div>
            
            {/* Location */}
            <div className="text-base text-surface-background">
              Brea, CA
            </div>
            
            {/* Contact Email */}
            <div className="text-surface-background">
              <a 
                href="mailto:hello@goodcup.me"
                className="text-base font-medium hover:opacity-70 transition-opacity"
              >
                hello@goodcup.me
              </a>
            </div>
          </div>
          
          {/* Newsletter Signup */}
          <div className="mb-8">
            <p className="text-base text-surface-background mb-4">
              Be first to know — Join our list
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded bg-surface text-text-primary placeholder:text-text-tertiary border border-neutral-border focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
              <button className="px-6 py-2 bg-brand-secondary text-white rounded font-medium hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>
          </div>
          
          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-surface-background">
            <a href="/" className="text-base hover:opacity-70 transition-opacity">
              Home
            </a>
            <button 
              onClick={() => {/* TODO: Open cupgrades panel */}}
              className="text-base hover:opacity-70 transition-opacity cursor-pointer"
            >
              Shop
            </button>
            <a href="/about" className="text-base hover:opacity-70 transition-opacity">
              About
            </a>
            <a href="mailto:hello@goodcup.me" className="text-base hover:opacity-70 transition-opacity">
              Contact
            </a>
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-surface-background opacity-70">
            <a href="/terms" className="hover:opacity-100 transition-opacity">
              Terms
            </a>
            <span>•</span>
            <a href="/privacy" className="hover:opacity-100 transition-opacity">
              Privacy
            </a>
          </div>
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

      {/* UxAuth 1: Universal Auth Modal */}
      <AuthModal />

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

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Responsive layout config
const GRAPH_LAYOUT_CONFIG = {
  mobile: {
    height: 'auto',
    marginTop: '-150px',
    marginBottom: '-50px',
    maxHeight: '90vh',
    paddingX: '3vw',
    scroll: {
      start: 'bottom 105%',      // start animation trigger point
      end: 'top 50%',            // end animation trigger point
      scrub: 3.3,                // scroll smoothness (lower = more responsive)
      markers: false,             // debug markers
    },
  },
  desktop: {
    height: '75vh',
    marginTop: '-250px',
    marginBottom: '2.5rem',
    maxHeight: '75vh',
    paddingX: '12vw',
    scroll: {
      start: 'bottom 125%',       // start animation trigger point
      end: 'bottom 95%',          // end animation trigger point
      scrub: 3.3,                 // scroll smoothness (lower = more responsive)
      markers: false,              // debug markers
    },
  },
};

const mobileBreakpoint = 768;

const ScrollTimeEffectGraph = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const lastLoggedPercentage = useRef<number>(-1);
  const hasLoggedStart = useRef<boolean>(false);
  const hasLoggedEnd = useRef<boolean>(false);
  const isLoadingRef = useRef<boolean>(false);

  // Detect mobile/desktop
  useLayoutEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Lottie + ScrollTrigger setup
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    let cancelled = false; // added flag

    const loadLottie = async () => {
      try {
        const [lottie, { gsap }, { ScrollTrigger }] = await Promise.all([
          import('lottie-web').then(m => m.default),
          import('gsap'),
          import('gsap/dist/ScrollTrigger'),
        ]);

        if (cancelled) {
          isLoadingRef.current = false;
          return;
        }

        gsap.registerPlugin(ScrollTrigger);

        if (!containerRef.current || cancelled) {
          isLoadingRef.current = false;
          return;
        }

        animationRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          path: '/lottie/ScrollTimeEffectGraph.json',
        });

        animationRef.current.addEventListener('DOMLoaded', () => {
          if (cancelled) {
            animationRef.current?.destroy();
            animationRef.current = null;
            return;
          }

          const animData = animationRef.current.animationData;
          if (!animData || !animData.op) {
            isLoadingRef.current = false;
            return;
          }

          const totalFrames = animData.op;

          // Get responsive configuration
          const currentLayout = isMobile
            ? GRAPH_LAYOUT_CONFIG.mobile
            : GRAPH_LAYOUT_CONFIG.desktop;
          const scrollConfig = currentLayout.scroll;

          // Store ScrollTrigger reference for synchronous cleanup
          (window as any).__goodcupScrollTrigger = ScrollTrigger;

          // Animation frames ScrollTrigger
          ScrollTrigger.create({
            trigger: containerRef.current,
            start: scrollConfig.start,
            end: scrollConfig.end,
            scrub: scrollConfig.scrub,
            markers: scrollConfig.markers,
            onUpdate: (self) => {
              if (animationRef.current && totalFrames) {
                const animationProgress = Math.min(self.progress / 1, 1.0);
                const frame = (totalFrames - 1) * animationProgress;
                animationRef.current.goToAndStop(frame, true);

                // Console logging for scroll progression
                const progressPercentage =
                  Math.floor(animationProgress * 100);

                // Track scroll progress without logging
                if (!hasLoggedStart.current && self.progress > 0) {
                  hasLoggedStart.current = true;
                }

                // Track percentage increments without logging
                if (
                  progressPercentage !== lastLoggedPercentage.current &&
                  progressPercentage >= 0 &&
                  progressPercentage <= 100
                ) {
                  if (progressPercentage > 0) {
                    // Track progress without logging
                  }
                  lastLoggedPercentage.current = progressPercentage;
                }

                // Track end of scroll without logging
                if (!hasLoggedEnd.current && progressPercentage >= 100) {
                  hasLoggedEnd.current = true;
                }
              }
            },
          });

          // Opacity fade ScrollTrigger - separate from animation frames
          ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top 100%',
            end: 'top 15%',
            toggleActions: 'play none reverse none',
            onEnter: () => setIsVisible(true),
            onLeaveBack: () => setIsVisible(false),
          });

          // Mark loading as complete
          isLoadingRef.current = false;
        });
      } catch (error) {
        // Error loading Lottie animation
      }
    };

    loadLottie();

    return () => {
      // Reset loading state
      isLoadingRef.current = false;
      cancelled = true; // mark cancelled

      // Cleanup animation
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }

      // Cleanup ScrollTrigger instances synchronously
      const ScrollTrigger = (window as any).__goodcupScrollTrigger;
      if (ScrollTrigger) {
        ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
      }

      // Reset logging state
      lastLoggedPercentage.current = -1;
      hasLoggedStart.current = false;
      hasLoggedEnd.current = false;
    };
  }, [isMobile]); // Add isMobile dependency to trigger re-setup when screen size changes

  // Apply responsive container layout
  const layout = isMobile
    ? GRAPH_LAYOUT_CONFIG.mobile
    : GRAPH_LAYOUT_CONFIG.desktop;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        maxWidth: '1200px',
        paddingLeft: layout.paddingX,
        paddingRight: layout.paddingX,
        height: layout.height,
        marginTop: layout.marginTop,
        marginBottom: layout.marginBottom,
        display: 'flex',
        alignItems: 'flex-start',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.8s ease-out',
      }}
    />
  );
};

export default ScrollTimeEffectGraph;


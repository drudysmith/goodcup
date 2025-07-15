import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
      end: 'top 40%',            // end animation trigger point
      scrub: 3.3,                // scroll smoothness (lower = more responsive)
      markers: false,            // debug markers
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
      end: 'bottom 85%',            // end animation trigger point
      scrub: 3.3,                // scroll smoothness (lower = more responsive)
      markers: false,             // debug markers
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
    const loadLottie = async () => {
      try {
        const [lottie, { gsap }, { ScrollTrigger }] = await Promise.all([
          import('lottie-web').then(m => m.default),
          import('gsap'),
          import('gsap/dist/ScrollTrigger'),
        ]);

        gsap.registerPlugin(ScrollTrigger);

        if (!containerRef.current) return;

        animationRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          path: '/lottie/ScrollTimeEffectGraph.json',
        });

        animationRef.current.addEventListener('DOMLoaded', () => {
          const animData = animationRef.current.animationData;
          if (!animData || !animData.op) return;

          const totalFrames = animData.op;
          
          // Get responsive configuration
          const currentLayout = isMobile ? GRAPH_LAYOUT_CONFIG.mobile : GRAPH_LAYOUT_CONFIG.desktop;
          const scrollConfig = currentLayout.scroll;

          // Animation frames ScrollTrigger
          ScrollTrigger.create({                 // we are only establishing the full scroll window
            trigger: containerRef.current,
            start: scrollConfig.start,           // responsive start position
            end: scrollConfig.end,               // responsive end position
            scrub: scrollConfig.scrub,           // responsive smoothness
            markers: scrollConfig.markers,       // responsive debug markers
            onUpdate: (self) => {
              if (animationRef.current && totalFrames) {
                const animationProgress = Math.min(self.progress / 1, 1.0); 
                const frame = (totalFrames - 1) * animationProgress;
                animationRef.current.goToAndStop(frame, true);
                
                // Console logging for scroll progression
                const progressPercentage = Math.floor(animationProgress * 100);
                
                // Log start of scroll
                if (!hasLoggedStart.current && self.progress > 0) {
                  console.log("start scroll");
                  hasLoggedStart.current = true;
                }
                
                // Log percentage increments
                if (progressPercentage !== lastLoggedPercentage.current && progressPercentage >= 0 && progressPercentage <= 100) {
                  if (progressPercentage > 0) {
                    console.log(`${progressPercentage}% scroll`);
                  }
                  lastLoggedPercentage.current = progressPercentage;
                }
                
                // Log end of scroll
                if (!hasLoggedEnd.current && progressPercentage >= 100) {
                  console.log("end scroll");
                  hasLoggedEnd.current = true;
                }
              }
            },
          });

          // Opacity fade ScrollTrigger - separate from animation frames
          ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top 100%',                    // when bottom of div is x% down the viewport
            end: 'top 15%',                      // same point - creates a toggle effect
            toggleActions: 'play none reverse none', // play on enter, reverse on leave back
            onEnter: () => setIsVisible(true),      // fade in when entering
            onLeaveBack: () => setIsVisible(false), // fade out when scrolling back up past trigger
          });
        });
      } catch (error) {
        console.error('Error in loadLottie:', error);
      }
    };

    loadLottie();

    return () => {
      if (animationRef.current) animationRef.current.destroy();
      import('gsap/dist/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      });
      // Reset logging state
      lastLoggedPercentage.current = -1;
      hasLoggedStart.current = false;
      hasLoggedEnd.current = false;
    };
  }, []);

  // Apply responsive container layout
  const layout = isMobile ? GRAPH_LAYOUT_CONFIG.mobile : GRAPH_LAYOUT_CONFIG.desktop;

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
        opacity: isVisible ? 1 : 0,                // controlled by ScrollTrigger
        transition: 'opacity 0.8s ease-out',       // smooth fade transition
      }}
    />
  );
};

export default ScrollTimeEffectGraph;

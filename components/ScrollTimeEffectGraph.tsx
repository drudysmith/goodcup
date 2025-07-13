import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Responsive layout config
const GRAPH_LAYOUT_CONFIG = {
  mobile: {
    height: 'auto',
    marginTop: '-150px',
    marginBottom: '40px',
    maxHeight: '90vh',
    paddingX: '3vw',
  },
  desktop: {
    height: 'auto',
    marginTop: '-250px',
    marginBottom: '2.5rem',
    maxHeight: '90vh',
    paddingX: '12vw',
  },
};

const mobileBreakpoint = 768;

const ScrollTimeEffectGraph = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

          // Animation frames ScrollTrigger
          ScrollTrigger.create({                 // we are only establishing the full scroll window
            trigger: containerRef.current,
            start: 'bottom 105%',                // higher val = sooner, use >100% for before entering viewport
            end: 'top 15%',                      // define the end of the scroll window
            scrub: 3.3,                          // smoothness
            onUpdate: (self) => {
              if (animationRef.current && totalFrames) {
                const animationProgress = Math.min(self.progress / 1, 1.0); 
                const frame = (totalFrames - 1) * animationProgress;
                animationRef.current.goToAndStop(frame, true);
              }
            },
          });

          // Opacity fade ScrollTrigger - separate from animation frames
          ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top 100%',                    // when bottom of div is x% down the viewport
            end: 'top 60%',                      // same point - creates a toggle effect
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

'use client'

import Layout from '../components/Layout';
import Section from '../components/Section';
import ScrollTimeEffectGraph from '../components/ScrollTimeEffectGraph';
import RadialCarousel from '../components/RadialCarousel';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

export default function Home() {
  const [showOrder, setShowOrder] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowOrder(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Video playlist logic with crossfade support
  const videoUrls = [
    "https://goodcup.me/hero-01.mp4",
    "https://goodcup.me/hero-07.mp4",
    "https://goodcup.me/hero-11.mp4",
    "https://goodcup.me/hero-14.mp4",
    "https://goodcup.me/hero-19.mp4",
    "https://goodcup.me/hero-24.mp4",
    "https://goodcup.me/hero-26.mp4",
    "https://goodcup.me/hero-27.mp4"
  ];
  const videoTextBlocks = [
    { headline: "Fuel Without the Fire", subline: "Smooth focus. No crash. No caffeine anxiety." },
    { headline: "Mornings That Taste Like Meaning", subline: "One scoop. One breath. One better day." },
    { headline: "Clarity, Not Chaos", subline: "Designed for rhythm, not rollercoasters." },
    { headline: "Sip. Breathe. Come Alive.", subline: "The ritual your mind has been waiting for." },
    { headline: "This Time, You Stay Clear", subline: "No crash. No question. Just you." },
    { headline: "Wakefulness, Reimagined", subline: "Gentle energy meets grounded clarity." },
    { headline: "Your Mind, in Flow", subline: "Calm, focused, and fully present." },
    { headline: "The Ritual That Listens Back", subline: "You don't just drink it — it meets you." },
  ];
  const [currentVideo, setCurrentVideo] = useState(0);
  const [previousVideo, setPreviousVideo] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setPreviousVideo(null);
        setIsTransitioning(false);
      }, 1200); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleVideoEnded = () => {
    const next = (currentVideo + 1) % videoUrls.length;
    setPreviousVideo(currentVideo);
    setCurrentVideo(next);
    setIsTransitioning(true);
  };

  // CTA microcopy array
  const ctaMicrocopy = [
    "Not another cup. A different one. Goodcup.",
    "The calmest energy you've ever met. Goodcup.",
    "You haven't sipped this yet. Goodcup.",
    "A new kind of clarity. Goodcup.",
    "This isn't mushroom coffee. Goodcup.",
    "This is your Cup-grade. Goodcup.",
    "Your ritual is evolving. Goodcup.",
    "Go ahead — unlearn your morning. Goodcup.",
    "It starts with one sip. Goodcup.",
    "Keep scrolling. You'll feel it. Goodcup."
  ];

  // Scroll cue state
  const [showScrollCue, setShowScrollCue] = useState(true);
  const [ctaPhrase, setCtaPhrase] = useState<string | null>(null);
  const [isHoveringScrollCue, setIsHoveringScrollCue] = useState(false);

  // ===== TEXT OVERLAY CONTROLS CONSOLIDATED =====
  const carouselRef = useRef(null);
  const scrollTimeGraphRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ==== Page Load Animation =====
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // ==== Page Scroll Animation =====
  const [hasScrolledPastThreshold, setHasScrolledPastThreshold] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      setHasScrolledPastThreshold(scrollPercent > 1); // use 1–2 for 1–2%
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // 768px = md: breakpoint, change to 640px or 1024px as needed
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Mobile viewport detection - Carousel
  const isCarouselInViewMobile = useInView(carouselRef, {
    amount: 0.15, // 0.01=early appearance, 0.3=30% up from bottom, 0.5=centered, 0.7=nearly past center
    margin: "300px 0px 150px 0px" // "top right bottom left" - 300px=appears earlier, 150px=disappears later
  });
  
  // Desktop viewport detection - Carousel
  const isCarouselInViewDesktop = useInView(carouselRef, {
    amount: 0.05, // 0.01=immediate, 0.25=25% up from bottom, 0.5=centered
    margin: "400px 0px 300px 0px" // "top right bottom left" - larger margins for desktop smoothness
  });
  
  const isCarouselInView = isMobile ? isCarouselInViewMobile : isCarouselInViewDesktop;

  // Mobile viewport detection - ScrollTimeEffectGraph
  const isScrollTimeGraphInViewMobile = useInView(scrollTimeGraphRef, {
    amount: 0.20, // 0.01=early appearance, 0.3=30% up from bottom, 0.5=centered, 0.7=nearly past center
    margin: "250px 0px 200px 0px" // "top right bottom left" - 250px=appears earlier, 200px=disappears later
  });
  
  // Desktop viewport detection - ScrollTimeEffectGraph
  const isScrollTimeGraphInViewDesktop = useInView(scrollTimeGraphRef, {
    amount: 0.10, // 0.01=immediate, 0.25=25% up from bottom, 0.5=centered
    margin: "350px 0px 250px 0px" // "top right bottom left" - larger margins for desktop smoothness
  });
  
  const isScrollTimeGraphInView = isMobile ? isScrollTimeGraphInViewMobile : isScrollTimeGraphInViewDesktop;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20 && showScrollCue) {
        setShowScrollCue(false);
        // Pick a random CTA phrase
        setCtaPhrase(ctaMicrocopy[Math.floor(Math.random() * ctaMicrocopy.length)]);
      } else if (window.scrollY <= 20 && !showScrollCue && !isHoveringScrollCue) {
        setShowScrollCue(true);
        setCtaPhrase(null);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showScrollCue, ctaMicrocopy, isHoveringScrollCue]);

  const handleMouseEnter = () => {
    setIsHoveringScrollCue(true);
    if (showScrollCue) {
      setShowScrollCue(false);
      setCtaPhrase(ctaMicrocopy[Math.floor(Math.random() * ctaMicrocopy.length)]);
    }
  };

  const handleMouseLeave = () => {
    setIsHoveringScrollCue(false);
    if (window.scrollY <= 20) {
      setShowScrollCue(true);
      setCtaPhrase(null);
    }
  };

  return (
    <Layout>
      <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[90vh] min-h-[350px] max-h-[800px] -mt-[120px] border-b border-neutral-border transition-all duration-500 overflow-hidden">
        {/* Previous video fading out */}
        {previousVideo !== null && (
          <motion.video
            key={`video-${previousVideo}`}
            src={videoUrls[previousVideo]}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: 0 }}
          />
        )}

        {/* Current video fading in */}
        <motion.video
          id={`video-${previousVideo}`}
          key={`video-${currentVideo}`}
          src={videoUrls[currentVideo]}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className="absolute inset-0 w-full h-full object-cover object-center"
          initial={{ opacity: isTransitioning ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0 }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="max-w-xs md:max-w-xl mx-auto text-surface-background font-sans font-light text-2xl md:text-4xl text-center px-4 drop-shadow-lg">
            
          </span>
        </div>
        
        {/* Video overlay text - bottom right */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${currentVideo}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="absolute bottom-8 right-8 md:bottom-12 md:right-12 text-white text-right max-w-[280px] sm:max-w-[320px] md:max-w-[380px] drop-shadow-md z-10 flex flex-col gap-2 items-end"
          >
            <div className="text-2xl md:text-5xl font-extralight leading-tight break-words">
              {videoTextBlocks[currentVideo].headline}
            </div>
            <div className="text-base md:text-xl font-light break-words leading-relaxed">
              {videoTextBlocks[currentVideo].subline}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="site-section-bg">
              {/* Scroll cue and CTA microcopy - now just under the hero image */}
      <div className="relative w-full flex flex-col items-center justify-center mt-2 mb-8 h-16">
        <AnimatePresence mode="wait">
          {showScrollCue && (
            <motion.div
              key="scroll-arrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center cursor-pointer"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <motion.svg
                width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-text-secondary opacity-80"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </motion.svg>
            </motion.div>
          )}
          {!showScrollCue && ctaPhrase && (
            <motion.div
              key="cta-microcopy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.6 }}
              className="text-text-secondary text-center text-base md:text-lg font-light drop-shadow-md max-w-xs md:max-w-sm"
              onMouseLeave={handleMouseLeave}
            >
              <div className="leading-relaxed">
                {ctaPhrase.replace(/ Goodcup\.$/, '')}
              </div>
              <div className="text-center mt-1 font-light">
                Goodcup.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ScrollTimeEffectGraph text overlay rendering - permanently mounted, opacity controlled to prevent layout shifts */}
      <div className="relative w-full -mt-40 mb-48 md:-mt-64 md:mb-56"> {/* mb-48/mb-56: spacing below overlay - increase for more gap, decrease for less */}
        <motion.div
          initial={false}                                     // initial={false} prevents animation on first render
          animate={{ 
            opacity: hasLoaded ? 1 : 0,         // opacity controlled by graph visibility
            y: hasLoaded ? 0 : 30               // y position controlled by graph visibility
          }}
          transition={{ duration: 0.6, delay: 0 }}          // Container: 0.8s duration, 0s delay
          className="
            fixed
	    z-10                                                   // fixed = positioned relative to viewport, z-10 = stacking order above other content
            mt-44 md:mt-80
	    left-[8vw] md:left-[15vw]
	  //	    right-[5vw] md:right-auto                    // desktop: 18vh from top, 12vw from left, max-w-45vw width limit
	    max-w-[85vw] md:max-w-[70vw]
            min-w-0
            flex flex-col gap-3 md:gap-5                                 // vertical layout with 3/5 spacing between header/paragraph - increase for more gap
          " 
        >
          {/* Header Text */}
          <motion.h2
            initial={false}                                  // initial={false} prevents animation on first render
            animate={{ 
              opacity: hasLoaded ? 1 : 0,       // opacity controlled by graph visibility
              x: hasLoaded ? 0 : -20            // x position controlled by graph visibility
            }}
            transition={{ duration: 0.6, delay: 0 }}      // Header: 0.3s delay = 0.3s after container
            className="
              text-neutral-border text-left font-light leading-tight    // text styling - font-light weight, leading-tight spacing, text-left alignment
              text-2xl md:text-5xl                                 // font size - text-2xl mobile, text-5xl desktop - matches carousel overlay sizing
            " 
          >
            Why does Goodcup feel so different?
          </motion.h2>
          
          {/* Paragraph Text */}
          <motion.p
            initial={false}                                  // initial={false} prevents animation on first render
            animate={{ 
              opacity: hasScrolledPastThreshold ? 0.6 : 0,       // opacity controlled by graph visibility
              x: hasScrolledPastThreshold ? 0 : -20            // x position controlled by graph visibility
            }}
            transition={{ duration: 0.8, delay: 0 }}      // Paragraph: 0.5s delay = 0.2s after header
            className="
              text-neutral-border text-left font-light leading-relaxed   // text styling - font-light weight, leading-relaxed spacing, text-left alignment
              text-base md:text-xl                                  // font size - text-base mobile, text-xl desktop - matches carousel overlay sizing
            " 
          >
            From jitters to flow. Most energy drinks spike and crash — giving you a moment of sharpness, then pulling the rug. Goodcup is different. We source guarana, matcha, and raw cacao — three ingredients that support a slower, more stable release of energy. Guarana, in particular, is metabolized over hours, not minutes, giving you clarity without chaos. The result? A grounded alertness you'll notice — and feel good about noticing. Twice the duration. Zero crash. Flow in body and mind.
          </motion.p>
        </motion.div>
      </div>
      
      {/* Fixed positioned ScrollTimeEffectGraph */}
      <div ref={scrollTimeGraphRef} className="relative z-[5]">
        <ScrollTimeEffectGraph />
      </div>

      {/* Carousel text overlay rendering - permanently mounted, opacity controlled to prevent layout shifts */}
      <div className="relative w-full mt-0 mb-0 md:-mt-0 md:mb-0"> {/* mb-16/mb-24: spacing below overlay - increase for more gap, decrease for less */}
        <motion.div
          initial={false}                                     // initial={false} prevents animation on first render
          animate={{ 
            opacity: isCarouselInView ? 1 : 0,               // opacity controlled by carousel visibility
            y: isCarouselInView ? 0 : 30                     // y position controlled by carousel visibility
          }}
          transition={{ duration: 0.2, delay: 0 }}        // Container: 0.8s duration, 0.3s delay
          className="
            fixed z-10                                                   // fixed = positioned relative to viewport, z-10 = stacking order above other content
            top-[15vh]
	    left-[8vw] md:left-[15vw]
	  //	    right-[5vw] md:right-auto
	    max-w-[85vw] md:max-w-[70vw]
            min-w-0
            flex flex-col gap-3 md:gap-5                                 // vertical layout with 3/5 spacing between header/paragraph - increase for more gap
          " 
        >
          {/* Header Text */}
          <motion.h2
            initial={false}                                  // initial={false} prevents animation on first render
            animate={{ 
              opacity: isCarouselInView ? 1 : 0,             // opacity controlled by carousel visibility
              x: isCarouselInView ? 0 : -20                  // x position controlled by carousel visibility
            }}
            transition={{ duration: 0.8, delay: 0.5 }}      // Header: 0.5s delay = 0.2s after container
            className="
              text-text-soft text-left font-light leading-tight    // text styling - font-light weight, leading-tight spacing, text-left alignment
              text-2xl md:text-5xl                                 // font size - text-2xl mobile, text-5xl desktop - change to xl/4xl for smaller, 3xl/6xl for larger
            " 
          >
            What's Inside Makes a Difference
          </motion.h2>
          
          {/* Paragraph Text */}
          <motion.p
            initial={false}                                  // initial={false} prevents animation on first render
            animate={{ 
              opacity: isCarouselInView ? 1 : 0,             // opacity controlled by carousel visibility
              x: isCarouselInView ? 0 : -20                  // x position controlled by carousel visibility
            }}
            transition={{ duration: 0.8, delay: 0.7 }}      // Paragraph: 0.7s delay = 0.2s after header
            className="
              text-text-soft text-left font-light leading-relaxed   // text styling - font-light weight, leading-relaxed spacing, text-left alignment
              text-base md:text-xl                                  // font size - text-base mobile, text-xl desktop - change to sm/lg for smaller, lg/2xl for larger
            " 
          >
	    {/*edit this copy*/}
            Guarana, matcha, and raw cacao deliver smooth, crash-free energy. Adaptogens like ashwagandha and reishi support mood, focus, and stress resilience. Prebiotics and plant compounds help your gut, metabolism, and long-term clarity. Browse ingredient benefits here.
          </motion.p>
        </motion.div>
      </div>
      
      {/* Fixed positioned radial carousel */}
      <div ref={carouselRef} className="mask-fade-sides relative z-[5] pb-20">
        <RadialCarousel />
      </div>
	{/*
        <Section 
          title="Why does Goodcup feel so different?"
          media={ <img src="https://res.cloudinary.com/dak7418bd/image/upload/v1749667229/curve-placeholder_tpnehz.webp" alt="Goodcup product visual"/> }
          text={`From jitters to flow. Most energy drinks spike and crash — giving you a moment of sharpness, then pulling the rug. Goodcup is different. We source guarana, matcha, and raw cacao — three ingredients that support a slower, more stable release of energy. Guarana, in particular, is metabolized over hours, not minutes, giving you clarity without chaos. The result? A grounded alertness you'll notice — and feel good about noticing. Twice the duration. Zero crash. Flow in body and mind.`}
          layout="image-left"
          bgColor="bg-transparent"
	        textColor="text-text-soft"
	        animation="blur-slide"
        />
        <Section
          title="Flexible Scheduling for Busy Lives"
          text="Flexible scheduling fits even the busiest calendars. Book sessions at times that work for you and your mentor."
          media={<img src="https://m.media-amazon.com/images/I/411mjzj45rL.jpg" alt="Flexible scheduling" />}
          layout="image-right"
          bgColor="bg-transparent"
	  textColor="text-text-soft"
         />
	  */}
      </div>
      

    </Layout>
  );
}

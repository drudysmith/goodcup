import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
// @ts-expect-error: No types for flubber
import * as flubber from "flubber";

// Updated SVG paths from the actual source files
const PATH_1 = "M71.87,31.61c-.87,8.22-11.35,12.12-17.96,14.47-2.46.88-3.07.34-4.7,2.72-2.03,2.96-2.15,5.29-6.06,6.59-4.92,1.64-16.72,1.65-21.63-.05-2.5-.86-2.61-2.97-3.72-5-.89-1.62-2.05-3.13-2.96-4.75-3.68-6.56-5.74-13.84-7.21-21.15-.58-2.89-.95-4.48,2.29-5.34,5.58-1.49,12.62-1.44,18.4-1.67,8.39-.32,18.01-.65,26.28.9,1.23.23,3.46.75,3.74,2.14l-.65-.72c-.31.14-.29.58-.46.73-.81.7-4.21,1.25-5.37,1.42-6.66.99-13.54,1.03-20.26,1.04-.03.25.33.14.51.14,1.44.06,3.13-.15,4.51,0,.54.06.8.36,1.17.43,1.04.19,2.6,0,3.71.24.53.11,2.63.92,2.83,1.37.08,1.12,0,2.29.07,3.4s.39,2.71.43,3.81c.01.36-.28.59-.26.83.09,1.03.6,3.71.91,4.76.13.42.54.75.63,1.26.37,2.06.36,3.11,1.01,5.24.19.63.39,2.36,1.15,2.49.25.04.54-.5.79-.63.29-.16.61-.09.94-.37.54-.46,1.63-2.15,1.9-2.31.33-.2.77-.17,1.11-.34.38-.19.93-.74,1.28-.9.48-.22,3.37-.66,3.19-1.46-.08-.34-1.54-.59-1.6-.66-.36-.4.91-.46,1.02-.5,4.13-1.49,7.43-2,9.86-5.99,3.52-5.77-1.59-10.16-7.34-6.91-3.03,1.71-2.59,4.45-3.32,7.29-.46,1.79-1.51,3.44-2.08,5.19-.03.55.81.06.7.62-.6,0-1.1.16-.99-.62s.72-1.91.95-2.69c1.02-3.46,1.79-7.09,3.05-10.48.39-1.06.6-1.88,1.64-2.43,2.42-1.28,5.42-.49,7.72.73,2.44,1.3,4.07,4.07,3.92,6.84-.05.87-.28,1.96-.43,2.84.35.37.74-1.35.77-1.48.37-1.51.48-2.94.25-4.48.15-.06.29.48.29.51,0,.91.09,2.04,0,2.91ZM25.76,22.79c.05-.53.44-.98.46-1.51.04-1.21-1.03-1.73.77-2.57.53-.25,1.46-.31,1.84-.63.17-.14.18-.14,0-.29-4.71,0-9.62.16-14.31.82-1.12.16-5.3.82-5.99,1.43-.24.22-.31.6-.14.88.24.39,3.32.9,3.95.99,4.39.65,8.98.67,13.41.88ZM41.4,54.8c.37.11,1.8,0,2.33,0,.64,0,3.02-1.9,2.92-2.48-.11-.63-1.16-.48-1.64-.32-.22.07-3.31,1.84-3.52,2-.28.23-.48.68-.08.79Z";
const PATH_2 = "M50.43,43.72c-.22.84-.56,1.95-1.06,3.24-.34.86-.63,1.47-.69,1.6-.43.91-1.05,2.19-2.15,3.65-1.42,1.87-2.84,2.97-3.23,3.27-.56.42-1.06.74-1.42.95-.28,0-.54.06-.68.34-.23,0-.47,0-.7,0-.09-.76-1.21-.89-1.12-1.77.2-.36.51-.88.95-1.49.74-1.02,1.2-1.37,1.76-2.03.72-.84,1.14-1.72,1.99-3.5.35-.72.84-1.77,1.32-3.23.38-1.16.6-2.13.72-2.71.21-1.02.3-1.79.32-2.01.15-1.33.14-2.34.13-3,0-.33-.02-1.06-.1-2-.04-.5-.19-2-.63-3.97-.26-1.15-.5-2.22-1.04-3.58-.39-.99-.58-1.48-.96-2.05-.5-.74-.89-1.04-1.33-1.95-.43-.9-.38-1.3-.36-1.44.08-.49.39-.93.9-1.29,1.03-.72,2.06-.68,2.88.44.17.23.42.39.64.58.19.23.37.46.56.7.14.22.28.44.43.66.75,1.17,1.16,2.19,1.35,2.66.38.95.57,1.65.84,2.64.11.41.38,1.46.62,2.85.28,1.62.38,2.89.42,3.44.06.89.07,1.57.07,1.99.01,1.4-.05,2.42-.15,3.93-.05.79-.13,1.84-.25,3.08ZM31.03,37.2c-.21-.15-.39-.24-.45-.27-.14-.06-.5-.23-.94-.22-.52,0-.89.25-1.24.48-.06.04-.5.33-.87.77-.53.63-.87,1.15-1.22,1.75-.21.37-.44.76-.68,1.32-.42.96-.61,1.78-.69,2.22-.18.93-.19,1.65-.19,1.87h0c0,.29.02,1.11.39,2.28.22.71.48,1.22.72,1.71.13.27.21.4.52.98.23.41.55,1.02.95,1.77.27.21.79.45,1.45.7.57.22,1.17.28,1.86-.16,1.06-.68.74-1.69.73-2.62-.28-.29-.63-.71-.97-1.25-.31-.5-.49-.91-.55-1.05-.19-.46-.45-1.06-.5-1.88-.06-1,.21-1.77.33-2.08.1-.28.33-.69.79-1.53.51-.93.5-.85.71-1.26.6-1.18,1.51-2.33-.16-3.53ZM33.71,24.98c-.56-.03-1.12-.15-1.68-.23-1.71.03-3.41.03-5.12.08-1.72.05-2.17.55-2.16,2.35,0,1.83.62,2.55,2.18,2.65,1.04.06,1.77.15,2.33.16,1.88,0,1.9.27,4,.29,1.81.02,2.32-.18,2.65-.55.26-.29.37-.71.37-1.29,0-1.93-.29-3.31-2.58-3.45Z";
const PATH_3 = "M35.84,36.08v6.25c0,.69-.41,1.22-1.23,1.59-2.6,1.2-5.45,1.8-8.56,1.8-2.63,0-5.05-.48-7.28-1.43-2.23-.95-3.99-2.24-5.29-3.86-1.3-1.62-1.95-3.39-1.95-5.32s.65-3.7,1.95-5.32c1.02-1.27,2.05-2.02,2.75-2.5,1.07-.73,1.98-1.12,2.54-1.36.33-.14,1.49-.62,3.1-.98.39-.09,2-.43,4.18-.45,1.34,0,2.28.11,3.35.24,0,0,1.41.18,3.49.94.09.03.59.22.9.62.2.26.3.53.3.83,0,.49-.22.92-.66,1.28-.44.36-.97.54-1.61.54-.4,0-.84-.08-1.31-.24-1.43-.45-2.92-.68-4.46-.68-1.7,0-3.26.32-4.7.96-1.43.64-2.57,1.5-3.4,2.58-.84,1.08-1.25,2.26-1.25,3.54s.42,2.46,1.25,3.54c.84,1.08,1.97,1.94,3.4,2.58,1.43.64,3,.96,4.7.96.74,0,1.54-.05,2.39-.15.85-.1,1.59-.23,2.23-.38v-3.83h-3.74c-.69,0-1.27-.17-1.73-.5-.46-.33-.7-.76-.7-1.27s.23-.93.7-1.27c.46-.33,1.04-.5,1.73-.5h6.53c.69,0,1.26.17,1.71.52.45.34.68.77.68,1.28ZM60.93,41.84c-.48-.43-1.06-.65-1.75-.65-.37,0-.8.08-1.27.24-1.19.45-2.6.68-4.22.68-2.73,0-4.94-.6-6.63-1.8-1.68-1.2-2.53-2.96-2.53-5.27,0-1.36.37-2.56,1.11-3.61.74-1.05,1.8-1.87,3.18-2.45,1.38-.58,3-.87,4.85-.87,1.51,0,2.92.23,4.22.68.45.18.9.26,1.35.26.66,0,1.21-.21,1.63-.62.4-.39.6-.8.6-1.21,0-.69-.41-1.19-1.23-1.5-1.61-.62-2.98-.83-2.98-.83-1.53-.2-2.35-.31-3.59-.32-2.09,0-3.66.29-4.05.37-.72.14-1.88.38-3.31.97-.73.3-1.8.76-3,1.67-.5.38-1.32,1-2.12,2.06-.33.43-.98,1.3-1.42,2.62-.29.87-.44,1.8-.44,2.77,0,2.26.65,4.18,1.95,5.77.18.22.93,1.14,2.24,2.07.53.37,1.46.97,2.97,1.54,2.97,1.12,5.62,1.22,7.16,1.22,2.33,0,4.54-.38,6.61-1.15.4-.14.7-.33.91-.59.21-.26.32-.54.32-.85,0-.43-.2-.84-.6-1.21Z";

const STEPS = 65; // Increased for smoother animation
const ANIMATION_DURATION = 500; // Duration in milliseconds
const COOLDOWN_DURATION = 300; // Cooldown after animation completes

const paths = [PATH_1, PATH_2, PATH_3];

const LogoAnimated = forwardRef((props, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [path, setPath] = useState(paths[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const animRef = useRef<number | null>(null);
  const mouseTimeoutRef = useRef<number | null>(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const mouseStationaryRef = useRef(true);
  const animationStartTimeRef = useRef<number>(0);
  const initialAnimationTriggeredRef = useRef(false);
  const currentIndexRef = useRef(0); // Add ref to track current index

  const animateToNext = () => {
    // Hard lock: prevent any new animations if one is already running or in cooldown
    if (isAnimating || isInCooldown) {
      return;
    }
    
    // Use ref value instead of state to avoid stale closure
    const fromIndex = currentIndexRef.current;
    
    setIsAnimating(true);
    const nextIndex = (fromIndex + 1) % paths.length;
    
    // Create flubber interpolator using original path strings
    let interpolator;
    try {
      // Use fromIndex (ref value) instead of currentIndex (state)
      interpolator = flubber.interpolate(paths[fromIndex], paths[nextIndex]);
    } catch (error) {
      console.error('❌ Error creating flubber interpolator:', error);
      setIsAnimating(false);
      return;
    }
    
    animationStartTimeRef.current = performance.now();
    
    const animate = (timestamp: number) => {
      if (!animationStartTimeRef.current) animationStartTimeRef.current = timestamp;
      
      const elapsed = timestamp - animationStartTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Use easing function for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      try {
        const newPath = interpolator(easedProgress);
        setPath(newPath);
      } catch (error) {
        console.error('❌ Error during path interpolation:', error);
        setIsAnimating(false);
        return;
      }
      
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Set final path and update index ONLY after animation completes
        setPath(paths[nextIndex]);
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex; // Keep ref in sync
        setIsAnimating(false);
        animationStartTimeRef.current = 0;
        
        // Start cooldown period
        setIsInCooldown(true);
        setTimeout(() => {
          setIsInCooldown(false);
        }, COOLDOWN_DURATION);
      }
    };
    
    // Cancel any existing animation frame
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    
    // Start the animation
    animRef.current = requestAnimationFrame(animate);
  };

  useImperativeHandle(ref, () => ({ animateToNext }));

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = { x: e.clientX, y: e.clientY };
      const lastPos = lastMousePositionRef.current;
      
      // Check if mouse actually moved (not just a tiny jitter)
      const moved = Math.abs(currentPos.x - lastPos.x) > 3 || Math.abs(currentPos.y - lastPos.y) > 3;
      
      if (moved) {
        // If mouse was stationary and now moved, trigger animation
        if (mouseStationaryRef.current && !isAnimating && !isInCooldown) {
          animateToNext();
        }
        
        // Update mouse position
        lastMousePositionRef.current = currentPos;
        mouseStationaryRef.current = false;
        
        // Clear existing timeout
        if (mouseTimeoutRef.current) {
          clearTimeout(mouseTimeoutRef.current);
        }
        
        // Set mouse as stationary after 800ms of no movement
        mouseTimeoutRef.current = window.setTimeout(() => {
          mouseStationaryRef.current = true;
        }, 800);
      }
    };

    // Add global mouse move listener
    document.addEventListener('mousemove', handleMouseMove);
    
    // Initial animation after 3 seconds - only trigger once
    let initialTimer: number | null = null;
    
    if (!initialAnimationTriggeredRef.current) {
      initialTimer = window.setTimeout(() => {
        initialAnimationTriggeredRef.current = true;
        animateToNext();
      }, 3000);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (initialTimer) clearTimeout(initialTimer);
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className="w-12 h-12"
      aria-label="Animated Logo"
      style={{ 
        cursor: 'pointer',
        transition: 'none' // Disable CSS transitions that might interfere
      }}
      onClick={() => {
        animateToNext();
      }}
    >
      <path 
        d={path} 
        style={{
          fill: 'currentColor', // Temporary red fill to make changes obvious
          stroke: 'currentColor', // Black stroke to see the outline
          strokeWidth: 0.5,
          vectorEffect: 'non-scaling-stroke', // Ensure crisp rendering
          fillRule: 'evenodd'
        }}
      />
    </svg>
  );
});

LogoAnimated.displayName = 'LogoAnimated';

export default LogoAnimated; 
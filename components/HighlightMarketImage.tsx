'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// CENTRALIZED CONFIG — adjust all timings and sizing here
const CONFIG = {
  delayMs: 8500,            // Delay before the cue starts
  durationMs: 4500,        // Total duration for the entire sequence
  image: {
    src: '/media/product_imgs/sample_pack.webp',
    size: 96,              // Image size (px)
    offsetX: 30,           // Pixels to the right from computed anchor
    offsetY: 60,           // Pixels down from computed anchor
    times: [0, 0.05, 0.95, 1] as [number, number, number, number], // image keyframe fractions
  },
  bubbles: {
    A:      { appear: 0.45, leave: 0.65 },
    B:      { appear: 0.50, leave: 0.75 },
    C:      { appear: 0.55, leave: 0.85 },
    circle: { appear: 0.60, leave: 0.95 },
  },
};

// Controls for the highlight cue
// - To change the overall timing, edit `durationMs` (prop) where this
//   component is used, or change the default below.
// - Image tilt/bob animation is defined in the <motion.img> `animate` arrays.
// - Image position offsets relative to the Cupgrades icon are set in the
//   first useEffect (look for `rect.right + 36` and `+ 28`).
// - Bubble positions are the inline `left/top` styles near each Bubble A/B/C.
// - Bubble A appearance/disappearance is driven by the `transition.times`
//   array for Bubble A below (keys `bubbleA.appear` and `bubbleA.leave`).
interface HighlightMarketImageProps {
  targetRef: React.RefObject<HTMLElement>;
  // All behavior is controlled via CONFIG above; no external timing props
}

const HighlightMarketImage: React.FC<HighlightMarketImageProps> = ({
  targetRef,
}) => {
  // Overall duration is controlled here (not via props)
  const durationMs = CONFIG.durationMs;
  // Image size is controlled here (not via props)
  const imageSize = CONFIG.image.size;
  const [visible, setVisible] = useState(false);
  const [imgPos, setImgPos] = useState<{ x: number; y: number } | null>(null);
  const [iconCenter, setIconCenter] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Run only once per user (persisted in localStorage)
    if (typeof window !== 'undefined') {
      try {
        const alreadyShown = localStorage.getItem('highlight_market_image_shown') === '1';
        if (alreadyShown) {
          return; // Do not run again
        }
      } catch {}
    }

    const t = setTimeout(() => {
      try {
        const el = targetRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        setIconCenter(center);
        // POSITION OF IMAGE RELATIVE TO ICON
        // - Move further right: increase `+ 36`
        // - Move further down: increase `+ 28`
        // - Move left/up: decrease these numbers
        setImgPos({ x: rect.right + 36, y: rect.top + rect.height / 2 - imageSize / 2 + 28 });
        // Preload the image so timeline doesn't outrun image decode
        const pre = new Image();
        pre.src = CONFIG.image.src;
        const makeVisible = () => {
          setVisible(true);
          try {
            localStorage.setItem('highlight_market_image_shown', '1');
          } catch {}
        };

        if (pre.complete) {
          makeVisible();
        } else {
          pre.onload = () => makeVisible();
          // Fallback safety in case onload doesn't fire
          setTimeout(() => makeVisible(), 1000);
        }
      } catch {}
    }, CONFIG.delayMs);
    return () => clearTimeout(t);
  }, [targetRef, imageSize]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs]);

  if (!visible || !imgPos || !iconCenter) return null;

  // Build time fractions based on total duration
  // OVERALL TIMING
  // - To speed up or slow down everything, pass a different `durationMs` prop.
  // - All `times:` arrays below use fractions of this duration.
  const D = durationMs / 1000; // seconds for framer-motion duration
  const imageTimes = CONFIG.image.times;
  // BUBBLE TIMING FRACTIONS (relative to total duration)
  // Keep these as plain percentages of the overall duration — no cross-dependencies
  const bubbleA = CONFIG.bubbles.A;
  const bubbleB = CONFIG.bubbles.B;
  const bubbleC = CONFIG.bubbles.C;
  const circle  = CONFIG.bubbles.circle;

  // Wrapper offsets so image and caption move together
  const blockLeft = imgPos.x + CONFIG.image.offsetX;
  const blockTop = imgPos.y + CONFIG.image.offsetY;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 pointer-events-none z-40" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Image + caption wrapper (animates together) */}
        {/* IMAGE TILTY/BOBBY ANIMATION
         - Adjust arrays for rotate/y for stronger or subtler motion
         - Keep times aligned with the overall duration fractions
        */}
        <motion.div
          style={{ position: 'fixed', left: blockLeft, top: blockTop, width: imageSize }}
          initial={{ opacity: 0, scale: 0.96, rotate: -4, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.96, 1, 1, 1],
            rotate: [-4, 2, -4, 0],
            y: [-8, 0, -6, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: D, ease: 'easeInOut', times: imageTimes }}
        >
          <img src={CONFIG.image.src} alt="highlight" style={{ width: imageSize, height: imageSize, borderRadius: 14, display: 'block' }} />
          <div className="text-white text-lg font-medium drop-shadow" style={{ textAlign: 'center', marginTop: 6 }}>
            Marketplace
          </div>
        </motion.div>

        {/* Bubble A */}
        {/* POSITION OF BUBBLE A */}
        {/* - Tweak the `left/top` below to move A relative to the image block */}
        <motion.div
          className="bg-brand-secondary rounded-full"
          style={{ position: 'fixed', left: blockLeft - 20, top: blockTop + imageSize - 60, width: 12, height: 12 }}
          initial={{ opacity: 0, scale: 0.6 }}
          // APPEAR/DISAPPEAR OF BUBBLE A
          // - Control with bubbleA.appear and bubbleA.leave above
          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.6] }}
          transition={{ duration: D, times: [0, bubbleA.appear, bubbleC.appear, bubbleA.leave] }}
        />

        {/* Bubble B */}
        {/* POSITION OF BUBBLE B: midpoint between image block and icon */}
        <motion.div
          className="bg-brand-secondary rounded-full"
          style={{ position: 'fixed', left: blockLeft - 50, top: blockTop + imageSize - 80, width: 18, height: 18 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.6] }}
          transition={{ duration: D, times: [0, bubbleB.appear, circle.appear, bubbleB.leave] }}
        />

        {/* Bubble C (near icon) */}
        <motion.div
          className="bg-brand-secondary rounded-full"
          style={{ position: 'fixed', left: blockLeft - 85, top: blockTop + imageSize - 115, width: 36, height: 36 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: D, times: [0, bubbleC.appear, circle.appear, bubbleC.leave] }}
        />

        {/* Circle around icon */}
        <motion.div
          style={{ position: 'fixed', left: iconCenter.x - 20, top: iconCenter.y - 20, width: 40, height: 40, borderRadius: 9999, borderWidth: 3, borderColor: 'rgb(64,164,76)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1.05, 1.05, 0.9] }}
          transition={{ duration: D, times: [0, circle.appear, circle.leave - 0.05, circle.leave] }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default HighlightMarketImage;

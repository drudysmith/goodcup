import React from 'react';
import { motion } from 'framer-motion';
import { FlyToCartAnimation } from '../lib/hooks/useFlyToCart';

interface FlyToCartAnimationProps {
  animation: FlyToCartAnimation;
  onComplete: (animationId: string) => void;
}

const FlyToCartAnimationComponent: React.FC<FlyToCartAnimationProps> = ({
  animation,
  onComplete
}) => {
  const { id, productImage, startPosition, endPosition, startSize } = animation;

  // Calculate control point for curved path (Bezier curve)
  const controlPoint = {
    x: startPosition.x + (endPosition.x - startPosition.x) * 0.5,
    y: startPosition.y + (endPosition.y - startPosition.y) * 0.3 - 50 // Curve upward
  };

  // Create SVG path string for curved motion
  const pathString = `M ${startPosition.x} ${startPosition.y} Q ${controlPoint.x} ${controlPoint.y} ${endPosition.x} ${endPosition.y}`;

  return (
    <motion.div
      initial={{
        position: 'fixed',
        left: startPosition.x - startSize.width / 2,
        top: startPosition.y - startSize.height / 2,
        width: startSize.width,
        height: startSize.height,
        zIndex: 9999,
        pointerEvents: 'none',
        scale: 1,
        opacity: 1
      }}
      animate={{
        left: endPosition.x - 12, // 24px final size / 2
        top: endPosition.y - 12,
        width: 24,
        height: 24,
        scale: 1,
        opacity: 1
      }}
      exit={{
        scale: 0.5,
        opacity: 0
      }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1], // Custom bezier for natural motion
        type: "tween"
      }}
      onAnimationComplete={() => onComplete(id)}
      className="rounded-lg overflow-hidden shadow-lg border-2 border-white"
      style={{
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}
    >
      {/* Product Image */}
      <img 
        src={productImage} 
        alt="" 
        className="w-full h-full object-cover"
        draggable={false}
      />
      
      {/* Optional: Add a subtle glow effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"
        style={{
          animation: 'shimmer 0.8s ease-out'
        }}
      />
    </motion.div>
  );
};

export default FlyToCartAnimationComponent; 
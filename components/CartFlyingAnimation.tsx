import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartFlyingAnimationProps {
  isVisible: boolean;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: () => void;
}

const CartFlyingAnimation: React.FC<CartFlyingAnimationProps> = ({
  isVisible,
  startPosition,
  endPosition,
  onComplete
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible && !isAnimating) {
      setIsAnimating(true);
    }
  }, [isVisible, isAnimating]);

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    onComplete();
  };

  return (
    <AnimatePresence>
      {isVisible && isAnimating && (
        <motion.div
          initial={{
            x: startPosition.x,
            y: startPosition.y,
            scale: 0,
            opacity: 0
          }}
                     animate={{
             x: endPosition.x,
             y: endPosition.y,
             scale: [0, 1, 0.6, 0.1],
             opacity: [0, 1, 1, 0]
           }}
          exit={{
            scale: 0,
            opacity: 0
          }}
                     transition={{
             duration: 0.8,
             ease: "easeInOut",
             times: [0, 0.2, 0.8, 1]
           }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed z-50 pointer-events-none"
                     style={{
             width: '40px',
             height: '40px',
             borderRadius: '50%',
             backgroundColor: '#40a44c', // brand-secondary green
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             color: 'white',
             fontSize: '20px',
             fontWeight: 'bold',
             boxShadow: '0 4px 12px rgba(64, 164, 76, 0.4)'
           }}
         >
           ;)
         </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartFlyingAnimation; 
import React, { useState, useEffect } from 'react';
import { StyledText } from '../lib/textUtils';
import { LOG_ENABLED } from '../lib/utils/log';

interface CarouselContent {
  title: string;
  description: string;
}

interface ExpandedContent {
  content: string;
}

interface CardProps {
  carouselContent: CarouselContent;
  expandedContent: ExpandedContent;
  imageUrl?: string;
  onClick?: () => void;
  className?: string;
  isExpanded?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  carouselContent,
  expandedContent,
  imageUrl = '/media/card_art/card_01.webp', // Fallback in case imageUrl is not provided
  onClick,
  className = "",
  isExpanded = false
}) => {
  const [imageScale, setImageScale] = useState<'normal' | 'expanded' | 'hover'>('normal');
  const [hasPlayedInitial, setHasPlayedInitial] = useState(false);

  // Auto-play animation when card becomes expanded
  useEffect(() => {
    if (isExpanded && !hasPlayedInitial) {
      // Longer delay for more prolonged effect
      const timer = setTimeout(() => {
        setImageScale('expanded');
        setHasPlayedInitial(true);
      }, 800);
      
      return () => clearTimeout(timer);
    } else if (!isExpanded) {
      // Reset when card is no longer expanded
      setImageScale('normal');
      setHasPlayedInitial(false);
    }
  }, [isExpanded, hasPlayedInitial]);

  const handleMouseEnter = () => {
    if (isExpanded && hasPlayedInitial) {
      setImageScale('hover');
    }
  };

  const handleMouseLeave = () => {
    if (isExpanded && hasPlayedInitial) {
      setImageScale('expanded');
    }
  };

  const getImageTransform = () => {
    switch (imageScale) {
      case 'hover':
        return 'scale-100'; // Normal size on hover (reverse)
      case 'expanded':
        return 'scale-110'; // Slightly enlarged when expanded
      case 'normal':
      default:
        return 'scale-100'; // Normal size
    }
  };

  const renderCarouselContent = () => (
    <div className="h-3/5 bg-surface flex flex-col justify-center px-4 text-left">
      {/* Title - larger */}
      <div className="text-neutral-border font-semibold text-2xl mb-2">
        {carouselContent.title}
      </div>
      {/* Description - with flexible text styling */}
      <div className="text-neutral-border text-lg leading-tight whitespace-pre-line">
        <StyledText>{carouselContent.description}</StyledText>
      </div>
    </div>
  );

  const renderExpandedContent = () => (
    <div className="h-3/5 bg-surface flex flex-col justify-between px-6 py-6 text-left overflow-y-visible">
      <div className="text-neutral-border text-base leading-relaxed whitespace-pre-line">
        <StyledText>{expandedContent.content}</StyledText>
      </div>
      
      {/* Try It button - positioned at bottom with pleasant spacing */}
      <div className="flex justify-end pt-1">
        <button 
          className="bg-brand-secondary text-white px-4 py-2 rounded-full font-small text-base 
                     transition-all duration-200 ease-in-out 
                     hover:scale-105 hover:shadow-lg 
                     active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            // Handle "Try It" action here
            if (LOG_ENABLED) {
              console.log('Try It clicked for:', carouselContent.title);
            }
          }}
        >
          Try It
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className={`w-full h-full bg-white rounded-lg overflow-hidden shadow-md flex flex-col cursor-pointer ${!isExpanded ? 'transition-transform duration-200 hover:scale-105' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Image section - top 2/5 */}
      <div 
        className="h-2/5 relative overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className={`w-full h-full bg-cover bg-center transition-transform duration-[4000ms] ease-out ${getImageTransform()}`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        
        {/* Text overlay - only visible when expanded */}
        {isExpanded && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h2 className="text-white font-light text-4xl md:text-5xl lg:text-6xl drop-shadow-lg leading-tight">
              {carouselContent.title.split(' ').map((word, index) => (
                <div key={index}>{word}</div>
              ))}
            </h2>
          </div>
        )}
      </div>
      
      {/* Content section - bottom 3/5 */}
      {isExpanded ? renderExpandedContent() : renderCarouselContent()}
    </div>
  );
};

export default Card; 

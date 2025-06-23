import React, { ReactNode, ReactElement, useEffect } from 'react';

interface SectionProps {
  title?: string;
  text: ReactNode;
  media?: ReactNode;

  /** Layout style for image/text arrangement */
  layout?: 'image-left' | 'image-right' | 'image-right-wide' | 'image-left-large' | 'text-only';

  /** Section vertical spacing and gap size */
  size?: 'small' | 'medium' | 'large';
    
  /** Semantic Tailwind color class for background (e.g., 'bg-surface-background', 'bg-surface', 'bg-surface-elevated') */
  bgColor?: string;
  hero?: boolean; // New prop to designate a hero section
    
  /** Semantic Tailwind color class for text (e.g., 'text-text-primary', 'text-surface-background', 'text-text-secondary') */
  textColor?: string;
  className?: string; // Optional override for section wrapper
    
  /** Allow transparent containers*/
  transparent?: boolean;

  /** Animations for text, etc. */
  animation?: 'blur-slide' | 'fade-scale';
}

function isReactElement(element: ReactNode): element is ReactElement {
  return typeof element === 'object' && element !== null && 'type' in element && 'props' in element;
}

// Helper: Warn if <img> in media prop is missing alt
function useWarnIfImgMissingAlt(media: ReactNode) {
  useEffect(() => {
    if (isReactElement(media) && media.type === 'img') {
      const alt = (media.props as { alt?: string }).alt;
      if (!alt || typeof alt !== 'string' || alt.trim() === '') {
        // eslint-disable-next-line no-console
        console.warn('Section: <img> in media prop is missing a non-empty alt attribute. This is required for accessibility.');
      }
    }
  }, [media]);
}

/** Section layout styles */
const layoutStyles = {
  'image-right': { container: 'flex-col md:flex-row', media: 'md:w-1/2', text: 'md:w-1/2' },
  'image-left': { container: 'flex-col md:flex-row-reverse', media: 'md:w-1/2', text: 'md:w-1/2' },
  'image-left-large': { container: 'flex-col md:flex-row-reverse', media: 'md:w-2/3', text: 'md:w-1/3' },
  'image-right-wide': { container: 'flex-col md:flex-row', media: 'md:w-2/3', text: 'md:w-1/3' },
  'text-only': { container: 'flex-col items-center', media: 'hidden', text: 'w-full max-w-3xl' },
};

/** Section container styles */
const sizeStyles = {
  small: 'py-6 gap-6',
  medium: 'py-10 gap-16 md:gap-16',
  large: 'py-18 gap-32 md:gap-32',
};

const baseContainerClass = 'balanced-container flex';
const baseMediaClass = 'section-container flex justify-center';
const baseTextClass = 'text-block font-sans';

const Section: React.FC<SectionProps> = ({ 
  title, 
  text, 
  media, 
  layout = 'image-left',
  size = 'medium',
  bgColor = 'bg-surface',
  hero = false,
  textColor = 'text-text-primary',
  className,
  transparent = true,
  animation,
}) => {
  useWarnIfImgMissingAlt(media);
  const currentLayout = layoutStyles[layout] || layoutStyles['image-left'];
  const currentSize = sizeStyles[size] || sizeStyles['medium'];
  const containerClass = `${baseContainerClass} ${currentLayout.container} items-stretch ${currentSize}`;
  const mediaClass = `${baseMediaClass} ${currentLayout.media} ${transparent ? '!bg-transparent' : ''}`;
  const textClass = `${baseTextClass} ${currentLayout.text} ${textColor} ${transparent ? '!bg-transparent' : ''}`;
  const textAnimationClass = animation ? `reveal-init` : '';

  return (
    <section className={`w-full ${bgColor} border-b border-neutral-border${className ? ` ${className}` : ''} ${hero ? 'pt-0' : ''}`}>
      <div className={containerClass}>
        {/* Text Block */}
        <div
	  data-reveal={animation || undefined}
	  className={`${textClass} flex-1 flex h-full ${textAnimationClass}`}
	>
	  <div className="w-full h-full flex flex-col justify-between">
    	    {title && (
      	      <h2 className={`mb-4 ${hero ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
                {title}
      	      </h2>
    	    )}
    	    <p className="text-lg">{text}</p>
  	  </div>
	</div>
        {/* Media Block */}
        {currentLayout.media !== 'hidden' && media && (
          <div className={`${mediaClass} self-start`}>
            {isReactElement(media)
              ? React.cloneElement(media as ReactElement<any>, { 
                  className: `${((media as ReactElement<any>).props as { className?: string }).className || ''} w-full h-auto object-cover filter grayscale ${hero ? 'min-h-[300px] md:min-h-[350px]' : ''}`.trim() 
                })
              : media}
          </div>
        )}
      </div>
    </section>
  );
};

export default Section;

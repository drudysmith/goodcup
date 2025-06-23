import React from 'react';

// Supported text styles and their corresponding Tailwind classes
const TEXT_STYLES = {
  '***': 'font-bold italic',     // Bold + Italic
  '**': 'font-bold',             // Bold
  '*': 'italic',                 // Italic
  '__': 'underline',             // Underline
  '~~': 'line-through',          // Strikethrough
  '`': 'font-mono bg-gray-100 px-1 rounded text-xs', // Code style
} as const;

// Type for the style markers
type StyleMarker = keyof typeof TEXT_STYLES;

// Interface for parsed text segments
interface TextSegment {
  text: string;
  className?: string;
}

/**
 * Parse text with simple markup and return React elements with appropriate styling
 * 
 * Supported markup:
 * - **bold** → font-bold
 * - *italic* → italic  
 * - ***bold+italic*** → font-bold italic
 * - __underline__ → underline
 * - ~~strikethrough~~ → line-through
 * - `code` → font-mono bg-gray-100 px-1 rounded text-xs
 * 
 * Examples:
 * - "**Boosts** energy" → <span class="font-bold">Boosts</span> energy
 * - "This is *important* text" → This is <span class="italic">important</span> text
 * - "***Very important*** message" → <span class="font-bold italic">Very important</span> message
 * 
 * @param text - The text to parse with markup
 * @returns Array of React elements with appropriate styling
 */
export const parseStyledText = (text: string): React.ReactNode[] => {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let currentIndex = 0;
  
  // Sort markers by length (longest first) to handle *** before **
  const markers = Object.keys(TEXT_STYLES).sort((a, b) => b.length - a.length) as StyleMarker[];
  
  while (currentIndex < text.length) {
    let foundMarker = false;
    
    // Check for each style marker at current position
    for (const marker of markers) {
      if (text.substring(currentIndex, currentIndex + marker.length) === marker) {
        // Find the closing marker
        const closingIndex = text.indexOf(marker, currentIndex + marker.length);
        
        if (closingIndex !== -1) {
          // Extract the styled text
          const styledText = text.substring(currentIndex + marker.length, closingIndex);
          
          if (styledText.length > 0) {
            segments.push({
              text: styledText,
              className: TEXT_STYLES[marker]
            });
            
            currentIndex = closingIndex + marker.length;
            foundMarker = true;
            break;
          }
        }
      }
    }
    
    // If no marker found, add regular text until next marker or end
    if (!foundMarker) {
      let nextMarkerIndex = text.length;
      
      // Find the next marker position
      for (const marker of markers) {
        const markerIndex = text.indexOf(marker, currentIndex);
        if (markerIndex !== -1 && markerIndex < nextMarkerIndex) {
          nextMarkerIndex = markerIndex;
        }
      }
      
      const regularText = text.substring(currentIndex, nextMarkerIndex);
      if (regularText.length > 0) {
        segments.push({ text: regularText });
      }
      
      currentIndex = nextMarkerIndex;
    }
  }
  
  // Convert segments to React elements
  return segments.map((segment, index) => {
    if (segment.className) {
      return React.createElement(
        'span',
        { key: index, className: segment.className },
        segment.text
      );
    }
    return segment.text;
  });
};

/**
 * Simple wrapper component for rendering styled text
 */
interface StyledTextProps {
  children: string;
  className?: string;
}

export const StyledText: React.FC<StyledTextProps> = ({ children, className = "" }) => {
  const elements = parseStyledText(children);
  
  return React.createElement(
    'span',
    { className },
    ...elements
  );
}; 
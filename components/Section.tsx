import React, { ReactNode, ReactElement } from 'react';

interface SectionProps {
  title: string;
  text: string;
  media: ReactNode;
  reverse?: boolean;
  bgColor?: string; // Tailwind color class, e.g. 'bg-[#dfe0df]'
  hero?: boolean; // New prop to designate a hero section
  textColor?: string; // Optional text color for better contrast with transparent header
}

function isReactElement(element: ReactNode): element is ReactElement {
  return typeof element === 'object' && element !== null && 'type' in element && 'props' in element;
}

const Section: React.FC<SectionProps> = ({ 
  title, 
  text, 
  media, 
  reverse = false, 
  bgColor = 'bg-[#dfe0df]',
  hero = false,
  textColor = 'text-gray-800'
}) => {
  return (
    <section className={`w-full ${bgColor} border-b border-[#565e77] ${hero ? 'pt-0' : ''}`}>
      <div className={`max-w-5xl mx-auto flex flex-col md:flex-row items-center ${
        hero ? 'py-28 md:py-32' : 'py-16'
      } gap-8 px-4 sm:px-8 md:px-12 ${reverse ? 'md:flex-row-reverse' : ''}`}>
        {/* Text Block */}
        <div className={`md:w-1/2 w-full border border-[#565e77] p-4 bg-transparent ${textColor}`}>
          <h2 className={`font-bold mb-4 ${hero ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>{title}</h2>
          <p className="text-lg">{text}</p>
        </div>
        {/* Media Block */}
        <div className="md:w-1/2 w-full border border-[#565e77] p-4 flex justify-center bg-transparent">
          {/* Media should be flat, grayscale, no border-radius, no shadow */}
          {isReactElement(media)
            ? React.cloneElement(media as ReactElement<any>, { 
                className: `${((media as ReactElement<any>).props as { className?: string }).className || ''} w-full h-auto object-cover filter grayscale ${
                  hero ? 'min-h-[300px] md:min-h-[350px]' : ''
                }`.trim() 
              })
            : media}
        </div>
      </div>
    </section>
  );
};

export default Section; 
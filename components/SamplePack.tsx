import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SamplePackProps {
  open: boolean;
  onClose: (selectedFlavors?: { secondFlavor: string; thirdFlavor: string }) => void;
}

const SamplePack: React.FC<SamplePackProps> = ({ open, onClose }) => {
  const [secondFlavor, setSecondFlavor] = useState('Sweet');
  const [thirdFlavor, setThirdFlavor] = useState('Fire');

  const flavorOptions = [
    { name: 'Daily', servings: 26 },
    { name: 'Sweet', servings: 10 },
    { name: 'Fire', servings: 21 }
  ];

  const getServings = (flavorName: string) => {
    const flavor = flavorOptions.find(f => f.name === flavorName);
    return flavor ? flavor.servings : 0;
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose()}
          />
          {/* Modal Content */}
          <motion.div
            className="relative bg-surface border-surface rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 text-text-primary"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <button
              aria-label="Close"
              onClick={() => onClose()}
              className="absolute top-3 right-3 bg-neutral-muted-bg text-text-tertiary hover:text-text-primary rounded-full w-8 h-8 flex items-center justify-center shadow"
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Message */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-3">Smart Choice with a Sample Pack! </h1>
              <p className="text-xl text-text-primary">
                The sample pack includes three of our most popular flavors, Daily, Sweet and Fire Goodcup. 
                <br/><br/>Are you good with the standard, or do you want to customize a bit?
              </p>
            </div>

            {/* Options Section */}
            <div className="mb-6 space-y-4">
              {/* First Flavor - Fixed */}
              <div className="flex justify-between items-center">
                <span className="text-xl font-medium">First flavor</span>
                <span className="text-xl">Daily Goodcup ({getServings('Daily')} servings)</span>
              </div>

              {/* Second Flavor - Dropdown */}
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Second flavor</span>
                <select
                  value={secondFlavor}
                  onChange={(e) => setSecondFlavor(e.target.value)}
                  className="text-lg border border-neutral-border rounded px-3 py-1 bg-surface text-text-primary"
                >
                  {flavorOptions.map(flavor => (
                    <option key={flavor.name} value={flavor.name}>
                      {flavor.name} Goodcup ({flavor.servings} servings)
                    </option>
                  ))}
                </select>
              </div>

              {/* Third Flavor - Dropdown */}
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Third flavor</span>
                <select
                  value={thirdFlavor}
                  onChange={(e) => setThirdFlavor(e.target.value)}
                  className="text-lg border border-neutral-border rounded px-3 py-1 bg-surface text-text-primary"
                >
                  {flavorOptions.map(flavor => (
                    <option key={flavor.name} value={flavor.name}>
                      {flavor.name} Goodcup ({flavor.servings} servings)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => onClose({ secondFlavor, thirdFlavor })}
              className="w-full bg-brand-secondary text-white text-2xl py-3 px-6 rounded-full hover:opacity-80 transition-opacity"
            >
              {(secondFlavor === 'Sweet' && thirdFlavor === 'Fire') || 
               (secondFlavor === 'Fire' && thirdFlavor === 'Sweet')
                ? "Give Me the Standard Pack" 
                : "I Like to Customize It"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SamplePack;
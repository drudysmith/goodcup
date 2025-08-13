import React, { useState } from 'react';

interface CheckoutModeToggleProps {
  onModeChange: (mode: 'user' | 'guest') => void;
  defaultMode?: 'user' | 'guest';
  className?: string;
}

export const CheckoutModeToggle: React.FC<CheckoutModeToggleProps> = ({ 
  onModeChange, 
  defaultMode = 'user',
  className = '' 
}) => {
  const [selectedMode, setSelectedMode] = useState<'user' | 'guest'>(defaultMode || 'user');
  const [prevMode, setPrevMode] = useState<'user' | 'guest'>(defaultMode || 'user');

  const handleModeSelect = (mode: 'user' | 'guest') => {
    setPrevMode(selectedMode);
    setSelectedMode(mode);
    onModeChange(mode);
  };

  const direction: 'toUser' | 'toGuest' | 'idle' =
    selectedMode === 'user' && prevMode === 'guest'
      ? 'toUser'
      : selectedMode === 'guest' && prevMode === 'user'
      ? 'toGuest'
      : 'idle';

  return (
    <div className={`checkout-mode-toggle ${className}`}>
      <div className="text-2xl text-text-secondary mb-2 text-center font-heading">Choose checkout option:</div>
      {/* Single slider-style toggle (centered, narrower) */}
      <div className="w-full flex justify-center">
        <button
          onClick={() => handleModeSelect(selectedMode === 'user' ? 'guest' : 'user')}
          className={`relative w-[180px] h-10 rounded-full transition-colors duration-300 overflow-hidden flex items-center hover:opacity-80 ${
            selectedMode === 'user' ? 'bg-brand-secondary' : 'bg-neutral-border'
          }`}
          
        >
          {/* Sliding labels (wipe effect) */}
          <div className="relative w-full h-full">
            <div
              className={`absolute inset-0 flex items-center justify-center text-white font-medium transition-transform duration-600 transform ${
                selectedMode === 'user' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              } ${direction === 'toUser' ? 'origin-left' : direction === 'toGuest' ? 'origin-right' : 'origin-left'}`}
            >
              <span className="select-none font-heading">User Checkout</span>
            </div>
            <div
              className={`absolute inset-0 flex items-center justify-center text-white font-medium transition-transform duration-600 transform ${
                selectedMode === 'guest' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              } ${direction === 'toGuest' ? 'origin-left' : direction === 'toUser' ? 'origin-right' : 'origin-right'}`}
            >
              <span className="select-none font-heading">Visitor Checkout</span>
            </div>
          </div>
          {/* Knob uses left/right positioning to avoid calc issues */}
          <span
            className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow transition-all duration-1100 ${
              selectedMode === 'user' ? 'left-1 right-auto' : 'right-1 left-auto'
            }`}
          />
        </button>
      </div>
      <div className="text-xl text-text-tertiary mt-2 mb-3 text-center font-sans">
        {selectedMode === 'user' 
          ? 'Dashboard for managing subscriptions'
          : 'Just a quick checkout today'
        }
      </div>
    </div>
  );
}; 

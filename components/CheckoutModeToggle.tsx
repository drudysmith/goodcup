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

  const handleModeSelect = (mode: 'user' | 'guest') => {
    setSelectedMode(mode);
    onModeChange(mode);
  };

  return (
    <div className={`checkout-mode-toggle ${className}`}>
      <div className="text-2xl text-text-secondary mb-2 text-center">Choose checkout option:</div>
      <div className="flex gap-2 justify-center">
        {/* Check out as user */}
        <button
          onClick={() => handleModeSelect('user')}
          className={`flex-1 px-3 py-2 text-lg rounded-full transition-all duration-200 ${
            selectedMode === 'user'
              ? 'bg-brand-secondary text-white shadow-sm'
              : 'bg-surface-background border border-neutral-border text-text-secondary hover:bg-neutral-hover'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Check out as user</span>
          </div>
        </button>

        {/* Continue as guest */}
        <button
          onClick={() => handleModeSelect('guest')}
          className={`flex-1 px-3 py-2 text-lg rounded-full transition-all duration-200 ${
            selectedMode === 'guest'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-surface-background border border-neutral-border text-text-secondary hover:bg-neutral-hover'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Continue as visitor</span>
          </div>
        </button>
      </div>
      
      <div className="text-xl text-text-tertiary mt-2 mb-3 text-center">
        {selectedMode === 'user' 
          ? 'Dashboard for managing subscriptions'
          : 'Just a quick checkout today'
        }
      </div>
    </div>
  );
}; 

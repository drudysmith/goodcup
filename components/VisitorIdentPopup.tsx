import React from 'react';

interface VisitorIdentPopupProps {
  show: boolean;
  onDismiss: () => void;
}

const VisitorIdentPopup: React.FC<VisitorIdentPopupProps> = ({ show, onDismiss }) => {
  if (!show) return null;

  return (
    <>
      {/* Backdrop with fade */}
      <div 
        className={`fixed inset-0 bg-neutral-foreground/50 transition-opacity duration-300 z-50 backdrop-blur-sm
          ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onDismiss}
      />
      
      {/* Popup with fade-scale */}
      <div 
        className={`fixed top-1/2 z-50 w-[90%] max-w-lg bg-surface rounded-xl shadow-2xl p-8
          transform -translate-y-1/2 transition-all duration-300 ease-out
          md:left-2/3 md:-translate-x-1/2
          ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          ${show ? 'animate-fade-scale' : ''}`}
      >
        {/* Close button */}
        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Close popup"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-medium text-text-primary mb-2">Welcome to GoodCup</h2>
            <p className="text-text-secondary">Help us personalize your experience</p>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-2 rounded-lg border border-neutral-border bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-secondary/50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 rounded-lg border border-neutral-border bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-secondary/50"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
                Phone <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="w-full px-4 py-2 rounded-lg border border-neutral-border bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-secondary/50"
                placeholder="Your phone number"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-secondary text-white py-3 px-6 rounded-lg font-medium hover:bg-brand-secondary/90 transition-colors"
            >
              Continue
            </button>
          </form>

          <p className="text-sm text-text-tertiary text-center">
            You can always update this information later
          </p>
        </div>
      </div>
    </>
  );
};

export default VisitorIdentPopup; 
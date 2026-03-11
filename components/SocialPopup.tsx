'use client';

import React, { useEffect } from 'react';

interface SocialPopupProps {
  open: boolean;
  onClose: () => void;
}

const SocialPopup: React.FC<SocialPopupProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose();
    }, 20000);

    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  const handleCardClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-foreground/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-[90%] max-w-md rounded-3xl bg-surface-background border border-neutral-border shadow-2xl px-6 py-6 md:px-8 md:py-7 text-neutral-foreground"
        onClick={handleCardClick}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-text-secondary hover:text-neutral-foreground transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="text-xs uppercase tracking-[0.22em] text-text-secondary mb-2">
          Stay in the loop
        </div>

        <h2 className="text-2xl md:text-3xl font-light mb-3">
          Follow us on Instagram & TikTok
        </h2>

        <p className="text-sm md:text-base text-text-secondary mb-5">
          Get recipes, healthy ritual ideas, and where to find us in person at local farmers markets.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://instagram.com/goodcup.me"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-foreground text-surface-background px-4 py-2 text-sm md:text-base font-medium hover:bg-brand-secondary transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-background text-neutral-foreground text-xs font-semibold">
              IG
            </span>
            <span>@goodcup.me</span>
          </a>

          <a
            href="https://tiktok.com/@goodcup.me"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-border px-4 py-2 text-sm md:text-base font-medium text-neutral-foreground hover:border-brand-secondary hover:text-brand-secondary transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-foreground text-surface-background text-xs font-semibold">
              TT
            </span>
            <span>@goodcup.me</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SocialPopup;


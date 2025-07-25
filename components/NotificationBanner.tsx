import React, { useState, useEffect } from 'react';
import { useBannerPromoQuery } from '../lib/queries/stripeQueries';

export interface NotificationBannerProps {
  show: boolean;
  onDismiss: () => void;
  message?: string;
  collapsed?: boolean;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ 
  show, 
  onDismiss, 
  message = "Summer 18% off - AUGUST18 at Checkout ;)" ,
  collapsed = false
}) => {
  const { data, isLoading, isError } = useBannerPromoQuery();
  if (!show) return null;
  if (isLoading) return null;
  if (isError) return null;
  if (!data || !data.code || !data.metadata?.copy) return null;

  return (
    <div 
      className={`fixed top-0 left-0 w-full bg-neutral-border/30 text-surface-background z-20 flex items-center justify-between px-4 py-3 transition-all duration-300 ease-in-out backdrop-blur-sm border-b border-transparent ${collapsed ? 'animate-slide-up' : 'animate-slide-down'}`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <p className="text-lg md:text-xl font-medium mx-auto pr-10 text-text-inverse">
        {data.metadata.copy}
      </p>
      <button 
        onClick={onDismiss}
        className="absolute right-4 text-surface-background hover:text-surface transition-colors"
        aria-label="Dismiss notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default NotificationBanner; 

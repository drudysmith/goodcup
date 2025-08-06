import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';

// Clarity tracking metadata interface
interface ClarityState {
  utmSource: string | null;
  utmCampaign: string | null;
  firstVisit: boolean;
  subscriptionStatus: 'none' | 'active' | 'cancelled';
  reactivated: boolean;
  cancelAttempt: boolean;
  flavorChoice: string | null;
  bundleType: string | null;
}

// Initial state
const initialState: ClarityState = {
  utmSource: null,
  utmCampaign: null,
  firstVisit: false,
  subscriptionStatus: 'none',
  reactivated: false,
  cancelAttempt: false,
  flavorChoice: null,
  bundleType: null,
};

// Create TanStack Store
export const clarityStore = new Store(initialState);

// Setter functions for each key
export const setUtmSource = (utmSource: string | null) => {
  clarityStore.setState((state) => ({
    ...state,
    utmSource,
  }));
};

export const setUtmCampaign = (utmCampaign: string | null) => {
  clarityStore.setState((state) => ({
    ...state,
    utmCampaign,
  }));
};

export const setFirstVisit = (firstVisit: boolean) => {
  clarityStore.setState((state) => ({
    ...state,
    firstVisit,
  }));
};

export const setSubscriptionStatus = (subscriptionStatus: 'none' | 'active' | 'cancelled') => {
  clarityStore.setState((state) => ({
    ...state,
    subscriptionStatus,
  }));
};

export const setReactivated = (reactivated: boolean) => {
  clarityStore.setState((state) => ({
    ...state,
    reactivated,
  }));
};

export const setCancelAttempt = (cancelAttempt: boolean) => {
  clarityStore.setState((state) => ({
    ...state,
    cancelAttempt,
  }));
};

export const setFlavorChoice = (flavorChoice: string | null) => {
  clarityStore.setState((state) => ({
    ...state,
    flavorChoice,
  }));
};

export const setBundleType = (bundleType: string | null) => {
  clarityStore.setState((state) => ({
    ...state,
    bundleType,
  }));
};

// Helper function to extract UTM parameters from URL
export const setFromUrl = () => {
  if (typeof window === 'undefined') return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmCampaign = urlParams.get('utm_campaign');
  
  if (utmSource) {
    setUtmSource(utmSource);
  }
  
  if (utmCampaign) {
    setUtmCampaign(utmCampaign);
  }
};

// Helper function to check and update first visit status
export const checkFirstVisit = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const hasVisited = localStorage.getItem('goodcup_first_visit');
    if (!hasVisited) {
      // First time visitor
      localStorage.setItem('goodcup_first_visit', 'true');
      setFirstVisit(true);
    } else {
      // Returning visitor
      setFirstVisit(false);
    }
  } catch (error) {
    // If localStorage is not available, assume first visit
    setFirstVisit(true);
  }
};

// Hook to get clarity state
export const useClarityState = () => {
  const state = useStore(clarityStore);
  return state;
};

// Hook to get specific clarity state with actions
export const useClarityStore = <T>(selector: (state: ClarityState) => T) => {
  const storeState = useStore(clarityStore);
  return selector(storeState);
}; 
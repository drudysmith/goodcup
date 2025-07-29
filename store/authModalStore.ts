import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';

// UxAuth 1: Auth modal state interface
interface AuthModalState {
  isOpen: boolean;
  email?: string;
  password?: string;
  mode?: 'signin' | 'signup';
}

// UxAuth 1: Initial state
const initialState: AuthModalState = {
  isOpen: false,
  email: undefined,
  password: undefined,
  mode: 'signin',
};

// UxAuth 1: Create auth modal store
export const authModalStore = new Store(initialState);

// UxAuth 1: Helper to read cached login info from localStorage
const getCachedCredentials = () => {
  try {
    const cached = localStorage.getItem('cached_login_info');
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

// UxAuth 1: Helper to save credentials to localStorage
const saveCachedCredentials = (email?: string, password?: string) => {
  try {
    const cached = { email, password };
    localStorage.setItem('cached_login_info', JSON.stringify(cached));
  } catch {
    // Ignore localStorage errors
  }
};

// UxAuth 1: Global method to open auth modal
export const openAuthModal = (email?: string, password?: string, mode: 'signin' | 'signup' = 'signin') => {
  // Read cached credentials if not provided
  const cached = getCachedCredentials();
  const finalEmail = email || cached.email;
  const finalPassword = password || cached.password;

  // Update store state
  authModalStore.setState(() => ({
    isOpen: true,
    email: finalEmail,
    password: finalPassword,
    mode,
  }));


};

// UxAuth 1: Global method to close auth modal
export const closeAuthModal = () => {
  authModalStore.setState(() => ({
    isOpen: false,
    email: undefined,
    password: undefined,
    mode: 'signin',
  }));


};

// UxAuth 1: Method to update cached credentials
export const updateCachedCredentials = (email?: string, password?: string) => {
  saveCachedCredentials(email, password);
};

// Method to update auth modal mode
export const setAuthModalMode = (mode: 'signin' | 'signup') => {
  authModalStore.setState((state) => ({
    ...state,
    mode,
  }));
};

// UxAuth 1: Hook to get auth modal state
export const useAuthModalState = () => {
  const state = useStore(authModalStore);
  return state;
}; 
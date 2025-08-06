import clarity from 'clarity-js';

export const trackClarity = (key: string, value: string) => {
  if (typeof window !== 'undefined' && clarity) {
    clarity('set', key, value);
  }
}; 
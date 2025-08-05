// Global logging toggle for development
export const LOG_ENABLED = true;

// Helper function for conditional logging
export const log = (...args: any[]) => {
  if (LOG_ENABLED) {
//     console.log(...args);
  }
};

// Helper function for conditional error logging
export const logError = (...args: any[]) => {
  if (LOG_ENABLED) {
    console.error(...args);
  }
};

// Helper function for conditional warning logging
export const logWarn = (...args: any[]) => {
  if (LOG_ENABLED) {
//     console.warn(...args);
  }
}; 

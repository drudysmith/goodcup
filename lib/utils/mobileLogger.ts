// Mobile logger utility for development/debugging on mobile browsers
// Only active in development or with ?debug=true in URL

let loggerInitialized = false;

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  // Simple UA check, can be replaced with 'is-mobile' if available
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function shouldEnableLogger() {
  if (typeof window === 'undefined') return false;
  const isDev = process.env.NODE_ENV === 'development';
  const debugParam = window.location && window.location.search.includes('debug=true');
  return isMobile() && (isDev || debugParam);
}

const API_URL = 'https://giiymwuynkzibpplvbyt.supabase.co/rest/v1/mobile_console_logs';
const API_HEADERS = {
  apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaXltd3V5bmt6aWJwcGx2Ynl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMzM5OTEsImV4cCI6MjA2MzYwOTk5MX0.NQk98sm1J1xfrKIiMvuWI6bB0F5FM0OSms7FW3P4kWo',
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaXltd3V5bmt6aWJwcGx2Ynl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMzM5OTEsImV4cCI6MjA2MzYwOTk5MX0.NQk98sm1J1xfrKIiMvuWI6bB0F5FM0OSms7FW3P4kWo',
  'Content-Type': 'application/json',
};

// Debounce map per log type
const debounceTimers: { [K in LogType]: ReturnType<typeof setTimeout> | null } = {
  log: null,
  warn: null,
  error: null,
};
const debounceQueue: { [K in LogType]: any[][] } = {
  log: [],
  warn: [],
  error: [],
};
const DEBOUNCE_MS = 200;

type LogType = 'log' | 'warn' | 'error';

function sendLog(log_type: LogType, args: any[]) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const body = {
    log_type,
    message: JSON.stringify(args),
    user_agent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
  fetch(API_URL, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(body),
  }).catch(() => {}); // Silently ignore errors
}

function debouncedSend(log_type: LogType) {
  const queue = debounceQueue[log_type];
  if (queue.length === 0) return;
  // Send all queued logs as separate requests
  while (queue.length > 0) {
    const args = queue.shift();
    if (Array.isArray(args)) {
      sendLog(log_type, args);
    }
  }
}

export function initMobileLogger() {
  if (loggerInitialized) return;
  if (!shouldEnableLogger()) return;
  loggerInitialized = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function makeLogger(log_type: LogType, origFn: (...args: any[]) => void) {
    return function(...args: any[]) {
      origFn.apply(console, args);
      debounceQueue[log_type].push(args);
      if (!debounceTimers[log_type]) {
        debounceTimers[log_type] = setTimeout(() => {
          debouncedSend(log_type);
          debounceTimers[log_type] = null;
        }, DEBOUNCE_MS);
      }
    };
  }

//   console.log = makeLogger('log', origLog);
//   console.warn = makeLogger('warn', origWarn);
  console.error = makeLogger('error', origError);
} 

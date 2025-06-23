/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // 🎨 COLOR SYSTEM - Semantic + Functional Naming
      colors: {
        // === TEXT COLORS - Font-specific color tokens ===
        text: {
          primary: '#0f172a',      // High contrast primary text (slate-900)
	  soft: '#fff6ed',         // light creame color for dark backgrounds
          secondary: '#334155',    // Medium contrast secondary text (slate-700)
          tertiary: '#64748b',     // Lower contrast tertiary text (slate-500)
          muted: '#94a3b8',        // Muted text for disabled/placeholder (slate-400)
          inverse: '#f8fafc',      // White text for dark backgrounds (slate-50)
          brand: '#c2410c',        // Brand-colored text (orange-700)
          accent: '#166534',       // Accent text (green-800)
          error: '#b91c1c',        // Error text (red-700)
          warning: '#d97706',      // Warning text (amber-600)
          success: '#15803d',      // Success text (green-700)
          info: '#1d4ed8',         // Info text (blue-700)
        },
        
        // === BRAND COLORS ===
        brand: {
          primary: '#dc743d',      // Main brand orange
          'primary-light': '#e6895a', // Lighter orange for hover states
          secondary: '#40a44c',    // Brand green (accent)
          dark: '#7e544c',         // Deep brown for emphasis
        },
        
        // === SURFACE COLORS ===
        surface: {
          DEFAULT: '#fff6ed',      // Primary surface (warm cream)
          background: '#ffffff',   // Pure white background
          elevated: '#e69763',     // Elevated surfaces (cards, modals)
          gradient: {
            start: '#a35e4a',     // Gradient backgrounds
            mid: '#e69763',
            end: '#fff6ed',
          }
        },
        
        // === SEMANTIC COLORS ===
        semantic: {
          error: '#dc3545',        // Error states
          success: '#40a44c',      // Success states (reuses brand secondary)
          warning: '#dc743d',      // Warning states (reuses brand primary)
          info: '#565e77',         // Info states
        },
        
        // === NEUTRAL COLORS ===
        neutral: {
          foreground: '#171717',   // Primary text
          border: '#565e77',       // Borders and dividers
          muted: '#939bb6',        // Muted text and icons
          'muted-light': '#b3bbd7', // Lighter muted elements
          'muted-bg': '#d4dcf9',   // Muted backgrounds
          clear: 'transparent',    // Transparent utility
        },
        
        // === LEGACY ALIASES (for backward compatibility - will be removed in Phase 4) ===
        primary: '#dc743d',
        'primary-light': '#e6895a',
        accent: '#40a44c',
        border: '#565e77',
        dark: '#7e544c',
        foreground: '#171717',
        background: '#fff6ed',
        error: '#dc3545',
        clear: 'transparent',
        'gray-shade-4': '#424656',
        'gray-shade-3': '#939bb6',
        'gray-shade-2': '#b3bbd7',
        'gray-shade-1': '#d4dcf9',
      },
      
      // ✍️ REFINED TYPOGRAPHY SYSTEM - Mathematical Scale (1.2 ratio)
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      
      fontSize: {
        // Mathematical type scale (1.2 ratio) with tighter line heights - 14px base
        'xs': ['0.67rem', { lineHeight: '1.0rem', letterSpacing: '0.025em' }],      // ~10.7px
        'sm': ['0.79rem', { lineHeight: '1.2rem', letterSpacing: '0.01em' }],       // ~12.7px
        'base': ['0.875rem', { lineHeight: '1.4rem', letterSpacing: '0em' }],       // 14px (new baseline)
        'lg': ['1.05rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],      // ~16.8px
        'xl': ['1.26rem', { lineHeight: '1.7rem', letterSpacing: '-0.015em' }],     // ~20.2px
        '2xl': ['1.51rem', { lineHeight: '1.9rem', letterSpacing: '-0.025em' }],    // ~24.2px
        '3xl': ['1.81rem', { lineHeight: '2.1rem', letterSpacing: '-0.035em' }],    // ~29px
        '4xl': ['2.17rem', { lineHeight: '2.4rem', letterSpacing: '-0.045em' }],    // ~34.7px
        '5xl': ['2.61rem', { lineHeight: '2.8rem', letterSpacing: '-0.055em' }],    // ~41.8px
        '6xl': ['3.13rem', { lineHeight: '3.3rem', letterSpacing: '-0.065em' }],    // ~50.1px
        '7xl': ['3.75rem', { lineHeight: '3.9rem', letterSpacing: '-0.075em' }],    // ~60px
        '8xl': ['4.50rem', { lineHeight: '4.6rem', letterSpacing: '-0.085em' }],    // ~72px
        '9xl': ['5.40rem', { lineHeight: '5.5rem', letterSpacing: '-0.095em' }],    // ~86.4px
        
        // Semantic type styles with tighter hierarchy and adjusted weights
        'display': ['3.75rem', { 
          lineHeight: '1.05', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.075em' 
        }],
        'heading-xl': ['3.13rem', { 
          lineHeight: '1.1', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.065em' 
        }],
        'heading-lg': ['2.61rem', { 
          lineHeight: '1.15', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.055em' 
        }],
        'heading-md': ['2.17rem', { 
          lineHeight: '1.2', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.045em' 
        }],
        'heading-sm': ['1.81rem', { 
          lineHeight: '1.25', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.035em' 
        }],
        'heading-xs': ['1.51rem', { 
          lineHeight: '1.3', 
          fontWeight: '400',  // Regular weight for headings
          letterSpacing: '-0.025em' 
        }],
        'subheading': ['1.26rem', { 
          lineHeight: '1.4', 
          fontWeight: '400',  // Regular weight
          letterSpacing: '-0.015em' 
        }],
        'body-xl': ['1.05rem', { 
          lineHeight: '1.6', 
          fontWeight: '300',  // Light weight for body
          letterSpacing: '-0.01em' 
        }],
        'body-lg': ['0.875rem', { 
          lineHeight: '1.6', 
          fontWeight: '300',  // Light weight for body
          letterSpacing: '0em' 
        }],
        'body-md': ['0.79rem', { 
          lineHeight: '1.5', 
          fontWeight: '300',  // Light weight for body
          letterSpacing: '0.01em' 
        }],
        'body-sm': ['0.67rem', { 
          lineHeight: '1.4', 
          fontWeight: '300',  // Light weight for body
          letterSpacing: '0.025em' 
        }],
        'caption': ['0.67rem', { 
          lineHeight: '1.3', 
          fontWeight: '500', 
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }],
        'overline': ['0.58rem', { 
          lineHeight: '1.1', 
          fontWeight: '600', 
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }],
      },
      
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      
      letterSpacing: {
        tightest: '-0.095em',
        tighter: '-0.065em',
        tight: '-0.035em',
        snug: '-0.015em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
        ultrawide: '0.2em',
      },
      
      lineHeight: {
        none: '1',
        tighter: '1.05',
        tight: '1.1',
        snug: '1.2',
        normal: '1.4',
        relaxed: '1.5',
        loose: '1.6',
        looser: '1.8',
      },
      
      // === UTILITIES ===
      opacity: {
        65: '0.65',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-slow': 'fadeIn 1s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-out',
      },
    },
  },
  plugins: [],
}; 

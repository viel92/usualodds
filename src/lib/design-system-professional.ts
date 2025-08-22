/**
 * DESIGN SYSTEM PROFESSIONNEL
 * Inspired by FiveThirtyEight, The Athletic, and premium sports betting platforms
 */

export const DESIGN_TOKENS = {
  // PROFESSIONAL COLOR PALETTE
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe', 
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      900: '#0c4a6e'
    },
    
    // Neutral grays (main palette)
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    },
    
    // Success states (predictions, wins)
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    
    // Warning states (medium confidence)
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706'
    },
    
    // Error states (low confidence, risks)
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626'
    },
    
    // Team colors
    team: {
      home: '#0ea5e9', // Blue for home team
      away: '#ef4444', // Red for away team
      draw: '#64748b'  // Gray for draw
    }
  },
  
  // PROFESSIONAL TYPOGRAPHY
  typography: {
    // Font families
    fonts: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace']
    },
    
    // Font sizes (mobile-first approach)
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px  
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'  // 36px
    },
    
    // Line heights
    leading: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625'
    },
    
    // Font weights
    weights: {
      normal: '400',
      medium: '500', 
      semibold: '600',
      bold: '700',
      black: '900'
    }
  },
  
  // PROFESSIONAL SPACING SYSTEM
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px  
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },
  
  // BORDER RADIUS
  radius: {
    none: '0',
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    full: '9999px'
  },
  
  // SHADOWS (subtle professional shadows)
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
  },
  
  // PROFESSIONAL COMPONENT VARIANTS
  components: {
    card: {
      default: 'bg-white border border-neutral-200 rounded-lg shadow-sm',
      elevated: 'bg-white border border-neutral-200 rounded-lg shadow-md',
      prediction: 'bg-white border-l-4 border-l-primary-500 rounded-lg shadow-sm'
    },
    
    badge: {
      confidence: {
        high: 'bg-success-100 text-success-700 border border-success-200',
        medium: 'bg-warning-100 text-warning-700 border border-warning-200', 
        low: 'bg-neutral-100 text-neutral-700 border border-neutral-200'
      },
      
      prediction: {
        home: 'bg-team-home/10 text-team-home border border-team-home/20',
        away: 'bg-team-away/10 text-team-away border border-team-away/20',
        draw: 'bg-team-draw/10 text-team-draw border border-team-draw/20'
      }
    }
  }
};

// UTILITY FUNCTIONS
export const getConfidenceColor = (confidence: number) => {
  if (confidence >= 70) return DESIGN_TOKENS.colors.success[600];
  if (confidence >= 60) return DESIGN_TOKENS.colors.warning[600];
  return DESIGN_TOKENS.colors.neutral[500];
};

export const getPredictionColor = (prediction: 'home' | 'away' | 'draw') => {
  return DESIGN_TOKENS.colors.team[prediction];
};

export const getTeamLogoUrl = (teamName: string, logoUrl?: string) => {
  // If we have a logo URL from database, use it
  if (logoUrl) return logoUrl;
  
  // Otherwise, fallback to placeholder or team initial
  return `/api/teams/logo/${encodeURIComponent(teamName)}`;
};

// RESPONSIVE BREAKPOINTS
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// ANIMATION TOKENS
export const ANIMATIONS = {
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out'
  },
  
  easings: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)'
  }
};
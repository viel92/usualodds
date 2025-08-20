/**
 * DESIGN TOKENS PREMIUM - USUALODDS SAAS
 * ====================================
 * 
 * Système de design unifié niveau enterprise
 * Inspiré de Stripe, Linear, Vercel
 */

export const designTokens = {
  // 🎨 PALETTE COULEURS PREMIUM
  colors: {
    // Primary - Blue sophistiqué
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb', // Main brand
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },

    // Secondary - Indigo premium
    secondary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe', 
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5', // Main secondary
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81'
    },

    // Success - Green énergique
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669', // Main success
      700: '#047857',
      800: '#065f46',
      900: '#064e3b'
    },

    // Warning - Orange vibrant
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706', // Main warning
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },

    // Error - Red distinctif
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5', 
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626', // Main error
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },

    // Neutral - Gray sophistiqué
    neutral: {
      25: '#fcfcfd',
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b', // Main neutral
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    }
  },

  // ✨ GRADIENTS SIGNATURE
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    warning: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    mesh: `
      radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
    `
  },

  // 📝 SYSTÈME TYPOGRAPHIQUE
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      display: ['Inter', 'system-ui', 'sans-serif']
    },

    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem'   // 60px
    },

    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },

    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },

  // 📐 ESPACEMENT & SIZING
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
    '4xl': '6rem',  // 96px
    '5xl': '8rem'   // 128px
  },

  // 🔲 BORDER RADIUS
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },

  // 🌑 SHADOWS
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  // ⚡ TRANSITIONS
  transition: {
    duration: {
      fast: '150ms',
      normal: '300ms', 
      slow: '500ms'
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // 📱 BREAKPOINTS
  screens: {
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
    ultra: '1920px'
  },

  // 🎭 Z-INDEX
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  }
};

// 🌙 DARK MODE TOKENS
export const darkModeTokens = {
  colors: {
    // Couleurs inversées pour dark mode
    primary: {
      50: '#1e293b',
      500: '#60a5fa',
      600: '#3b82f6'
    },
    neutral: {
      25: '#020617',
      50: '#0f172a', 
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      900: '#f1f5f9',
      950: '#f8fafc'
    }
  },
  background: '#0f172a',
  foreground: '#f1f5f9',
  card: '#1e293b',
  border: '#334155'
};

// 🎨 COMPONENT VARIANTS
export const componentVariants = {
  button: {
    primary: {
      bg: 'bg-gradient-to-r from-primary-600 to-primary-700',
      hover: 'hover:from-primary-700 hover:to-primary-800',
      text: 'text-white',
      shadow: 'shadow-lg shadow-primary-500/25',
      hoverShadow: 'hover:shadow-xl hover:shadow-primary-500/30'
    },
    secondary: {
      bg: 'bg-white',
      hover: 'hover:bg-neutral-50',
      text: 'text-neutral-700 hover:text-neutral-900',
      border: 'border border-neutral-200 hover:border-neutral-300',
      shadow: 'shadow-sm hover:shadow-md'
    },
    success: {
      bg: 'bg-gradient-to-r from-success-600 to-success-700',
      hover: 'hover:from-success-700 hover:to-success-800',
      text: 'text-white',
      shadow: 'shadow-lg shadow-success-500/25'
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-neutral-100',
      text: 'text-neutral-600 hover:text-neutral-900',
      border: 'border-0'
    }
  },

  card: {
    default: {
      bg: 'bg-white',
      border: 'border border-neutral-200',
      shadow: 'shadow-sm hover:shadow-md'
    },
    elevated: {
      bg: 'bg-white',
      border: 'border border-neutral-200',
      shadow: 'shadow-lg hover:shadow-xl'
    },
    gradient: {
      bg: 'bg-gradient-to-br from-white to-neutral-50',
      border: 'border border-neutral-200',
      shadow: 'shadow-lg hover:shadow-xl'
    },
    glass: {
      bg: 'bg-white/80 backdrop-blur-sm',
      border: 'border border-white/20',
      shadow: 'shadow-xl'
    }
  }
};

// 🔧 UTILITY FUNCTIONS
export const getColorValue = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = designTokens.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

export const getSpacingValue = (size: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[size];
};

export const getFontSize = (size: keyof typeof designTokens.typography.fontSize) => {
  return designTokens.typography.fontSize[size];
};
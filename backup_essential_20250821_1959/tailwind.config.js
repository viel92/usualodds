/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // 🎨 COULEURS PREMIUM
      colors: {
        primary: {
          50: 'rgb(239 246 255)',
          100: 'rgb(219 234 254)', 
          200: 'rgb(191 219 254)',
          300: 'rgb(147 197 253)',
          400: 'rgb(96 165 250)',
          500: 'rgb(59 130 246)',
          600: 'rgb(37 99 235)',
          700: 'rgb(29 78 216)',
          800: 'rgb(30 64 175)',
          900: 'rgb(30 58 138)',
          950: 'rgb(23 37 84)'
        },
        secondary: {
          50: 'rgb(238 242 255)',
          100: 'rgb(224 231 255)',
          200: 'rgb(199 210 254)', 
          300: 'rgb(165 180 252)',
          400: 'rgb(129 140 248)',
          500: 'rgb(99 102 241)',
          600: 'rgb(79 70 229)',
          700: 'rgb(67 56 202)',
          800: 'rgb(55 48 163)',
          900: 'rgb(49 46 129)'
        },
        success: {
          50: 'rgb(236 253 245)',
          100: 'rgb(209 250 229)',
          200: 'rgb(167 243 208)',
          300: 'rgb(110 231 183)',
          400: 'rgb(52 211 153)',
          500: 'rgb(16 185 129)',
          600: 'rgb(5 150 105)',
          700: 'rgb(4 120 87)',
          800: 'rgb(6 95 70)',
          900: 'rgb(6 78 59)'
        },
        warning: {
          50: 'rgb(255 251 235)',
          100: 'rgb(254 243 199)',
          200: 'rgb(253 230 138)',
          300: 'rgb(252 211 77)',
          400: 'rgb(251 191 36)',
          500: 'rgb(245 158 11)',
          600: 'rgb(217 119 6)',
          700: 'rgb(180 83 9)',
          800: 'rgb(146 64 14)',
          900: 'rgb(120 53 15)'
        },
        error: {
          50: 'rgb(254 242 242)',
          100: 'rgb(254 226 226)',
          200: 'rgb(254 202 202)',
          300: 'rgb(252 165 165)', 
          400: 'rgb(248 113 113)',
          500: 'rgb(239 68 68)',
          600: 'rgb(220 38 38)',
          700: 'rgb(185 28 28)',
          800: 'rgb(153 27 27)',
          900: 'rgb(127 29 29)'
        },
        neutral: {
          25: 'rgb(252 252 253)',
          50: 'rgb(248 250 252)',
          100: 'rgb(241 245 249)',
          200: 'rgb(226 232 240)',
          300: 'rgb(203 213 225)',
          400: 'rgb(148 163 184)',
          500: 'rgb(100 116 139)',
          600: 'rgb(71 85 105)',
          700: 'rgb(51 65 85)',
          800: 'rgb(30 41 59)',
          900: 'rgb(15 23 42)',
          950: 'rgb(2 6 23)'
        },
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        card: 'rgb(var(--card))',
        'card-foreground': 'rgb(var(--card-foreground))',
        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
      },

      // 📝 TYPOGRAPHY
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-lg': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'headline-lg': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'headline-md': ['clamp(1.25rem, 2.5vw, 1.5rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'body-md': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'caption-lg': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'caption-md': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0' }],
      },

      // 📐 SPACING
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },

      // 🔲 BORDER RADIUS
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },

      // 🌑 BOX SHADOW
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },

      // 🎬 ANIMATIONS
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },

      // 🎨 BACKGROUND IMAGE
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
      },

      // 📱 SCREENS
      screens: {
        'mobile': '0px',
        'tablet': '768px', 
        'desktop': '1024px',
        'wide': '1440px',
        'ultra': '1920px',
      },

      // 🎭 Z-INDEX
      zIndex: {
        'hide': '-1',
        'auto': 'auto',
        'base': '0',
        'docked': '10',
        'dropdown': '1000',
        'sticky': '1100', 
        'banner': '1200',
        'overlay': '1300',
        'modal': '1400',
        'popover': '1500',
        'skipLink': '1600',
        'toast': '1700',
        'tooltip': '1800',
      },

      // ⚡ TRANSITION
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },

      transitionTimingFunction: {
        'bouncy': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // 📊 GRID
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(0, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(0, 1fr))',
      },

      // 🔤 CONTENT
      content: {
        'empty': '""',
      },
    },
  },
  plugins: [],
}
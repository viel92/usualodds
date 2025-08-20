'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes/dist/types'

/**
 * THEME PROVIDER PREMIUM - USUALODDS SAAS
 * ======================================
 * Gestion de thème sophistiquée avec dark mode
 * Transitions fluides et persistance
 */

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={true}
      storageKey="usualodds-theme"
      themes={['light', 'dark']}
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Hook personnalisé pour le thème avec fonctionnalités avancées
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = require('next-themes').useTheme()
  
  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])
  
  const isDark = resolvedTheme === 'dark'
  const isLight = resolvedTheme === 'light'
  const isSystem = theme === 'system'
  
  return {
    theme,
    setTheme,
    toggleTheme,
    resolvedTheme,
    systemTheme,
    isDark,
    isLight,
    isSystem
  }
}
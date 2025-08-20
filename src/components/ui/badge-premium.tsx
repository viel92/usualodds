'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * BADGE PREMIUM SYSTEM - USUALODDS SAAS
 * ====================================
 * Système de badges contextuels et sophistiqués
 * Pour confidence, status, tags, etc.
 */

const badgeVariants = cva(
  // Base styles
  `
    inline-flex items-center justify-center
    font-medium rounded-full
    transition-all duration-200
    whitespace-nowrap
  `,
  {
    variants: {
      variant: {
        // 🔵 Default - Neutre et propre
        default: `
          bg-neutral-100 text-neutral-800
          hover:bg-neutral-200
        `,
        
        // 🚀 Primary - Bleu brand
        primary: `
          bg-primary-100 text-primary-800
          hover:bg-primary-200
        `,
        
        // 🟣 Secondary - Indigo
        secondary: `
          bg-secondary-100 text-secondary-800
          hover:bg-secondary-200
        `,
        
        // ✅ Success - Vert pour réussite
        success: `
          bg-success-100 text-success-800
          hover:bg-success-200
        `,
        
        // ⚠️ Warning - Orange pour attention
        warning: `
          bg-warning-100 text-warning-800
          hover:bg-warning-200
        `,
        
        // 🚨 Error - Rouge pour erreur
        error: `
          bg-error-100 text-error-800
          hover:bg-error-200
        `,
        
        // ⚫ Dark - Sombre
        dark: `
          bg-neutral-800 text-white
          hover:bg-neutral-700
        `,
        
        // 🔲 Outline - Bordure seule
        outline: `
          bg-transparent border
          border-neutral-200 text-neutral-700
          hover:bg-neutral-50
        `,
        
        // 💎 Gradient - Dégradé premium
        gradient: `
          bg-gradient-to-r from-primary-500 to-secondary-500
          text-white shadow-lg
          hover:from-primary-600 hover:to-secondary-600
        `,
        
        // 🌟 Gold - Pour éléments premium
        gold: `
          bg-gradient-to-r from-warning-400 to-warning-600
          text-white shadow-lg
          hover:from-warning-500 hover:to-warning-700
        `
      },
      
      size: {
        xs: 'px-2 py-0.5 text-xs h-5',
        sm: 'px-2.5 py-0.5 text-xs h-6',
        md: 'px-3 py-1 text-sm h-7',
        lg: 'px-4 py-1.5 text-sm h-8',
        xl: 'px-5 py-2 text-base h-10'
      },
      
      dot: {
        true: 'relative pl-6',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      dot: false
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size, dot }), className)}
      {...props}
    >
      {dot && (
        <span 
          className={cn(
            'absolute left-2 w-2 h-2 rounded-full',
            dotColor || 'bg-current'
          )} 
        />
      )}
      {children}
    </div>
  )
)
Badge.displayName = 'Badge'

// 🎯 CONFIDENCE BADGE - Spécialisé pour les niveaux de confiance
interface ConfidenceBadgeProps extends Omit<BadgeProps, 'variant'> {
  confidence: number // 0-100
  showPercentage?: boolean
}

const ConfidenceBadge = React.forwardRef<HTMLDivElement, ConfidenceBadgeProps>(
  ({ confidence, showPercentage = true, className, ...props }, ref) => {
    const getVariant = () => {
      if (confidence >= 80) return 'success'
      if (confidence >= 60) return 'warning'
      return 'error'
    }
    
    const getLabel = () => {
      if (confidence >= 80) return 'Haute'
      if (confidence >= 60) return 'Moyenne'
      return 'Faible'
    }
    
    return (
      <Badge
        ref={ref}
        variant={getVariant()}
        className={className}
        {...props}
      >
        {showPercentage ? `${confidence}%` : getLabel()}
      </Badge>
    )
  }
)
ConfidenceBadge.displayName = 'ConfidenceBadge'

// 📊 STATUS BADGE - Pour états système
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'online' | 'offline' | 'loading' | 'error' | 'maintenance'
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = {
      online: { variant: 'success' as const, label: 'En ligne', dot: true, dotColor: 'bg-success-500' },
      offline: { variant: 'error' as const, label: 'Hors ligne', dot: true, dotColor: 'bg-error-500' },
      loading: { variant: 'warning' as const, label: 'Chargement', dot: true, dotColor: 'bg-warning-500' },
      error: { variant: 'error' as const, label: 'Erreur', dot: true, dotColor: 'bg-error-500' },
      maintenance: { variant: 'dark' as const, label: 'Maintenance', dot: true, dotColor: 'bg-neutral-500' }
    }
    
    const { variant, label, dot, dotColor } = config[status]
    
    return (
      <Badge
        ref={ref}
        variant={variant}
        dot={dot}
        dotColor={dotColor}
        className={className}
        {...props}
      >
        {label}
      </Badge>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

// 🏷️ TAG BADGE - Pour catégories/tags
interface TagBadgeProps extends BadgeProps {
  removable?: boolean
  onRemove?: () => void
}

const TagBadge = React.forwardRef<HTMLDivElement, TagBadgeProps>(
  ({ removable, onRemove, children, className, ...props }, ref) => (
    <Badge
      ref={ref}
      variant="outline"
      size="sm"
      className={cn('cursor-pointer hover:scale-105', className)}
      {...props}
    >
      <span>{children}</span>
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-neutral-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
        >
          ×
        </button>
      )}
    </Badge>
  )
)
TagBadge.displayName = 'TagBadge'

// 🏆 ACHIEVEMENT BADGE - Pour accomplissements
interface AchievementBadgeProps extends Omit<BadgeProps, 'variant'> {
  type: 'streak' | 'accuracy' | 'premium' | 'expert'
}

const AchievementBadge = React.forwardRef<HTMLDivElement, AchievementBadgeProps>(
  ({ type, children, className, ...props }, ref) => {
    const config = {
      streak: { variant: 'gradient' as const, icon: '🔥' },
      accuracy: { variant: 'success' as const, icon: '🎯' },
      premium: { variant: 'gold' as const, icon: '👑' },
      expert: { variant: 'dark' as const, icon: '⭐' }
    }
    
    const { variant, icon } = config[type]
    
    return (
      <Badge
        ref={ref}
        variant={variant}
        className={cn('shadow-lg', className)}
        {...props}
      >
        <span className="mr-1">{icon}</span>
        {children}
      </Badge>
    )
  }
)
AchievementBadge.displayName = 'AchievementBadge'

// 📈 TREND BADGE - Pour tendances
interface TrendBadgeProps extends Omit<BadgeProps, 'variant'> {
  trend: 'up' | 'down' | 'neutral'
  value?: string
}

const TrendBadge = React.forwardRef<HTMLDivElement, TrendBadgeProps>(
  ({ trend, value, className, ...props }, ref) => {
    const config = {
      up: { variant: 'success' as const, icon: '↗️' },
      down: { variant: 'error' as const, icon: '↘️' },
      neutral: { variant: 'default' as const, icon: '→' }
    }
    
    const { variant, icon } = config[trend]
    
    return (
      <Badge
        ref={ref}
        variant={variant}
        size="sm"
        className={className}
        {...props}
      >
        <span className="mr-1">{icon}</span>
        {value}
      </Badge>
    )
  }
)
TrendBadge.displayName = 'TrendBadge'

export {
  Badge,
  ConfidenceBadge,
  StatusBadge,
  TagBadge,
  AchievementBadge,
  TrendBadge,
  badgeVariants
}
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * CARD PREMIUM SYSTEM - USUALODDS SAAS
 * ===================================
 * Système de cartes sophistiqué avec profondeur et interactions
 * Niveau Stripe, Linear, Vercel
 */

const cardVariants = cva(
  // Base styles communs
  `
    rounded-xl border transition-all duration-300
    relative overflow-hidden
  `,
  {
    variants: {
      variant: {
        // 📄 Default - Style standard propre
        default: `
          bg-white border-neutral-200
          shadow-sm hover:shadow-md
        `,
        
        // ⬆️ Elevated - Plus de profondeur
        elevated: `
          bg-white border-neutral-200
          shadow-lg hover:shadow-xl
        `,
        
        // 🎨 Gradient - Fond dégradé subtil
        gradient: `
          bg-gradient-to-br from-white to-neutral-50
          border-neutral-200
          shadow-lg hover:shadow-xl
        `,
        
        // 🔮 Glass - Effet glassmorphism
        glass: `
          bg-white/80 backdrop-blur-sm
          border-white/20
          shadow-xl
        `,
        
        // 🌟 Primary - Accent bleu
        primary: `
          bg-gradient-to-br from-primary-50 to-white
          border-primary-200
          shadow-sm hover:shadow-lg
        `,
        
        // ✅ Success - Accent vert
        success: `
          bg-gradient-to-br from-success-50 to-white
          border-success-200
          shadow-sm hover:shadow-lg
        `,
        
        // ⚠️ Warning - Accent orange
        warning: `
          bg-gradient-to-br from-warning-50 to-white
          border-warning-200
          shadow-sm hover:shadow-lg
        `,
        
        // 🚨 Error - Accent rouge
        error: `
          bg-gradient-to-br from-error-50 to-white
          border-error-200
          shadow-sm hover:shadow-lg
        `,
        
        // 🖤 Dark - Mode sombre
        dark: `
          bg-neutral-800 border-neutral-700
          text-white shadow-lg hover:shadow-xl
        `,
        
        // 🔲 Outline - Bordure seule
        outline: `
          bg-transparent border-neutral-200
          hover:bg-neutral-50
        `
      },
      
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
        '2xl': 'p-12'
      },
      
      interactive: {
        none: '',
        hover: 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1',
        subtle: 'cursor-pointer hover:scale-[1.01]',
        glow: 'cursor-pointer hover:shadow-xl hover:shadow-primary-500/25'
      },
      
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md', 
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'lg',
      interactive: 'none',
      rounded: 'xl'
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive, rounded, className }))}
      {...props}
    />
  )
)
Card.displayName = 'Card'

// Header component pour structure cohérente
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// Title component
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  >
    {children}
  </h3>
))
CardTitle.displayName = 'CardTitle'

// Description component
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

// Content component
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
CardContent.displayName = 'CardContent'

// Footer component
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

// Stat Card - composant spécialisé pour metrics
interface StatCardProps extends CardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, trend, icon, className, ...props }, ref) => {
    const getTrendColor = () => {
      switch (trend) {
        case 'up': return 'text-success-600'
        case 'down': return 'text-error-600'
        default: return 'text-neutral-500'
      }
    }
    
    const getTrendIcon = () => {
      switch (trend) {
        case 'up': return '↗️'
        case 'down': return '↘️'
        default: return '→'
      }
    }
    
    return (
      <Card
        ref={ref}
        variant="elevated"
        interactive="subtle"
        className={className}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
          </div>
          {change && (
            <div className={cn('flex items-center text-sm font-medium', getTrendColor())}>
              <span className="mr-1">{getTrendIcon()}</span>
              {change}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-bold text-neutral-900">
            {value}
          </div>
        </div>
      </Card>
    )
  }
)
StatCard.displayName = 'StatCard'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  cardVariants
}
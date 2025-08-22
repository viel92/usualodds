'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * BUTTON PREMIUM SYSTEM - USUALODDS SAAS
 * ====================================
 * Système de boutons sophistiqué niveau enterprise
 * Inspiré de Stripe, Linear, Vercel
 */

const buttonVariants = cva(
  // Base styles - communes à tous les boutons
  `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-4 focus:ring-offset-0
    disabled:pointer-events-none disabled:opacity-50
    active:scale-[0.98]
    relative overflow-hidden
    whitespace-nowrap
  `,
  {
    variants: {
      variant: {
        // 🚀 Primary - Gradient avec glow effect
        primary: `
          bg-gradient-to-r from-primary-600 to-primary-700
          hover:from-primary-700 hover:to-primary-800
          text-white shadow-lg shadow-primary-500/25
          hover:shadow-xl hover:shadow-primary-500/30
          border border-primary-600
          focus:ring-primary-500/30
        `,
        
        // ⚪ Secondary - Clean et professionnel  
        secondary: `
          bg-white hover:bg-neutral-50
          text-neutral-700 hover:text-neutral-900
          border border-neutral-200 hover:border-neutral-300
          shadow-sm hover:shadow-md
          focus:ring-primary-500/20
        `,
        
        // ✅ Success - Pour actions de confirmation
        success: `
          bg-gradient-to-r from-success-600 to-success-700
          hover:from-success-700 hover:to-success-800
          text-white shadow-lg shadow-success-500/25
          hover:shadow-xl hover:shadow-success-500/30
          border border-success-600
          focus:ring-success-500/30
        `,
        
        // ⚠️ Warning - Pour actions critiques
        warning: `
          bg-gradient-to-r from-warning-600 to-warning-700
          hover:from-warning-700 hover:to-warning-800
          text-white shadow-lg shadow-warning-500/25
          hover:shadow-xl hover:shadow-warning-500/30
          border border-warning-600
          focus:ring-warning-500/30
        `,
        
        // 🚨 Destructive - Pour suppression/danger
        destructive: `
          bg-gradient-to-r from-error-600 to-error-700
          hover:from-error-700 hover:to-error-800
          text-white shadow-lg shadow-error-500/25
          hover:shadow-xl hover:shadow-error-500/30
          border border-error-600
          focus:ring-error-500/30
        `,
        
        // 👻 Ghost - Minimal et discret
        ghost: `
          bg-transparent hover:bg-neutral-100
          text-neutral-600 hover:text-neutral-900
          border-0 shadow-none
          focus:ring-primary-500/20
        `,
        
        // 🔗 Link - Style lien souligné
        link: `
          bg-transparent hover:bg-transparent
          text-primary-600 hover:text-primary-700
          underline-offset-4 hover:underline
          border-0 shadow-none p-0 h-auto
          focus:ring-primary-500/20
        `,
        
        // ✨ Outline - Bordure colorée
        outline: `
          bg-transparent hover:bg-primary-50
          text-primary-600 hover:text-primary-700
          border-2 border-primary-600 hover:border-primary-700
          shadow-none
          focus:ring-primary-500/20
        `
      },
      
      size: {
        xs: 'h-7 px-2 text-xs gap-1',
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-11 px-6 text-base gap-2',
        xl: 'h-12 px-8 text-lg gap-2.5',
        '2xl': 'h-14 px-10 text-xl gap-3',
        
        // Icon only sizes
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
      
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'lg'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    rounded,
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props 
  }, ref) => {
    
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Content avec opacity réduite pendant loading */}
        <div className={cn(
          'flex items-center gap-2',
          loading && 'opacity-0'
        )}>
          {leftIcon && (
            <span className="flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          
          <span>{children}</span>
          
          {rightIcon && (
            <span className="flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
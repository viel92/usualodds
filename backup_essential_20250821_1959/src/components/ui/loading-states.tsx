'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * LOADING STATES PREMIUM - USUALODDS SAAS
 * ======================================
 * Système de loading states élégant niveau enterprise
 * Skeletons, spinners, progress bars sophistiqués
 */

// 🔄 SPINNER COMPONENT
const spinnerVariants = cva(
  'animate-spin rounded-full border-2',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 border-t-primary-600',
        primary: 'border-primary-200 border-t-primary-600',
        success: 'border-success-200 border-t-success-600',
        warning: 'border-warning-200 border-t-warning-600',
        error: 'border-error-200 border-t-error-600',
        white: 'border-white/30 border-t-white'
      },
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
        '2xl': 'w-16 h-16'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

interface SpinnerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(spinnerVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Spinner.displayName = 'Spinner'

// 💀 SKELETON COMPONENT
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, lines = 1, ...props }, ref) => {
    if (lines === 1) {
      return (
        <div
          ref={ref}
          className={cn(
            'animate-pulse rounded-md bg-neutral-200',
            className
          )}
          {...props}
        />
      )
    }

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-md bg-neutral-200 h-4"
            style={{
              width: i === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    )
  }
)
Skeleton.displayName = 'Skeleton'

// 📊 PROGRESS BAR
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  max?: number
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  animated?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value, 
    max = 100, 
    variant = 'default',
    size = 'md',
    showValue = false,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    }
    
    const variantClasses = {
      default: 'bg-primary-600',
      primary: 'bg-primary-600',
      success: 'bg-success-600',
      warning: 'bg-warning-600',
      error: 'bg-error-600'
    }
    
    return (
      <div className="w-full">
        {showValue && (
          <div className="flex justify-between text-sm text-neutral-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(
            'w-full bg-neutral-200 rounded-full overflow-hidden',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant],
              animated && 'animate-pulse'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = 'Progress'

// 🃏 CARD SKELETON - Pour cartes de prédictions
const PredictionCardSkeleton = () => (
  <div className="card-elevated p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    
    <div className="flex items-center justify-between mb-6">
      <div className="text-center flex-1">
        <Skeleton className="h-6 w-16 mb-2" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full mx-4" />
      <div className="text-center flex-1">
        <Skeleton className="h-6 w-16 mb-2" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
    
    <div className="grid grid-cols-3 gap-2 mb-6">
      <Skeleton className="h-12 rounded" />
      <Skeleton className="h-12 rounded" />
      <Skeleton className="h-12 rounded" />
    </div>
    
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
)

// 📊 STATS SKELETON - Pour dashboard
const StatsCardSkeleton = () => (
  <div className="card-elevated p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
    <Skeleton className="h-8 w-16 mb-1" />
    <Skeleton className="h-3 w-24" />
  </div>
)

// 📝 TEXT SKELETON - Pour contenus textuels
const TextSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i}
        className="h-4"
        style={{
          width: i === lines - 1 ? '75%' : '100%'
        }}
      />
    ))}
  </div>
)

// 📋 LIST SKELETON - Pour listes
const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
)

// 🎯 LOADING OVERLAY - Pour états de chargement complets
interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  message?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Chargement...'
}) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-sm text-neutral-600 font-medium">{message}</p>
        </div>
      </div>
    )}
  </div>
)

// 🔄 BUTTON LOADING - État chargement pour boutons
interface ButtonLoadingProps {
  loading?: boolean
  children: React.ReactNode
}

const ButtonLoading: React.FC<ButtonLoadingProps> = ({ loading, children }) => (
  <div className="relative flex items-center justify-center">
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <Spinner size="sm" variant="white" />
      </div>
    )}
    <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
      {children}
    </div>
  </div>
)

export {
  Spinner,
  Skeleton,
  Progress,
  PredictionCardSkeleton,
  StatsCardSkeleton,
  TextSkeleton,
  ListSkeleton,
  LoadingOverlay,
  ButtonLoading,
  spinnerVariants
}
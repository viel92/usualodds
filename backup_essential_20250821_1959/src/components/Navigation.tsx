'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ChevronDown, Settings, LogOut, User, Home, BarChart3, Target } from 'lucide-react'
import { Button } from '@/components/ui/button-premium'
import { StatusBadge } from '@/components/ui/badge-premium'

/**
 * NAVIGATION PREMIUM - USUALODDS SAAS
 * ==================================
 * Navigation moderne et sophistiquée niveau enterprise
 * Mobile-first, responsive, avec animations
 */

const navItems = [
  { href: '/', label: 'Accueil', icon: Home, description: 'Page d\'accueil' },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, description: 'Vue d\'ensemble' },
  { href: '/predictions', label: 'Prédictions', icon: Target, description: 'Toutes les prédictions' }
]

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  return (
    <>
      {/* Navigation principale */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50 dark-mode-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo et branding */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl transition-all group-hover:scale-110 group-hover:bg-primary-100">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    UsualOdds
                  </span>
                  <div className="text-xs text-neutral-500 font-medium">Football AI</div>
                </div>
              </Link>
              
              {/* Breadcrumb sur desktop */}
              <div className="hidden lg:flex items-center text-sm text-neutral-500">
                <span>/</span>
                <span className="ml-2 font-medium text-neutral-700">
                  {navItems.find(item => item.href === pathname)?.label || 'Page'}
                </span>
              </div>
            </div>

            {/* Navigation desktop */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group relative flex items-center space-x-2 px-4 py-2 rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <span className="transition-transform group-hover:scale-110">
                      <item.icon className="w-4 h-4" />
                    </span>
                    <span>{item.label}</span>
                    
                    {/* Indicateur actif */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Actions droite */}
            <div className="flex items-center space-x-3">
              
              {/* Status système */}
              <div className="hidden sm:block">
                <StatusBadge status="online" />
              </div>

              {/* Profile menu (simulé) */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    U
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <div className="font-semibold text-neutral-900">Utilisateur</div>
                      <div className="text-sm text-neutral-500">user@usualodds.com</div>
                    </div>
                    
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Mon profil</span>
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Paramètres</span>
                      </button>
                    </div>
                    
                    <div className="border-t border-neutral-100 pt-1">
                      <button className="w-full px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50 flex items-center space-x-2">
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <span className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-neutral-500">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {/* Mobile footer */}
            <div className="border-t border-neutral-100 px-4 py-3">
              <StatusBadge status="online" />
            </div>
          </div>
        )}
      </nav>

      {/* Click outside to close menus */}
      {(isMobileMenuOpen || isProfileMenuOpen) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMobileMenuOpen(false)
            setIsProfileMenuOpen(false)
          }}
        />
      )}
    </>
  )
}
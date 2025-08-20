'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * NAVIGATION SIMPLE USUALODDS
 */

const navItems = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/predictions', label: 'Prédictions', icon: '🔮' },
  { href: '/admin', label: 'Admin', icon: '⚙️' }
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">⚽</span>
            <span className="text-xl font-bold text-gray-900">UsualOdds</span>
          </Link>

          {/* Navigation */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Système opérationnel</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
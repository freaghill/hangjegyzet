import React from 'react'
import { Mic2 } from 'lucide-react'

interface LogoProps {
  variant?: 'full' | 'icon' | 'compact'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ variant = 'full', className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { height: 32, text: 'text-lg', icon: 20 },
    md: { height: 40, text: 'text-xl', icon: 24 },
    lg: { height: 48, text: 'text-2xl', icon: 28 }
  }

  const currentSize = sizes[size]

  // Icon only version - for app icons, favicons, etc
  if (variant === 'icon') {
    return (
      <div 
        className={`bg-blue-600 rounded-2xl p-2.5 shadow-lg shadow-blue-600/25 ${className}`}
        style={{ width: currentSize.height, height: currentSize.height }}
      >
        <Mic2 className="text-white w-full h-full" />
      </div>
    )
  }

  // Compact version - for mobile headers, small spaces
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-xl p-1.5 shadow-md shadow-blue-600/20">
          <Mic2 className="text-white w-full h-full" />
        </div>
        <span className="font-bold text-lg text-gray-900 dark:text-white">HJ</span>
      </div>
    )
  }

  // Full version - modern integrated design for desktop headers
  return (
    <div className={`flex items-center ${className}`}>
      {/* Icon integrated with text */}
      <div 
        className="bg-blue-600 rounded-l-2xl p-2.5 shadow-lg shadow-blue-600/25"
        style={{ height: currentSize.height }}
      >
        <Mic2 className="text-white h-full w-auto" style={{ width: currentSize.icon }} />
      </div>
      
      {/* Text with matching height background */}
      <div 
        className="bg-gray-100 dark:bg-gray-800 rounded-r-2xl px-4 flex items-center border border-l-0 border-gray-200 dark:border-gray-700"
        style={{ height: currentSize.height }}
      >
        <span className={`font-bold ${currentSize.text} text-gray-900 dark:text-white`}>
          HangJegyzet
        </span>
      </div>
    </div>
  )
}

export default Logo
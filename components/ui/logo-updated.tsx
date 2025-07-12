import { Mic } from 'lucide-react'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ variant = 'full', className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl', mic: 16 },
    md: { icon: 40, text: 'text-2xl', mic: 20 },
    lg: { icon: 48, text: 'text-3xl', mic: 24 }
  }

  const currentSize = sizes[size]

  if (variant === 'icon') {
    return (
      <div 
        className={`relative ${className}`}
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        {/* Background with subtle animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl animate-pulse-slow" />
        
        {/* Icon container */}
        <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Mic className={`text-white`} size={currentSize.mic} />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <div 
        className="relative flex-shrink-0"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl animate-pulse-slow opacity-50" />
        <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Mic className="text-white" size={currentSize.mic} />
        </div>
      </div>
      
      {/* Text - Single color, better spacing */}
      <span className={`font-bold ${currentSize.text} text-gray-900 dark:text-white tracking-tight`}>
        HangJegyzet
      </span>
    </div>
  )
}

// Compact version for mobile/small spaces
export function LogoCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
        <Mic className="text-white" size={16} />
      </div>
      <span className="font-bold text-lg text-gray-900 dark:text-white">
        HJ
      </span>
    </div>
  )
}

// Marketing version with tagline
export function LogoWithTagline({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Logo variant="full" size="lg" />
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Meeting-ek átírása másodpercek alatt
      </p>
    </div>
  )
}
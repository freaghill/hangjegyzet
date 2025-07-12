import { AudioWaveform, Mic2 } from 'lucide-react'

// Alternative logo designs to choose from

// Option 1: Sound Wave Logo
export function LogoSoundWave({ variant = 'full', size = 'md' }) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl', wave: 16 },
    md: { icon: 40, text: 'text-2xl', wave: 20 },
    lg: { icon: 48, text: 'text-3xl', wave: 24 }
  }

  const currentSize = sizes[size]

  return (
    <div className="flex items-center gap-2">
      <div 
        className="relative flex-shrink-0"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <AudioWaveform className="text-white" size={currentSize.wave} />
        </div>
      </div>
      {variant === 'full' && (
        <div className="flex flex-col -space-y-1">
          <span className={`font-black ${currentSize.text} text-gray-900 dark:text-white`}>
            HANG
          </span>
          <span className={`font-light ${currentSize.text} text-gray-600 dark:text-gray-300`}>
            JEGYZET
          </span>
        </div>
      )}
    </div>
  )
}

// Option 2: Minimal Text Logo
export function LogoMinimal({ size = 'md' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`font-black ${sizes[size]} tracking-tighter`}>
      <span className="text-blue-600">hang</span>
      <span className="text-gray-900 dark:text-white">jegyzet</span>
      <span className="text-blue-600 animate-pulse">.</span>
    </div>
  )
}

// Option 3: Abstract Voice Logo
export function LogoAbstract({ variant = 'full', size = 'md' }) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl' },
    md: { icon: 40, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-3xl' }
  }

  const currentSize = sizes[size]

  return (
    <div className="flex items-center gap-3">
      <div 
        className="relative"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        {/* Custom SVG abstract voice visualization */}
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <defs>
            <linearGradient id="voiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <rect width="40" height="40" rx="12" fill="url(#voiceGradient)" />
          
          {/* Voice waveform */}
          <g transform="translate(20, 20)">
            <rect x="-12" y="-4" width="3" height="8" rx="1.5" fill="white" opacity="0.6" />
            <rect x="-7" y="-8" width="3" height="16" rx="1.5" fill="white" opacity="0.8" />
            <rect x="-2" y="-10" width="3" height="20" rx="1.5" fill="white" />
            <rect x="3" y="-6" width="3" height="12" rx="1.5" fill="white" opacity="0.8" />
            <rect x="8" y="-3" width="3" height="6" rx="1.5" fill="white" opacity="0.6" />
          </g>
        </svg>
      </div>
      
      {variant === 'full' && (
        <span className={`font-bold ${currentSize.text} text-gray-900 dark:text-white`}>
          HangJegyzet
        </span>
      )}
    </div>
  )
}

// Option 4: Modern Mic + Text Combo
export function LogoModern({ variant = 'full', size = 'md' }) {
  const sizes = {
    sm: { height: 32, text: 'text-lg' },
    md: { height: 40, text: 'text-xl' },
    lg: { height: 48, text: 'text-2xl' }
  }

  const currentSize = sizes[size]

  if (variant === 'icon') {
    return (
      <div 
        className="bg-blue-600 rounded-2xl p-2.5 shadow-lg shadow-blue-600/25"
        style={{ width: currentSize.height, height: currentSize.height }}
      >
        <Mic2 className="text-white w-full h-full" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0">
      {/* Icon integrated with text */}
      <div 
        className="bg-blue-600 rounded-l-2xl p-2.5 shadow-lg shadow-blue-600/25"
        style={{ height: currentSize.height }}
      >
        <Mic2 className="text-white h-full w-auto" />
      </div>
      
      {/* Text with matching height background */}
      <div 
        className="bg-gray-100 dark:bg-gray-800 rounded-r-2xl px-4 flex items-center"
        style={{ height: currentSize.height }}
      >
        <span className={`font-bold ${currentSize.text} text-gray-900 dark:text-white`}>
          HangJegyzet
        </span>
      </div>
    </div>
  )
}
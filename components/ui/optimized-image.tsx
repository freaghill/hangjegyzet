'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  quality?: number
  className?: string
  containerClassName?: string
  fallback?: React.ReactNode
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  quality = 85,
  className,
  containerClassName,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          quality={quality}
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 500}
          height={height || 300}
          priority={priority}
          quality={quality}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          placeholder="blur"
          blurDataURL={generateBlurDataURL()}
        />
      )}
    </div>
  )
}

// Generate a simple blur placeholder
function generateBlurDataURL(): string {
  // Use a pre-generated base64 blur placeholder to avoid DOM manipulation
  // This is a 10x10 gray image
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN8//HLfwYiAOOoQvoqBAB7+wZDiB0EhgAAAABJRU5ErkJggg=='
}

// Avatar component with image optimization
interface OptimizedAvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallback,
  className
}: OptimizedAvatarProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  }

  const dimension = sizeMap[size]

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className={cn(
      'relative rounded-full overflow-hidden bg-gray-200',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={dimension}
          height={dimension}
          fill
          className="rounded-full"
          fallback={
            <div className="flex items-center justify-center w-full h-full bg-gray-300 text-gray-600">
              {fallback || alt.charAt(0).toUpperCase()}
            </div>
          }
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-300 text-gray-600">
          {fallback || alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

// Logo component with optimization
export function OptimizedLogo({
  variant = 'default',
  className
}: {
  variant?: 'default' | 'light' | 'dark'
  className?: string
}) {
  const logoSrc = {
    default: '/logo.svg',
    light: '/logo-light.svg',
    dark: '/logo-dark.svg'
  }

  return (
    <OptimizedImage
      src={logoSrc[variant]}
      alt="HangJegyzet Logo"
      width={150}
      height={40}
      priority
      className={className}
    />
  )
}
'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'wide'
  showLoader?: boolean
  containerClassName?: string
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-[21/9]',
}

export function OptimizedImage({
  src,
  alt,
  className,
  containerClassName,
  fallbackSrc = '/images/placeholder.png',
  aspectRatio,
  showLoader = true,
  priority = false,
  loading = 'lazy',
  placeholder = 'blur',
  blurDataURL,
  sizes,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
      setHasError(true)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || (
    props.fill 
      ? '100vw'
      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  )

  return (
    <div className={cn(
      'relative overflow-hidden',
      aspectRatio && aspectRatioClasses[aspectRatio],
      containerClassName
    )}>
      {showLoader && isLoading && !hasError && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        loading={loading}
        placeholder={blurDataURL ? placeholder : 'empty'}
        blurDataURL={blurDataURL || generateBlurDataURL()}
        sizes={responsiveSizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100',
          className
        )}
      />
    </div>
  )
}

// Generate a simple blur placeholder
function generateBlurDataURL(): string {
  // Use a pre-generated base64 blur placeholder to avoid DOM manipulation
  // This is a 10x10 gray image
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN8//HLfwYiAOOoQvoqBAB7+wZDiB0EhgAAAABJRU5ErkJggg=='
}

// Optimized avatar component
interface OptimizedAvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallback,
  className,
}: OptimizedAvatarProps) {
  const sizeValue = avatarSizes[size]
  
  return (
    <OptimizedImage
      src={src || '/images/default-avatar.png'}
      alt={alt}
      width={sizeValue}
      height={sizeValue}
      className={cn(
        'rounded-full',
        size === 'sm' && 'h-8 w-8',
        size === 'md' && 'h-10 w-10',
        size === 'lg' && 'h-12 w-12',
        size === 'xl' && 'h-16 w-16',
        className
      )}
      fallbackSrc={fallback || '/images/default-avatar.png'}
      priority={size === 'xl'}
      sizes={`${sizeValue}px`}
    />
  )
}

// Optimized thumbnail component
interface OptimizedThumbnailProps {
  src: string
  alt: string
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'wide'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  priority?: boolean
}

const thumbnailSizes = {
  sm: { width: 200, height: 150 },
  md: { width: 400, height: 300 },
  lg: { width: 800, height: 600 },
}

export function OptimizedThumbnail({
  src,
  alt,
  aspectRatio = 'video',
  size = 'md',
  className,
  priority = false,
}: OptimizedThumbnailProps) {
  const { width, height } = thumbnailSizes[size]
  
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      aspectRatio={aspectRatio}
      className={className}
      priority={priority}
      sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${width}px`}
    />
  )
}

// Hero image component with responsive sizes
interface OptimizedHeroImageProps {
  src: string
  alt: string
  priority?: boolean
  className?: string
  overlayClassName?: string
  height?: number | string
}

export function OptimizedHeroImage({
  src,
  alt,
  priority = true,
  className,
  overlayClassName,
  height = '400px',
}: OptimizedHeroImageProps) {
  return (
    <div 
      className="relative w-full overflow-hidden"
      style={{ height }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={cn('object-cover', className)}
        sizes="100vw"
        quality={90}
      />
      {overlayClassName && (
        <div className={cn('absolute inset-0', overlayClassName)} />
      )}
    </div>
  )
}

// Gallery grid component
interface OptimizedGalleryProps {
  images: Array<{
    src: string
    alt: string
    caption?: string
  }>
  columns?: 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OptimizedGallery({
  images,
  columns = 3,
  gap = 'md',
  className,
}: OptimizedGalleryProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }

  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={cn(
      'grid',
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {images.map((image, index) => (
        <figure key={index} className="relative group">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={400}
            height={300}
            aspectRatio="landscape"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            priority={index < 6}
          />
          {image.caption && (
            <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}

// Meeting preview card with optimized image
interface MeetingCardImageProps {
  thumbnailUrl?: string
  title: string
  duration?: string
  className?: string
}

export function MeetingCardImage({
  thumbnailUrl,
  title,
  duration,
  className,
}: MeetingCardImageProps) {
  return (
    <div className={cn('relative aspect-video bg-gray-100', className)}>
      <OptimizedImage
        src={thumbnailUrl || '/images/meeting-placeholder.png'}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
      />
      {duration && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>
      )}
    </div>
  )
}
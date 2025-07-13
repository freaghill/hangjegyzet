// Image loading utilities
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  // Pre-generated base64 blur placeholder for performance
  return 'data:image/svg+xml;base64,' + btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="blur">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <rect width="${width}" height="${height}" fill="#e5e7eb" filter="url(#blur)" />
    </svg>
  `)
}

// Image optimization config for different contexts
export const imageConfig = {
  avatar: {
    sizes: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
    },
    quality: 85,
  },
  thumbnail: {
    sizes: {
      sm: { width: 200, height: 150 },
      md: { width: 400, height: 300 },
      lg: { width: 800, height: 600 },
    },
    quality: 80,
  },
  hero: {
    quality: 90,
    sizes: '100vw',
  },
  gallery: {
    quality: 85,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  },
}

// Supabase storage URL formatter
export function getSupabaseImageUrl(
  path: string | null | undefined,
  options?: {
    width?: number
    height?: number
    quality?: number
  }
): string {
  if (!path) return ''
  
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return path
  
  // If already a full URL, return as-is
  if (path.startsWith('http')) return path
  
  // Build Supabase storage URL with transforms
  let url = `${baseUrl}/storage/v1/object/public/${path}`
  
  if (options) {
    const params = new URLSearchParams()
    if (options.width) params.append('width', options.width.toString())
    if (options.height) params.append('height', options.height.toString())
    if (options.quality) params.append('quality', options.quality.toString())
    
    if (params.toString()) {
      url += `?${params.toString()}`
    }
  }
  
  return url
}

// Preload critical images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

// Preload multiple images
export async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(srcs.map(preloadImage))
}

// Check if image is in viewport for lazy loading
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

// Create intersection observer for lazy loading
export function createImageObserver(
  onIntersect: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onIntersect(entry)
      }
    })
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  })
}
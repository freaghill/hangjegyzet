import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Route loading component
export function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Betöltés...</p>
      </div>
    </div>
  )
}

// Create lazy route wrapper
export function lazyRoute<T extends Record<string, any>>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
  options?: {
    loading?: React.ComponentType
    ssr?: boolean
  }
) {
  return dynamic(loader, {
    loading: () => options?.loading ? <options.loading /> : <RouteLoader />,
    ssr: options?.ssr ?? true,
  })
}

// Preload route utility
export function preloadRoute(
  loader: () => Promise<any>
): void {
  // Trigger the dynamic import to start loading
  loader().catch(() => {
    // Silently fail preloading
  })
}

// Route preloader hook
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useRoutePreloader(
  routes: Record<string, () => Promise<any>>
) {
  const pathname = usePathname()

  useEffect(() => {
    // Preload routes that are likely to be visited next
    const preloadTimeout = setTimeout(() => {
      Object.entries(routes).forEach(([path, loader]) => {
        // Don't preload current route
        if (path !== pathname) {
          preloadRoute(loader)
        }
      })
    }, 2000) // Wait 2 seconds before preloading

    return () => clearTimeout(preloadTimeout)
  }, [pathname, routes])
}

// Intersection observer for link preloading
export function useLinkPreloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement
            const href = link.getAttribute('href')
            
            if (href && href.startsWith('/')) {
              // Prefetch the route
              import('next/router').then(({ default: router }) => {
                router.prefetch(href).catch(() => {
                  // Silently fail prefetching
                })
              })
            }
          }
        })
      },
      {
        rootMargin: '50px',
      }
    )

    // Observe all internal links
    const links = document.querySelectorAll('a[href^="/"]')
    links.forEach(link => observer.observe(link))

    return () => observer.disconnect()
  }, [])
}
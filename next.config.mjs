import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';
import nextPWA from 'next-pwa';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'jsdelivr-cdn',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    },
    {
      urlPattern: /^https:\/\/hangjegyzet\.hu\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'hangjegyzet.hu', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Experimental features to optimize build
  experimental: {
    // Use SWC for faster builds and better optimization
    forceSwcTransforms: true,
  },
  // Optimize production builds
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer, dev }) => {
    // Check if filesystem cache should be disabled
    const disableFsCache = process.env.WEBPACK_DISABLE_FS_CACHE === 'true';
    
    // Only use filesystem cache if not disabled and in development
    if (dev && !disableFsCache) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // Configure pack cache strategy with optimizations
        store: 'pack',
        version: `${process.env.NODE_ENV}`,
        cacheDirectory: path.resolve(process.cwd(), '.next/cache/webpack'),
        // Compression settings to handle large strings better
        compression: process.env.WEBPACK_CACHE_COMPRESSION || 'gzip',
        // Increase idleTimeout to handle large serializations
        idleTimeout: 60000,
        idleTimeoutForInitialStore: 0,
        // Max memory for cache before writing to disk
        maxMemoryGenerations: 10,
        // Allow collecting memory when needed
        allowCollectingMemory: true,
        // Cache large items properly
        memoryCacheUnaffected: true,
      };
    } else if (dev) {
      // Use memory cache only to avoid serialization warnings
      config.cache = {
        type: 'memory',
        maxGenerations: 5,
      };
    }

    // Optimize module handling for large files
    config.module.parser = {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        // Increase the asset size limit to reduce warnings
        maxAssetSize: 512 * 1024, // 512 KB
      },
    };

    // Add optimization for handling large strings in chunks
    config.optimization = {
      ...config.optimization,
      // Minimize code in production to reduce string sizes
      minimize: process.env.NODE_ENV === 'production',
      // Configure the minimizer
      minimizer: config.optimization?.minimizer?.map((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              ...minimizer.options.terserOptions?.compress,
              // Reduce large string literals
              strings: true,
              // Convert to shorter equivalents
              booleans_as_integers: true,
            },
            mangle: {
              ...minimizer.options.terserOptions?.mangle,
              // Mangle property names to reduce size
              properties: {
                regex: /^_/,
              },
            },
          };
        }
        return minimizer;
      }),
    };

    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization?.splitChunks,
        chunks: 'all',
        // Increase max async requests to handle more chunks
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        // Reduce minimum size for chunks to split large files better
        minSize: 20000,
        maxSize: 244000, // ~240KB to stay under serialization warning threshold
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
          // Separate large vendor chunks
          largeVendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
              return `vendor-${packageName?.replace('@', '')}`;
            },
            priority: 20,
            minSize: 50 * 1024, // 50KB
            maxSize: 244 * 1024, // 244KB
            enforce: true,
          },
          // Handle large JSON imports
          json: {
            type: 'json',
            name: 'json-chunks',
            priority: 15,
            minSize: 10 * 1024, // 10KB
            maxSize: 244 * 1024, // 244KB
          },
          // Split commons to reduce duplication
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            maxSize: 244 * 1024, // 244KB
          },
        },
      };
    }

    // Add webpack plugins to optimize large strings
    if (!dev) {
      // DefinePlugin is already configured by Next.js

      // Limit the size of inlined assets
      config.module.rules.push({
        test: /\.(json)$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/chunks/[name].[hash][ext]',
        },
      });
    }

    // Add performance hints for large assets
    config.performance = {
      ...config.performance,
      maxAssetSize: 512 * 1024, // 512KB
      maxEntrypointSize: 512 * 1024, // 512KB
      hints: dev ? false : 'warning',
    };

    return config;
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  org: "hangjegyzet",
  project: "hangjegyzet-app",
  
  // Only upload source maps in production
  silent: true,
  
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableLogger: true,
};

export default withSentryConfig(
  withPWA(nextConfig),
  sentryWebpackPluginOptions
);

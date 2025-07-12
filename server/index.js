const { createServer } = require('http')
const { createSecureServer } = require('http2')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const compression = require('compression')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000')

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Compression middleware configuration
const compressionOptions = {
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress server-sent events
    if (res.getHeader('Content-Type')?.includes('text/event-stream')) {
      return false
    }
    // Use default filter for other content types
    return compression.filter(req, res)
  },
}

app.prepare().then(() => {
  // Check if SSL certificates are available for HTTP/2
  const useHTTP2 = process.env.USE_HTTP2 === 'true' && 
                   fs.existsSync('./certificates/cert.pem') && 
                   fs.existsSync('./certificates/key.pem')

  if (useHTTP2) {
    // HTTP/2 with SSL
    const options = {
      key: fs.readFileSync('./certificates/key.pem'),
      cert: fs.readFileSync('./certificates/cert.pem'),
      allowHTTP1: true, // Fallback to HTTP/1.1 if needed
    }

    createSecureServer(options, (req, res) => {
      // Apply compression
      compression(compressionOptions)(req, res, () => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
      })
    }).listen(port, (err) => {
      if (err) throw err
      console.log(`> Ready on https://${hostname}:${port} (HTTP/2)`)
    })
  } else {
    // Standard HTTP/1.1 server
    const server = createServer((req, res) => {
      // Apply compression
      compression(compressionOptions)(req, res, () => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
      })
    })

    server.listen(port, (err) => {
      if (err) throw err
      console.log(`> Ready on http://${hostname}:${port}`)
    })
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  process.exit(0)
})
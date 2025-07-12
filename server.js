const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { initializeWebSocketManager } = require('./lib/realtime/websocket-manager')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '4000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const { pathname, query } = parsedUrl

      // Handle WebSocket upgrade requests
      if (pathname === '/ws' && req.headers.upgrade === 'websocket') {
        // WebSocket upgrade is handled by Socket.IO in websocket-manager
        return
      }

      // Handle all other requests with Next.js
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize WebSocket manager
  const wsManager = initializeWebSocketManager(server)
  console.log('WebSocket server initialized')

  // Start server
  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready on ws://${hostname}:${port}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
})
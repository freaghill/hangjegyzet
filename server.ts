import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeWebSocketManager } from './lib/realtime/websocket-manager'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
const wsPort = parseInt(process.env.WS_PORT || '3001', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    await app.prepare()
    
    // Create HTTP server for Next.js
    const nextServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || '', true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    // Create separate WebSocket server
    const wsServer = createServer((req, res) => {
      // This server only handles WebSocket upgrades
      res.writeHead(404)
      res.end()
    })

    // Initialize WebSocket manager on the WebSocket server
    const wsManager = initializeWebSocketManager(wsServer)
    console.log('WebSocket manager initialized')

    // Start Next.js server
    nextServer.listen(port, () => {
      console.log(`> Next.js ready on http://${hostname}:${port}`)
    })

    // Start WebSocket server on different port
    wsServer.listen(wsPort, () => {
      console.log(`> WebSocket server ready on ws://${hostname}:${wsPort}`)
    })

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down servers...')
      
      nextServer.close(() => {
        console.log('Next.js server closed')
      })
      
      wsServer.close(() => {
        console.log('WebSocket server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
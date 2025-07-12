import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

const port = parseInt(process.env.WS_PORT || '3002', 10)

// Create WebSocket server for testing
const server = createServer()
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

console.log('Starting test WebSocket server...')

// Simple test WebSocket handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  
  socket.on('join-meeting', ({ meetingId }) => {
    console.log(`Client ${socket.id} joining meeting: ${meetingId}`)
    socket.join(meetingId)
    
    socket.emit('meeting-joined', {
      meetingId,
      participants: [],
      isRecording: false,
      startTime: Date.now(),
    })
  })
  
  socket.on('start-recording', () => {
    console.log(`Client ${socket.id} started recording`)
    socket.emit('recording-started', {
      startedBy: 'test-user',
      timestamp: Date.now(),
    })
  })
  
  socket.on('stop-recording', () => {
    console.log(`Client ${socket.id} stopped recording`)
    socket.emit('recording-stopped', {
      stoppedBy: 'test-user',
      timestamp: Date.now(),
    })
  })
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`)
  })
})

// Start server
server.listen(port, () => {
  console.log(`Test WebSocket server listening on ws://localhost:${port}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
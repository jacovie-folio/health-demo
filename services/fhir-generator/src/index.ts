import express from 'express'

const app = express()
const port = process.env.PORT || 49152

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' })
})

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, closing server gracefully...`)

  server.close(() => {
    console.log('Server closed successfully')
    process.exit(0)
  })

  // Force shutdown after timeout if connections don't close
  setTimeout(() => {
    console.error('Forcing shutdown after timeout')
    process.exit(1)
  }, 10000) // 10 second timeout
}

// Handle different signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT')) // Ctrl+C

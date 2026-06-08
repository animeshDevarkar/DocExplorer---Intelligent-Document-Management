import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth.js'

import { PrismaClient } from '@prisma/client'

const app = new Hono()
const prisma = new PrismaClient()

app.use('*', cors({
  origin: (origin) => origin || 'http://localhost:3000',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('DocExplorer API is running!')
})

// Public health check to keep DB awake from cron jobs
app.get('/api/ping', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.text('Pong!');
  } catch (err) {
    return c.text('DB Error', 500);
  }
})

// Mount better-auth handler
app.all("/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Mount User routes
import { userRouter } from './routes/user.js'
app.route('/api/users', userRouter)

// Mount Document routes
import { documentsRouter } from './routes/documents.js'
app.route('/api/documents', documentsRouter)

// Mount Chat routes
import { chatRouter } from './routes/chat.js'
app.route('/api/chat', chatRouter)

serve({
  fetch: app.fetch,
  port: 3001
}, (info) => {
  console.log(`API Server is running on http://localhost:${info.port}`)
})

import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

// routes
import authRoutes from './routes/auth.js'
import novelRoutes from './routes/novels.js'
import chapterRoutes from './routes/chapters.js'
import aiRoutes from './routes/ai.js'

const prisma = new PrismaClient()

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
})

// ── 插件 ──
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
})

// 挂载 Prisma 到 fastify 实例，方便所有路由使用
fastify.decorate('prisma', prisma)

// ── 路由 ──
const API = '/api'
await fastify.register(authRoutes,    { prefix: API })
await fastify.register(novelRoutes,   { prefix: API })
await fastify.register(chapterRoutes, { prefix: API })
await fastify.register(aiRoutes,      { prefix: API })

// ── 健康检查 ──
fastify.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }))

// ── 全局错误处理 ──
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  const status = error.statusCode || 500
  reply.status(status).send({
    error: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  })
})

// ── 启动 ──
const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

try {
  await fastify.listen({ port: PORT, host: HOST })
  console.log(`\n🚀 配角传后端已启动 → http://localhost:${PORT}`)
  console.log(`📦 LLM Provider: ${process.env.LLM_PROVIDER || 'anthropic'}`)
  console.log(`🗄  Database: ${process.env.DATABASE_URL || 'file:./dev.db'}\n`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

// ── 优雅退出 ──
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await fastify.close()
  process.exit(0)
})

import bcrypt from 'bcryptjs'
import { authenticate } from '../middleware/auth.js'

export default async function authRoutes(fastify) {
  const { prisma } = fastify

  // ── 注册 ──
  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'username'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          username: { type: 'string', minLength: 1, maxLength: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, username } = request.body

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return reply.code(409).send({ error: '该邮箱已注册' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, username },
      select: { id: true, email: true, username: true, createdAt: true },
    })

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '7d' }
    )

    return { user, token }
  })

  // ── 登录 ──
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(401).send({ error: '邮箱或密码错误' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return reply.code(401).send({ error: '邮箱或密码错误' })

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '7d' }
    )

    return {
      user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
      token,
    }
  })

  // ── 获取当前用户 ──
  fastify.get('/auth/me', { preHandler: [authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { id: true, email: true, username: true, avatar: true, createdAt: true },
    })
    return { user }
  })

  // ── 更新个人信息 ──
  fastify.put('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { username, avatar, currentPassword, newPassword } = request.body
    const userId = request.user.userId

    const data = {}
    if (username) data.username = username
    if (avatar)   data.avatar   = avatar

    // 修改密码
    if (newPassword) {
      if (!currentPassword) return reply.code(400).send({ error: '请提供当前密码' })
      const user = await prisma.user.findUnique({ where: { id: userId } })
      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) return reply.code(401).send({ error: '当前密码不正确' })
      data.password = await bcrypt.hash(newPassword, 10)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true, avatar: true },
    })
    return { user: updated }
  })
}

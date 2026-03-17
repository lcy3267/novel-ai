import { authenticate } from '../middleware/auth.js'

export default async function chapterRoutes(fastify) {
  const { prisma } = fastify

  // 鉴权：验证 novel 属于当前用户
  async function verifyOwner(novelId, userId, reply) {
    const novel = await prisma.novel.findFirst({ where: { id: novelId, userId } })
    if (!novel) { reply.code(404).send({ error: '小说不存在' }); return null }
    return novel
  }

  // ── 获取所有章节 ──
  fastify.get('/novels/:novelId/chapters', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId } = request.params
    const novel = await verifyOwner(novelId, request.user.userId, reply)
    if (!novel) return

    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { index: 'asc' },
    })
    return { chapters }
  })

  // ── 创建章节 ──
  fastify.post('/novels/:novelId/chapters', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId } = request.params
    const novel = await verifyOwner(novelId, request.user.userId, reply)
    if (!novel) return

    // 自动计算 index（取最大 index + 1）
    const last = await prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { index: 'desc' },
    })
    const index = last ? last.index + 1 : 0
    const { title = '', content = '', mainPlot = '' } = request.body

    const chapter = await prisma.chapter.create({
      data: {
        novelId,
        index,
        title,
        content,
        mainPlot: String(mainPlot || '').slice(0, 50),
        wordCount: content.replace(/\s/g, '').length,
      },
    })
    // 更新小说状态为 writing
    if (novel.status === 'setup' || novel.status === 'analyzing') {
      await prisma.novel.update({ where: { id: novelId }, data: { status: 'writing' } })
    }
    return { chapter }
  })

  // ── 更新章节 ──
  fastify.put('/novels/:novelId/chapters/:index', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId, index } = request.params
    const novel = await verifyOwner(novelId, request.user.userId, reply)
    if (!novel) return

    const { title, content, mainPlot } = request.body
    const data = {}
    if (title   !== undefined) data.title   = title
    if (mainPlot !== undefined) data.mainPlot = String(mainPlot || '').slice(0, 50)
    if (content !== undefined) {
      data.content   = content
      data.wordCount = content.replace(/\s/g, '').length
    }

    const chapter = await prisma.chapter.update({
      where: { novelId_index: { novelId, index: Number(index) } },
      data,
    })
    return { chapter }
  })

  // ── 确认章节 ──
  fastify.post('/novels/:novelId/chapters/:index/confirm', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId, index } = request.params
    const novel = await verifyOwner(novelId, request.user.userId, reply)
    if (!novel) return

    // 同步保存最新内容（可选）
    const { title, content, mainPlot } = request.body || {}
    const data = { confirmed: true }
    if (title   !== undefined) data.title = title
    if (mainPlot !== undefined) data.mainPlot = String(mainPlot || '').slice(0, 50)
    if (content !== undefined) { data.content = content; data.wordCount = content.replace(/\s/g,'').length }

    const chapter = await prisma.chapter.update({
      where: { novelId_index: { novelId, index: Number(index) } },
      data,
    })
    return { chapter }
  })

  // ── 删除章节 ──
  fastify.delete('/novels/:novelId/chapters/:index', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId, index } = request.params
    const novel = await verifyOwner(novelId, request.user.userId, reply)
    if (!novel) return

    const targetIndex = Number(index)
    const last = await prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { index: 'desc' },
    })
    if (!last) return reply.code(404).send({ error: '章节不存在' })
    if (last.index !== targetIndex) {
      return reply.code(400).send({ error: '只能删除最新章节' })
    }

    await prisma.chapter.delete({
      where: { novelId_index: { novelId, index: targetIndex } },
    })
    return { success: true }
  })
}

import { authenticate } from '../middleware/auth.js'

export default async function novelRoutes(fastify) {
  const { prisma } = fastify

  // ── 列表（支持搜索 + 筛选） ──
  fastify.get('/novels', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.userId
    const { q, status, page = 1, limit = 20 } = request.query

    const where = { userId }
    if (status) where.status = status
    if (q) where.OR = [
      { title:    { contains: q } },
      { novel:    { contains: q } },
      { mainChar: { contains: q } },
    ]

    const [total, novels] = await Promise.all([
      prisma.novel.count({ where }),
      prisma.novel.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
        include: {
          _count: { select: { chapters: true } },
          chapters: {
            where: { confirmed: true },
            select: { wordCount: true },
          },
        },
      }),
    ])

    // 计算总字数
    const result = novels.map(n => ({
      id: n.id,
      title: n.title || `《${n.mainChar}传》`,
      novel: n.novel,
      mainChar: n.mainChar,
      totalWC: n.totalWC,
      chapWC: n.chapWC,
      status: n.status,
      chapterCount: n._count.chapters,
      totalWords: n.chapters.reduce((s, c) => s + c.wordCount, 0),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))

    return { novels: result, total, page: Number(page), limit: Number(limit) }
  })

  // ── 创建 ──
  fastify.post('/novels', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.userId
    const { novel, mainChar, charUnder, storyDir, totalWC, chapWC, characters = [] } = request.body

    if (!novel || !mainChar) {
      return reply.code(400).send({ error: '小说名称和配角姓名为必填项' })
    }

    const created = await prisma.novel.create({
      data: {
        userId,
        novel,
        mainChar,
        title: `${mainChar}传`,
        charUnder: charUnder || '',
        storyDir: storyDir || '',
        totalWC: totalWC || '短篇（1-3万字）',
        chapWC: chapWC || 1500,
        characters: {
          create: characters.map(c => ({
            name: c.name,
            role: c.role || '',
            rel: c.rel || '',
            traits: JSON.stringify(c.traits || []),
            bg: c.bg || '',
          })),
        },
      },
      include: { characters: true },
    })
    return { novel: created }
  })

  // ── 详情 ──
  fastify.get('/novels/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.userId

    const novel = await prisma.novel.findFirst({
      where: { id, userId },
      include: {
        characters: true,
        chapters: { orderBy: { index: 'asc' } },
      },
    })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    // 解析 JSON 字段
    if (novel.analysisTraits) novel.analysisTraits = JSON.parse(novel.analysisTraits)
    if (novel.outlines) novel.outlines = JSON.parse(novel.outlines)
    novel.characters = novel.characters.map(c => ({
      ...c,
      traits: JSON.parse(c.traits || '[]'),
    }))

    return { novel }
  })

  // ── 更新 ──
  fastify.put('/novels/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.userId
    const allowed = ['title', 'novel', 'mainChar', 'charUnder', 'storyDir', 'totalWC', 'chapWC',
                     'status', 'analysisTraits', 'analysisConflict', 'outlines', 'selectedOutlineId']

    const existing = await prisma.novel.findFirst({ where: { id, userId } })
    if (!existing) return reply.code(404).send({ error: '小说不存在' })

    const data = {}
    for (const key of allowed) {
      if (request.body[key] !== undefined) {
        // 数组字段序列化为 JSON
        if (['analysisTraits', 'outlines'].includes(key) && typeof request.body[key] !== 'string') {
          data[key] = JSON.stringify(request.body[key])
        } else {
          data[key] = request.body[key]
        }
      }
    }

    const updated = await prisma.novel.update({ where: { id }, data })
    return { novel: updated }
  })

  // ── 归档 ──
  fastify.put('/novels/:id/archive', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params
    const { userId } = request.user
    const novel = await prisma.novel.findFirst({ where: { id, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })
    const newStatus = novel.status === 'archived' ? 'writing' : 'archived'
    const updated = await prisma.novel.update({ where: { id }, data: { status: newStatus } })
    return { novel: updated }
  })

  // ── 删除 ──
  fastify.delete('/novels/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.userId
    const novel = await prisma.novel.findFirst({ where: { id, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })
    await prisma.novel.delete({ where: { id } })
    return { success: true }
  })

  // ── 添加人物 ──
  fastify.post('/novels/:id/characters', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params
    const userId = request.user.userId
    const novel = await prisma.novel.findFirst({ where: { id, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })
    const { name, role, rel, traits, bg } = request.body
    if (!name) return reply.code(400).send({ error: '人物姓名必填' })
    const char = await prisma.character.create({
      data: { novelId: id, name, role: role || '', rel: rel || '', traits: JSON.stringify(traits || []), bg: bg || '' },
    })
    return { character: { ...char, traits: JSON.parse(char.traits) } }
  })

  // ── 删除人物 ──
  fastify.delete('/novels/:id/characters/:charId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, charId } = request.params
    const userId = request.user.userId
    const novel = await prisma.novel.findFirst({ where: { id, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })
    await prisma.character.delete({ where: { id: charId } })
    return { success: true }
  })
}

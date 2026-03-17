import { authenticate } from '../middleware/auth.js'
import { getLLM } from '../plugins/llm/index.js'

function parseJsonSafely(raw, fallback) {
  try {
    return JSON.parse(String(raw).replace(/```json|```/g, '').trim())
  } catch {
    return fallback
  }
}

function trimTo(str, max) {
  const val = String(str || '').replace(/\s+/g, ' ').trim()
  return val.length > max ? val.slice(0, max) : val
}

function isMainCharRelated(mainChar, rel, bg) {
  const text = `${rel || ''} ${bg || ''}`
  return text.includes(mainChar) || text.includes('本书主角') || text.includes('该配角')
}

async function extractOriginalCharacters(llm, novel, mainChar, charUnder, storyDir) {
  const system = '你是人物提炼助手。任务是围绕“本书主角（原著配角）”提炼人物，严格返回JSON数组，不要markdown。'
  const user = `
【原著】${novel}
【本书主角（原著配角）】${mainChar}
【用户理解】${charUnder || '暂无'}
【故事走向】${storyDir || '暂无'}

请提炼最多3个与“本书主角 ${mainChar}”有直接关系或冲突的人物（不含本书主角），输出格式：
[
  {"name":"","role":"","rel":"","traits":["",""],"bg":""}
]
硬性要求：
- 只保留与“本书主角 ${mainChar}”直接相关的人物，不要按原著主角视角选人
- 如果某人物只与原著主角相关、与 ${mainChar} 关系弱或无关，禁止输出
- rel 必须明确写出该人物与 ${mainChar} 的关系（建议包含“${mainChar}”姓名）
- bg 仅写该人物与本书主角相关情节，不超过300字
- traits 最多4个短词
- name 必填
`.trim()

  const raw = await llm.complete(system, user, 800)
  const parsed = parseJsonSafely(raw, [])
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(p => p && typeof p.name === 'string' && p.name.trim())
    .map(p => ({
      name: trimTo(p.name, 32),
      role: trimTo(p.role || '', 64),
      rel: trimTo(p.rel || '', 120),
      traits: Array.isArray(p.traits) ? p.traits.map(t => trimTo(t, 16)).filter(Boolean).slice(0, 4) : [],
      bg: trimTo(p.bg || '', 300),
    }))
    .filter(p => p.name && p.name !== mainChar && isMainCharRelated(mainChar, p.rel, p.bg))
    .slice(0, 3)
}

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

    // 自动提炼原著关键人物（<=3），并写入人物表
    try {
      const llm = getLLM()
      const extracted = await extractOriginalCharacters(llm, novel, mainChar, charUnder, storyDir)
      if (extracted.length) {
        const existingNames = new Set(created.characters.map(c => c.name.trim()))
        existingNames.add(mainChar)
        for (const ch of extracted) {
          if (existingNames.has(ch.name)) continue
          await prisma.character.create({
            data: {
              novelId: created.id,
              name: ch.name,
              role: ch.role || '',
              rel: ch.rel || '',
              traits: JSON.stringify(ch.traits || []),
              bg: ch.bg || '',
            },
          })
          existingNames.add(ch.name)
        }
      }
    } catch (e) {
      fastify.log.warn({ err: e }, '自动提炼原著人物失败，已跳过')
    }

    const latest = await prisma.novel.findUnique({
      where: { id: created.id },
      include: { characters: true },
    })
    return { novel: latest }
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

  // ── 编辑人物 ──
  fastify.put('/novels/:id/characters/:charId', { preHandler: [authenticate] }, async (request, reply) => {
    const { id, charId } = request.params
    const userId = request.user.userId
    const novel = await prisma.novel.findFirst({ where: { id, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    const existing = await prisma.character.findFirst({ where: { id: charId, novelId: id } })
    if (!existing) return reply.code(404).send({ error: '人物不存在' })

    const { name, role, rel, traits, bg } = request.body || {}
    if (!name) return reply.code(400).send({ error: '人物姓名必填' })

    const updated = await prisma.character.update({
      where: { id: charId },
      data: {
        name,
        role: role || '',
        rel: rel || '',
        traits: JSON.stringify(traits || []),
        bg: bg || '',
      },
    })
    return { character: { ...updated, traits: JSON.parse(updated.traits || '[]') } }
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

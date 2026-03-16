import { authenticate } from '../middleware/auth.js'
import { getLLM } from '../plugins/llm/index.js'

// ── Prompt 构建器（与前端 demo 保持一致的逻辑） ──
function buildAnalyzePrompt(novel, mainChar, charUnder, storyDir, totalWC, chapWC, chars) {
  const charDesc = chars.map(c => `${c.name}（${c.role}，${c.rel}）`).join('；') || '无'
  return {
    system: '你是精通中文文学的资深编辑，请分析配角并生成故事脉络。严格以JSON返回，无任何markdown。',
    user: `
【原著】《${novel}》
【配角】${mainChar}
【用户理解】${charUnder || '暂无'}
【故事走向】${storyDir || '暂无'}
【相关人物】${charDesc}
【目标字数】${totalWC}，单章约${chapWC}字

返回格式：
{
  "traits":["特质1","特质2","特质3","特质4"],
  "conflict":"一句话描述核心张力",
  "outlines":[
    {"id":1,"style":"悲情","title":"诗意标题","logline":"一句话故事核","desc":"3-4句描述走向","keywords":["词1","词2","词3"]},
    {"id":2,"style":"成长","title":"...","logline":"...","desc":"...","keywords":["..."]},
    {"id":3,"style":"温情","title":"...","logline":"...","desc":"...","keywords":["..."]}
  ]
}`.trim(),
  }
}

function buildChapterSystem(novel, mainChar, charUnder, storyDir, selectedOutline, chars, chapIdx, chapWC, prevChapters) {
  const charLines = chars.map(c =>
    `${c.name}（${c.role}）：${c.rel || ''}${c.traits?.length ? '，性格：' + c.traits.join('、') : ''}${c.bg ? '，背景：' + c.bg : ''}`
  ).join('\n')

  const prevSummary = prevChapters.map((c, i) =>
    `第${i + 1}章《${c.title || ''}》节选：${c.content.slice(0, 300)}…`
  ).join('\n')

  const ol = selectedOutline

  return `你是顶级中文小说创作者，专注为配角书写完整故事。

【原著】《${novel}》
【主角（原著配角）】${mainChar}
【用户理解】${charUnder || '暂无'}
【故事走向】${storyDir || '暂无'}
【选定脉络】${ol ? `《${ol.title}》— ${ol.desc}` : '自由发挥'}
【关键情节词】${ol ? ol.keywords.join('、') : ''}
${charLines ? `【相关人物】\n${charLines}` : ''}
${prevSummary ? `【前情摘要】\n${prevSummary}` : ''}

【字数要求】本章约${chapIdx === 0 ? 1500 : chapWC}字
【写作规范】
- ${mainChar}为绝对主角，深入其内心世界
- 语言有文学质感，画面感强，情绪细腻
- 首段不用套路开头，直接进入人物状态或场景
- 不堆砌形容词，段落间有节奏
- 段落之间空一行，不要首行缩进符号
请第一行输出章节标题（格式：【标题】），标题后直接开始正文，无需额外空行。`
}

export default async function aiRoutes(fastify) {
  const { prisma } = fastify

  // ── 角色分析（非流式） ──
  fastify.post('/ai/analyze', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId } = request.body
    const userId = request.user.userId

    const novel = await prisma.novel.findFirst({
      where: { id: novelId, userId },
      include: { characters: true },
    })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    const chars = novel.characters.map(c => ({
      ...c, traits: JSON.parse(c.traits || '[]'),
    }))

    const { system, user } = buildAnalyzePrompt(
      novel.novel, novel.mainChar, novel.charUnder, novel.storyDir,
      novel.totalWC, novel.chapWC, chars
    )

    const llm = getLLM()
    let result
    try {
      const raw = await llm.complete(system, user, 2000)
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch (e) {
      return reply.code(500).send({ error: `AI 分析失败: ${e.message}` })
    }

    // 保存到数据库
    await prisma.novel.update({
      where: { id: novelId },
      data: {
        analysisTraits: JSON.stringify(result.traits),
        analysisConflict: result.conflict,
        outlines: JSON.stringify(result.outlines),
        status: 'analyzing',
      },
    })

    return { analysis: result }
  })

  // ── 生成/续写章节（SSE 流式） ──
  fastify.post('/ai/generate', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId, chapIndex, extraInstruction } = request.body
    const userId = request.user.userId

    const novel = await prisma.novel.findFirst({
      where: { id: novelId, userId },
      include: {
        characters: true,
        chapters: { orderBy: { index: 'asc' } },
      },
    })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    const chars = novel.characters.map(c => ({ ...c, traits: JSON.parse(c.traits || '[]') }))
    const outlines = novel.outlines ? JSON.parse(novel.outlines) : []
    const selectedOutline = outlines.find(o => o.id === novel.selectedOutlineId) || null
    const prevChapters = novel.chapters
      .filter(c => c.index < chapIndex)
      .map(c => ({ title: c.title, content: c.content.slice(0, 400) }))

    const system = buildChapterSystem(
      novel.novel, novel.mainChar, novel.charUnder, novel.storyDir,
      selectedOutline, chars, chapIndex, novel.chapWC, prevChapters
    )

    const userMsg = extraInstruction
      ? `请${chapIndex === 0 ? '创作第一章' : `续写第${chapIndex + 1}章`}，约${chapIndex === 0 ? 1500 : novel.chapWC}字。额外要求：${extraInstruction}`
      : chapIndex === 0
        ? `请创作第一章，约1500字，建立故事基调。`
        : `请续写第${chapIndex + 1}章，承接前情，约${novel.chapWC}字。`

    // SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const send = (data) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const llm = getLLM()
    let fullText = ''

    try {
      await llm.stream(system, userMsg, 6000, (chunk) => {
        fullText += chunk
        send({ type: 'chunk', text: chunk })
      })

      // 提取标题
      const titleMatch = fullText.match(/【(.+?)】/)
      const title = titleMatch ? titleMatch[1] : `第${chapIndex + 1}章`
      const content = fullText.replace(/【.+?】/, '').trim()

      // 持久化
      await prisma.chapter.upsert({
        where: { novelId_index: { novelId, index: chapIndex } },
        create: {
          novelId, index: chapIndex, title, content,
          wordCount: content.replace(/\s/g, '').length,
        },
        update: {
          title, content,
          wordCount: content.replace(/\s/g, '').length,
          confirmed: false,
        },
      })
      // 更新小说状态
      if (novel.status !== 'writing') {
        await prisma.novel.update({ where: { id: novelId }, data: { status: 'writing' } })
      }

      send({ type: 'done', title, wordCount: content.replace(/\s/g, '').length })
    } catch (e) {
      send({ type: 'error', message: e.message })
    } finally {
      reply.raw.end()
    }
  })

  // ── AI 修改章节（SSE 流式） ──
  fastify.post('/ai/edit', { preHandler: [authenticate] }, async (request, reply) => {
    const { novelId, chapIndex, instruction } = request.body
    const userId = request.user.userId

    const novel = await prisma.novel.findFirst({ where: { id: novelId, userId } })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    const chapter = await prisma.chapter.findFirst({
      where: { novelId, index: chapIndex },
    })
    if (!chapter) return reply.code(404).send({ error: '章节不存在' })

    const system = '你是顶级中文小说创作者，请根据用户指令修改章节内容。'
    const userMsg = `以下是当前章节内容：\n\n${chapter.content}\n\n请根据指令「${instruction}」进行修改。直接返回完整正文，不要标题，不要解释，段落间空一行。`

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const send = (data) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    const llm = getLLM()
    let fullText = ''

    try {
      await llm.stream(system, userMsg, 6000, (chunk) => {
        fullText += chunk
        send({ type: 'chunk', text: chunk })
      })

      await prisma.chapter.update({
        where: { novelId_index: { novelId, index: chapIndex } },
        data: { content: fullText, wordCount: fullText.replace(/\s/g, '').length, confirmed: false },
      })

      send({ type: 'done', wordCount: fullText.replace(/\s/g, '').length })
    } catch (e) {
      send({ type: 'error', message: e.message })
    } finally {
      reply.raw.end()
    }
  })
}

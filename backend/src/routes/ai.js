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

function parseCharacterTraits(characters) {
  return characters.map(c => ({
    ...c,
    traits: parseJsonSafely(c.traits, []),
  }))
}

function extractChapterTitleAndContent(fullText, chapIndex) {
  const titleMatch = fullText.match(/【(.+?)】/)
  const title = titleMatch ? titleMatch[1] : `第${chapIndex + 1}章`
  const content = fullText.replace(/【.+?】/, '').trim()
  return { title, content }
}

function extractMainPlotFromGeneratedText(content) {
  const marker = /(?:\n|^)【本章主要情节】\s*([^\n\r]{1,120})/g
  let match
  let last = null
  while ((match = marker.exec(content)) !== null) last = match
  if (!last) return { content: content.trim(), mainPlot: '' }
  const rawPlot = trimTo(last[1] || '', 50)
  const cleaned = content.slice(0, last.index).trim()
  return { content: cleaned, mainPlot: rawPlot }
}

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

function buildFirstChapterSystem(novel, mainChar, charUnder, storyDir, selectedOutline, chars) {
  const charLines = chars.map(c =>
    `${c.name}（${c.role}）：${c.rel || ''}${c.traits?.length ? '，性格：' + c.traits.join('、') : ''}${c.bg ? '，背景：' + c.bg : ''}`
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
【写作规范】
- ${mainChar}为绝对主角，深入其内心世界
- 语言有文学质感，画面感强，情绪细腻
- 首段不用套路开头，直接进入人物状态或场景
- 不堆砌形容词，段落间有节奏
- 段落之间空一行，不要首行缩进符号
- 请严格把正文总字数控制在目标字数的±200字以内
输出格式必须严格遵守：
1) 第一行输出章节标题（格式：【标题】）
2) 然后输出正文
3) 最后一行单独输出：` + '`【本章主要情节】<不超过50字>`' + `
除上述内容外不要输出解释。`
}

function buildNextChapterSystem(mainChar, charUnder, storyDir, keywords, chars, recentMainPlots, recentChapterContents, chapWC) {
  const charLines = chars.map(c =>
    `${c.name}（${c.role}）：${c.rel || ''}${c.traits?.length ? '，性格：' + c.traits.join('、') : ''}${c.bg ? '，背景：' + c.bg : ''}`
  ).join('\n')
  const plotLines = recentMainPlots.length
    ? recentMainPlots.map((p, i) => `第${i + 1}条：${p}`).join('\n')
    : '暂无'
  const recentText = (recentChapterContents || '').trim() || '暂无'

  console.log('---------章节内容-------', recentChapterContents.length)

  return `你是顶级中文小说创作者，专注为配角书写完整故事。

【主角】${mainChar}
【用户理解】${charUnder || '暂无'}
【故事走向】${storyDir || '暂无'}
【关键情节词】${keywords?.length ? keywords.join('、') : '暂无'}
${charLines ? `【相关人物】\n${charLines}` : ''}
【近10章主要情节】
${plotLines}
【近3章全部内容】
${recentText}

【字数要求】本章目标约${chapWC}字
【写作规范】
- 延续前文节奏、情绪和人物动机
- 情节推进清晰，避免重复叙述
- 段落之间空一行，不要首行缩进符号
- 请严格把正文总字数控制在目标字数的±200字以内
输出格式必须严格遵守：
1) 第一行输出章节标题（格式：【标题】）
2) 然后输出正文
3) 最后一行单独输出：` + '`【本章主要情节】<不超过50字>`' + `
除上述内容外不要输出解释。`
}

function setupSSE(reply) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
  return (data) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
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

    // 保存到数据库（再次带上 userId，防止错误 novelId 导致 P2025）
    try {
      await prisma.novel.update({
        where: { id: novelId, userId },
        data: {
          analysisTraits: JSON.stringify(result.traits),
          analysisConflict: result.conflict,
          outlines: JSON.stringify(result.outlines),
          status: 'analyzing',
        },
      })
    } catch (e) {
      // 如果记录不存在（例如前端传了错误的 novelId），返回 404 而不是抛 Prisma 异常
      if (e.code === 'P2025') {
        return reply.code(404).send({ error: '小说不存在或已被删除' })
      }
      throw e
    }

    return { analysis: result }
  })

  async function streamGenerateAndPersist({ request, reply, chapIndex, buildPrompt, afterPersist }) {
    const { novelId, extraInstruction } = request.body
    const userId = request.user.userId
    const novel = await prisma.novel.findFirst({
      where: { id: novelId, userId },
      include: {
        characters: true,
        chapters: { orderBy: { index: 'asc' } },
      },
    })
    if (!novel) return reply.code(404).send({ error: '小说不存在' })

    const chars = parseCharacterTraits(novel.characters)
    const outlines = novel.outlines ? parseJsonSafely(novel.outlines, []) : []
    const selectedOutline = outlines.find(o => o.id === novel.selectedOutlineId) || null

    const llm = getLLM()
    const send = setupSSE(reply)
    let fullText = ''

    try {
      const { system, userMsg } = buildPrompt({ novel, chars, selectedOutline, chapIndex, extraInstruction })
      await llm.stream(system, userMsg, 6000, (chunk) => {
        fullText += chunk
        send({ type: 'chunk', text: chunk })
      })

      const { title, content: rawContent } = extractChapterTitleAndContent(fullText, chapIndex)
      const { content, mainPlot } = extractMainPlotFromGeneratedText(rawContent)
      const wordCount = content.replace(/\s/g, '').length

      await prisma.chapter.upsert({
        where: { novelId_index: { novelId, index: chapIndex } },
        create: { novelId, index: chapIndex, title, content, mainPlot, wordCount },
        update: { title, content, mainPlot, wordCount, confirmed: false },
      })

      if (novel.status !== 'writing') {
        await prisma.novel.update({ where: { id: novelId }, data: { status: 'writing' } })
      }

      if (afterPersist) await afterPersist({ prisma, llm, novel, content, chapIndex })
      send({ type: 'done', title, wordCount, mainPlot })
    } catch (e) {
      send({ type: 'error', message: e.message })
    } finally {
      reply.raw.end()
    }
  }

  // ── 首章生成（SSE 流式） ──
  fastify.post('/ai/generate-first-chapter', { preHandler: [authenticate] }, async (request, reply) => {
    return streamGenerateAndPersist({
      request,
      reply,
      chapIndex: 0,
      buildPrompt: ({ novel, chars, selectedOutline, extraInstruction }) => {
        const system = buildFirstChapterSystem(
          novel.novel, novel.mainChar, novel.charUnder, novel.storyDir, selectedOutline, chars
        )
        const userMsg = extraInstruction
          ? `请创作第一章，目标约1500字（严格控制在1300~1700字）。额外要求：${extraInstruction}`
          : '请创作第一章，目标约1500字（严格控制在1300~1700字），建立故事基调并推动核心冲突。'
        return { system, userMsg }
      },
    })
  })

  // ── 后续章节生成（SSE 流式） ──
  fastify.post('/ai/generate-next-chapter', { preHandler: [authenticate] }, async (request, reply) => {
    const chapIndex = Number(request.body?.chapIndex)
    if (!Number.isInteger(chapIndex) || chapIndex < 1) {
      return reply.code(400).send({ error: 'chapIndex 必须为大于等于 1 的整数' })
    }
    return streamGenerateAndPersist({
      request,
      reply,
      chapIndex,
      buildPrompt: ({ novel, chars, selectedOutline, extraInstruction }) => {
        const recentMainPlots = novel.chapters
          .filter(c => c.index < chapIndex)
          .sort((a, b) => b.index - a.index)
          .slice(0, 10)
          .reverse()
          .map(c => trimTo(c.mainPlot || c.content || '', 50))
          .filter(Boolean)
        const recent3 = novel.chapters
          .filter(c => c.index < chapIndex)
          .sort((a, b) => b.index - a.index)
          .slice(0, 3)
          .reverse()
        const recentChapterContents = recent3.map(c => {
          const t = (c.title || '').trim() || `第${c.index + 1}章`
          const body = String(c.content || '').trim()
          return `【第${c.index + 1}章 ${t}】\n${body}`
        }).join('\n\n')

        const system = buildNextChapterSystem(
          novel.mainChar,
          novel.charUnder,
          novel.storyDir,
          selectedOutline?.keywords || [],
          chars,
          recentMainPlots,
          recentChapterContents,
          novel.chapWC
        )
        const minWC = Math.max(200, novel.chapWC - 200)
        const maxWC = novel.chapWC + 200
        const userMsg = extraInstruction
          ? `请续写第${chapIndex + 1}章，目标约${novel.chapWC}字（严格控制在${minWC}~${maxWC}字）。额外要求：${extraInstruction}`
          : `请续写第${chapIndex + 1}章，目标约${novel.chapWC}字（严格控制在${minWC}~${maxWC}字）。`
        return { system, userMsg }
      },
    })
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

    const send = setupSSE(reply)
    const llm = getLLM()
    let fullText = ''

    try {
      await llm.stream(system, userMsg, 6000, (chunk) => {
        fullText += chunk
        send({ type: 'chunk', text: chunk })
      })

      const { mainPlot, content } = extractMainPlotFromGeneratedText(fullText)
      await prisma.chapter.update({
        where: { novelId_index: { novelId, index: chapIndex } },
        data: {
          content,
          mainPlot,
          wordCount: content.replace(/\s/g, '').length,
          confirmed: false,
        },
      })

      send({ type: 'done', wordCount: content.replace(/\s/g, '').length, mainPlot })
    } catch (e) {
      send({ type: 'error', message: e.message })
    } finally {
      reply.raw.end()
    }
  })
}

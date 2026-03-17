import { defineStore } from 'pinia'
import { ref } from 'vue'
import { novelApi, chapterApi, aiApi } from '@/api/index.js'

export const useNovelStore = defineStore('novel', () => {
  // ── 列表 ──
  const novels = ref([])
  const total  = ref(0)

  async function fetchNovels(params = {}) {
    const res = await novelApi.list(params)
    novels.value = res.novels
    total.value  = res.total
    return res
  }

  // ── 当前创作项目 ──
  const current   = ref(null)   // novel object
  const chapters  = ref([])     // chapter list
  const curIdx    = ref(0)
  const generating = ref(false)
  let   _stopStream = null

  async function loadNovel(id) {
    const res = await novelApi.get(id)
    current.value  = res.novel
    chapters.value = res.novel.chapters || []
    return res.novel
  }

  async function createNovel(data) {
    const res = await novelApi.create(data)
    novels.value.unshift(res.novel)
    return res.novel
  }

  async function updateNovel(id, data) {
    const res = await novelApi.update(id, data)
    const updated = { ...res.novel }
    // 后端在 update 接口中不会反序列化 JSON 字段，这里做一次兼容处理
    if (typeof updated.analysisTraits === 'string') {
      try { updated.analysisTraits = JSON.parse(updated.analysisTraits) } catch {}
    }
    if (typeof updated.outlines === 'string') {
      try { updated.outlines = JSON.parse(updated.outlines) } catch {}
    }
    current.value = { ...current.value, ...updated }
    // sync list
    const idx = novels.value.findIndex(n => n.id === id)
    if (idx >= 0) novels.value[idx] = { ...novels.value[idx], ...updated }
    return updated
  }

  async function deleteNovel(id) {
    await novelApi.delete(id)
    novels.value = novels.value.filter(n => n.id !== id)
  }

  async function archiveNovel(id) {
    const res = await novelApi.archive(id)
    const idx = novels.value.findIndex(n => n.id === id)
    if (idx >= 0) novels.value[idx].status = res.novel.status
    if (current.value?.id === id) current.value.status = res.novel.status
  }

  // ── Characters ──
  async function addCharacter(data) {
    const res = await novelApi.addChar(current.value.id, data)
    current.value.characters.push(res.character)
    return res.character
  }
  async function deleteCharacter(charId) {
    await novelApi.deleteChar(current.value.id, charId)
    current.value.characters = current.value.characters.filter(c => c.id !== charId)
  }

  // ── AI Analyze ──
  async function analyze() {
    const res = await aiApi.analyze({ novelId: current.value.id })
    current.value.analysisTraits   = res.analysis.traits
    current.value.analysisConflict = res.analysis.conflict
    current.value.outlines         = res.analysis.outlines
    current.value.status           = 'analyzing'
    return res.analysis
  }

  // ── AI Generate chapter (streaming) ──
  function generateChapter(chapIndex, extraInstruction = '') {
    generating.value = true
    const chap = { index: chapIndex, title: '', content: '', confirmed: false }

    // insert or replace
    const existing = chapters.value.findIndex(c => c.index === chapIndex)
    if (existing >= 0) chapters.value[existing] = chap
    else chapters.value.push(chap)

    return new Promise((resolve, reject) => {
      _stopStream = aiApi.generate(
        { novelId: current.value.id, chapIndex, extraInstruction },
        (text) => {
          const c = chapters.value.find(c => c.index === chapIndex)
          if (c) c.content += text
        },
        (meta) => {
          const c = chapters.value.find(c => c.index === chapIndex)
          if (c) {
            // extract title from content
            const m = c.content.match(/【(.+?)】/)
            if (m) { c.title = m[1]; c.content = c.content.replace(/【.+?】/, '').trim() }
            c.wordCount = meta.wordCount
            if (meta.mainPlot) c.mainPlot = meta.mainPlot
          }
          generating.value = false
          _stopStream = null
          resolve(meta)
        },
        (err) => {
          generating.value = false
          _stopStream = null
          reject(new Error(err))
        }
      )
    })
  }

  // ── AI Edit chapter (streaming) ──
  function editChapter(chapIndex, instruction) {
    generating.value = true
    const c = chapters.value.find(c => c.index === chapIndex)
    if (c) c.content = ''

    return new Promise((resolve, reject) => {
      _stopStream = aiApi.edit(
        { novelId: current.value.id, chapIndex, instruction },
        (text) => {
          const ch = chapters.value.find(c => c.index === chapIndex)
          if (ch) ch.content += text
        },
        (meta) => {
          generating.value = false
          _stopStream = null
          resolve(meta)
        },
        (err) => {
          generating.value = false
          _stopStream = null
          reject(new Error(err))
        }
      )
    })
  }

  function stopGenerate() { _stopStream?.(); _stopStream = null; generating.value = false }

  // ── Chapter ops ──
  async function confirmChapter(chapIndex) {
    const c = chapters.value.find(c => c.index === chapIndex)
    if (!c) return
    await chapterApi.confirm(current.value.id, chapIndex, { title: c.title, content: c.content })
    c.confirmed = true
  }

  async function saveChapter(chapIndex, data) {
    await chapterApi.update(current.value.id, chapIndex, data)
    const c = chapters.value.find(c => c.index === chapIndex)
    if (c) Object.assign(c, data)
  }

  async function deleteChapter(chapIndex) {
    await chapterApi.delete(current.value.id, chapIndex)
    chapters.value = chapters.value.filter(c => c.index !== chapIndex)
  }

  function reset() {
    current.value  = null
    chapters.value = []
    curIdx.value   = 0
    generating.value = false
  }

  return {
    novels, total,
    current, chapters, curIdx, generating,
    fetchNovels, createNovel, updateNovel, deleteNovel, archiveNovel,
    loadNovel, addCharacter, deleteCharacter,
    analyze, generateChapter, editChapter, stopGenerate,
    confirmChapter, saveChapter, deleteChapter, reset,
  }
})

<template>
  <div class="page">
    <!-- NAV -->
    <nav class="pnav">
      <div class="pnav-brand" @click="router.push('/')">
        <span class="brand-name">配角传</span>
      </div>
      <div class="pnav-r">
        <span class="pnav-user">{{ auth.user?.username }}</span>
        <button class="btn btn-ghost btn-sm" @click="auth.logout(); router.push('/')">退出</button>
      </div>
    </nav>

    <div class="page-body">
      <!-- HEADER ROW -->
      <div class="list-header">
        <div>
          <h1 class="list-title">我的小说</h1>
          <p class="list-sub">{{ store.total }} 部作品</p>
        </div>
        <button class="btn btn-primary" @click="openNewModal">
          <span style="font-size:16px;line-height:1">＋</span> 新建小说
        </button>
      </div>

      <!-- FILTER BAR -->
      <div class="filter-bar">
        <input class="fi filter-search" v-model="query.q" placeholder="搜索小说名、配角…" @input="debounceFetch">
        <div class="filter-tabs">
          <button
            v-for="t in tabs" :key="t.val"
            class="ftab"
            :class="{ active: query.status === t.val }"
            @click="query.status = t.val; fetchList()"
          >{{ t.label }}</button>
        </div>
      </div>

      <!-- LOADING -->
      <div v-if="loading" class="grid">
        <div v-for="i in 6" :key="i" class="novel-card">
          <div class="skel" style="height:20px;margin-bottom:10px;width:60%"></div>
          <div class="skel" style="height:14px;margin-bottom:8px"></div>
          <div class="skel" style="height:14px;width:40%"></div>
        </div>
      </div>

      <!-- EMPTY -->
      <div v-else-if="!store.novels.length" class="empty-state">
        <div class="empty-icon">📖</div>
        <div class="empty-title">还没有小说</div>
        <div class="empty-desc">开始你的第一部衍生故事创作吧</div>
        <button class="btn btn-primary" style="margin-top:20px" @click="openNewModal">创建第一部</button>
      </div>

      <!-- GRID -->
      <div v-else class="grid">
        <div
          v-for="novel in store.novels"
          :key="novel.id"
          class="novel-card"
          :class="{ 'is-archived': novel.status === 'archived' }"
        >
          <div class="nc-head">
            <div>
              <div class="nc-title">{{ novel.title || `${novel.mainChar}传` }}</div>
              <div class="nc-meta">《{{ novel.novel }}》· {{ novel.mainChar }}</div>
            </div>
            <div class="nc-badge">
              <span class="badge" :class="statusBadge(novel.status)">{{ statusLabel(novel.status) }}</span>
            </div>
          </div>

          <div class="nc-stats">
            <span>{{ novel.chapterCount }} 章</span>
            <span class="nc-dot">·</span>
            <span>{{ novel.totalWords.toLocaleString() }} 字</span>
            <span class="nc-dot">·</span>
            <span>目标 {{ novel.totalWC }}</span>
          </div>

          <!-- CHAPTER LIST (inline) -->
          <div v-if="expanded[novel.id]" class="chap-inline">
            <div v-if="chapLoading[novel.id]" style="font-size:12px;color:var(--muted);padding:8px 0">加载中…</div>
            <div v-else-if="!chapMap[novel.id]?.length" style="font-size:12px;color:var(--faint);padding:8px 0">尚无章节</div>
            <div v-else>
              <div
                v-for="c in chapMap[novel.id]"
                :key="c.id"
                class="ci-row"
              >
                <span class="ci-idx">{{ c.index + 1 }}</span>
                <span class="ci-title">{{ c.title || `第${c.index + 1}章` }}</span>
                <span class="ci-wc">{{ c.wordCount }} 字</span>
                <span class="badge" :class="c.confirmed ? 'badge-sage' : 'badge-gold'" style="font-size:10px;padding:2px 6px">
                  {{ c.confirmed ? '完成' : '草稿' }}
                </span>
              </div>
            </div>
          </div>

          <div class="nc-actions">
            <button
              class="btn btn-ghost btn-sm"
              @click="toggleChapters(novel)"
              style="font-size:11px"
            >
              {{ expanded[novel.id] ? '收起章节 ↑' : '查看章节 ↓' }}
            </button>
            <div style="margin-left:auto;display:flex;gap:6px">
              <button
                v-if="novel.status !== 'archived'"
                class="btn btn-outline btn-sm"
                @click="goStudio(novel.id)"
              >继续创作</button>
              <button class="btn btn-ghost btn-sm" @click="toggleArchive(novel)">
                {{ novel.status === 'archived' ? '取消归档' : '归档' }}
              </button>
              <button class="btn btn-ghost btn-sm" style="color:var(--rose);border-color:rgba(181,99,90,0.3)" @click="confirmDelete(novel)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- PAGINATION -->
      <div v-if="store.total > query.limit" class="pagination">
        <button class="btn btn-ghost btn-sm" :disabled="query.page <= 1" @click="query.page--; fetchList()">上一页</button>
        <span style="font-size:13px;color:var(--muted)">第 {{ query.page }} 页 · 共 {{ Math.ceil(store.total / query.limit) }} 页</span>
        <button class="btn btn-ghost btn-sm" :disabled="query.page * query.limit >= store.total" @click="query.page++; fetchList()">下一页</button>
      </div>
    </div>

    <!-- NEW NOVEL MODAL -->
    <div class="overlay" :class="{ open: showNewModal }">
      <div class="modal">
        <div class="mhd">
          <div>
            <div class="mt">新建小说</div>
            <div class="msub">填写基本信息，进入创作工作台后可继续设置</div>
          </div>
          <button class="mx" @click="showNewModal = false">✕</button>
        </div>
        <div class="mbody">
          <div class="frow">
            <div class="field">
              <div class="field-label"><span class="req-dot"></span>原著小说名称</div>
              <input class="fi" v-model="newForm.novel" placeholder="例如：红楼梦、三体">
            </div>
            <div class="field">
              <div class="field-label"><span class="req-dot"></span>配角姓名</div>
              <input class="fi" v-model="newForm.mainChar" placeholder="例如：薛宝钗">
            </div>
          </div>
          <div class="field" style="margin-bottom:0">
            <div class="field-label">你希望的故事走向（可选）</div>
            <textarea class="fi fta" v-model="newForm.storyDir" placeholder="简单描述即可，后续在工作台中详细设置…" style="min-height:64px"></textarea>
          </div>
        </div>
        <div class="mfoot">
          <button class="btn btn-ghost" @click="showNewModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!newForm.novel || !newForm.mainChar || creating" @click="createAndGo">
            <span v-if="creating" class="spinner" style="width:14px;height:14px"></span>
            <span v-else>创建并进入工作台 →</span>
          </button>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRM MODAL -->
    <div class="overlay" :class="{ open: showDeleteModal }">
      <div class="modal" style="max-width:400px">
        <div class="mhd">
          <div><div class="mt">确认删除</div></div>
          <button class="mx" @click="showDeleteModal = false">✕</button>
        </div>
        <div class="mbody">
          <p style="font-size:14px;color:var(--text2);line-height:1.7">
            确定要删除「{{ deleteTarget?.title || deleteTarget?.mainChar + '传' }}」吗？<br>
            <strong style="color:var(--rose)">所有章节将一并删除，此操作不可撤销。</strong>
          </p>
        </div>
        <div class="mfoot">
          <button class="btn btn-ghost" @click="showDeleteModal = false">取消</button>
          <button class="btn btn-primary" style="background:var(--rose)" @click="doDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useNovelStore } from '@/stores/novel.js'
import { chapterApi } from '@/api/index.js'

const router = useRouter()
const auth   = useAuthStore()
const store  = useNovelStore()
const toast  = inject('toast')

const loading = ref(false)
const query   = reactive({ q: '', status: '', page: 1, limit: 12 })

const tabs = [
  { label: '全部', val: '' },
  { label: '创作中', val: 'writing' },
  { label: '已完成', val: 'completed' },
  { label: '归档', val: 'archived' },
]

async function fetchList() {
  loading.value = true
  try { await store.fetchNovels(query) } finally { loading.value = false }
}
onMounted(fetchList)

let debTimer
function debounceFetch() { clearTimeout(debTimer); debTimer = setTimeout(fetchList, 400) }

// chapter expand
const expanded   = ref({})
const chapMap    = ref({})
const chapLoading = ref({})

async function toggleChapters(novel) {
  const id = novel.id
  expanded.value[id] = !expanded.value[id]
  if (expanded.value[id] && !chapMap.value[id]) {
    chapLoading.value[id] = true
    try {
      const res = await chapterApi.list(id)
      chapMap.value[id] = res.chapters
    } finally { chapLoading.value[id] = false }
  }
}

// status helpers
function statusLabel(s) { return { setup:'设置中', analyzing:'分析中', writing:'创作中', completed:'已完成', archived:'已归档' }[s] || s }
function statusBadge(s) { return { setup:'badge-muted', analyzing:'badge-gold', writing:'badge-rose', completed:'badge-sage', archived:'badge-muted' }[s] || 'badge-muted' }

function goStudio(id) { router.push(`/studio/${id}`) }

async function toggleArchive(novel) {
  await store.archiveNovel(novel.id)
  toast(novel.status === 'archived' ? '已取消归档' : '已归档')
}

// delete
const showDeleteModal = ref(false)
const deleteTarget = ref(null)
function confirmDelete(novel) { deleteTarget.value = novel; showDeleteModal.value = true }
async function doDelete() {
  await store.deleteNovel(deleteTarget.value.id)
  showDeleteModal.value = false
  toast('已删除')
}

// new novel
const showNewModal = ref(false)
const newForm = reactive({ novel: '', mainChar: '', storyDir: '' })
const creating = ref(false)
function openNewModal() { newForm.novel = ''; newForm.mainChar = ''; newForm.storyDir = ''; showNewModal.value = true }
async function createAndGo() {
  if (!newForm.novel || !newForm.mainChar) return
  creating.value = true
  try {
    const novel = await store.createNovel({ novel: newForm.novel, mainChar: newForm.mainChar, storyDir: newForm.storyDir })
    showNewModal.value = false
    router.push(`/studio/${novel.id}`)
  } catch (e) { toast(e.message, 'error') } finally { creating.value = false }
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--page); display: flex; flex-direction: column; }
.pnav {
  height: 56px; background: var(--white); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 36px; flex-shrink: 0;
}
.pnav-brand { cursor: pointer; }
.brand-name { font-family: var(--font-serif); font-size: 18px; font-weight: 700; color: var(--rose); }
.pnav-r { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.pnav-user { font-size: 13px; color: var(--text2); }

.page-body { flex: 1; max-width: 1100px; margin: 0 auto; width: 100%; padding: 36px 36px 60px; }
.list-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
.list-title { font-family: var(--font-serif); font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.list-sub   { font-size: 13px; color: var(--muted); }

.filter-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.filter-search { max-width: 260px; padding: 8px 14px; font-size: 13px; }
.filter-tabs { display: flex; gap: 4px; }
.ftab {
  padding: 6px 14px; border: 1px solid var(--border); border-radius: 20px;
  font-size: 12px; color: var(--muted); cursor: pointer; background: transparent;
  transition: all 0.15s;
}
.ftab.active { background: var(--rose-l); border-color: var(--rose-m); color: var(--rose); }
.ftab:hover:not(.active) { background: var(--card); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

.novel-card {
  background: var(--white); border: 1px solid var(--border); border-radius: var(--r2);
  padding: 20px 22px; transition: box-shadow 0.2s;
}
.novel-card:hover { box-shadow: var(--shadow); }
.novel-card.is-archived { opacity: 0.65; }
.nc-head  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.nc-title { font-family: var(--font-serif); font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.nc-meta  { font-size: 12px; color: var(--rose); }
.nc-stats { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
.nc-dot   { margin: 0 6px; }

.chap-inline { border-top: 1px solid var(--border2); padding-top: 12px; margin-bottom: 12px; max-height: 200px; overflow-y: auto; }
.ci-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--border2); font-size: 12px; }
.ci-row:last-child { border: none; }
.ci-idx   { color: var(--faint); width: 16px; flex-shrink: 0; }
.ci-title { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-wc    { color: var(--muted); flex-shrink: 0; }

.nc-actions { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--border2); padding-top: 12px; flex-wrap: wrap; }

.empty-state { text-align: center; padding: 80px 40px; }
.empty-icon  { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-family: var(--font-serif); font-size: 20px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.empty-desc  { font-size: 14px; color: var(--muted); }

.pagination { display: flex; align-items: center; gap: 16px; justify-content: center; margin-top: 32px; }

/* modal styles (local, consistent with global) */
.overlay { position: fixed; inset: 0; background: rgba(42,34,30,0.38); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
.overlay.open { opacity: 1; pointer-events: all; }
.modal { background: var(--white); border-radius: var(--r2); border: 1px solid var(--border); width: 560px; max-height: 84vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(42,34,30,0.12); }
.mhd  { padding: 24px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; }
.mt   { font-family: var(--font-serif); font-size: 17px; font-weight: 600; color: var(--text); }
.msub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.mx   { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
.mx:hover { color: var(--text); }
.mbody { padding: 20px 28px; }
.mfoot { padding: 0 28px 24px; display: flex; gap: 8px; justify-content: flex-end; }
.frow  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
</style>

<template>
  <div class="studio" :class="{ immersive: inWriteMode }">

    <!-- ══ WIZARD NAV ══ -->
    <nav v-if="!inWriteMode" class="wnav">
      <div class="wnav-brand" @click="router.push('/novels')">
        <span class="brand-name">配角传</span>
      </div>
      <div class="wiz-steps">
        <template v-for="(s, i) in stepDefs" :key="i">
          <div
            class="ws"
            :class="{ act: step === i+1, done: step > i+1 }"
            @click="step > i+1 && (step = i+1)"
          >
            <div class="wdot">{{ step > i+1 ? '✓' : i+1 }}</div>
            {{ s }}
          </div>
          <div v-if="i < stepDefs.length-1" class="wconn"></div>
        </template>
      </div>
      <div class="wnav-r">
        <button class="btn btn-ghost btn-sm" @click="router.push('/novels')">← 返回列表</button>
        <button class="btn btn-outline btn-sm" @click="doSave">保存</button>
      </div>
    </nav>


    <!-- ══ IMMERSIVE FLOAT ══ -->
    <div v-if="inWriteMode" class="float-ctrl">
      <button class="btn btn-ghost btn-sm" @click="exportAll">导出正文</button>
      <button class="btn btn-ghost btn-sm" @click="router.push('/novels')">返回列表</button>
    </div>

    <!-- ══ LAYOUT ══ -->
    <div class="studio-body">
      <!-- sidebar -->
      <aside class="sb">
        <div class="sb-s">
          <div class="sb-lbl">当前项目</div>
          <div class="proj">
            <div class="proj-novel serif">{{ nv.novel || '尚未设定' }}</div>
            <div class="proj-char">{{ nv.mainChar || '选择配角后开始' }}</div>
            <div v-if="nv.chapters?.length" class="prog-wrap">
              <div class="prog-meta">
                <span>{{ totalWords.toLocaleString() }} 字</span>
                <span>目标 {{ nv.totalWC }}</span>
              </div>
              <div class="prog-bar"><div class="prog-fill" :style="{ width: progPct + '%' }"></div></div>
            </div>
          </div>
          <button v-if="nv.id" class="add-btn" style="margin-top:10px" @click="openSettingModal">⚙ 基本设定</button>
        </div>
        <div class="sb-body">
          <div class="sb-s">
            <div class="sb-lbl">故事人物</div>
            <div v-if="!nv.characters?.length" class="sb-empty">尚无人物</div>
            <div v-else>
              <div v-for="(c, i) in nv.characters" :key="c.id" class="ci">
                <div class="cav" :style="{ background: pal(i,'18'), borderColor: pal(i,'44'), color: pal(i,'') }">{{ c.name[0] }}</div>
                <div><div class="ci-name">{{ c.name }}</div><div class="ci-role">{{ c.role || '人物' }}</div></div>
              </div>
            </div>
            <button class="add-btn" @click="openCharModal()">＋ 添加人物</button>
          </div>
          <div class="sb-s" style="border:none;flex:1">
            <div class="sb-lbl">章节列表</div>
            <div v-if="!nv.chapters?.length" class="sb-empty">创作开始后生成</div>
            <div v-else>
              <div
                v-for="(c, i) in nv.chapters" :key="i"
                class="cr" :class="{ cur: store.curIdx === i }"
                @click="jumpChap(i)"
              >
                <span class="cr-idx">{{ i+1 }}</span>
                <span class="cr-name">{{ c.title || `第${i+1}章` }}</span>
                <span class="badge" :class="c.confirmed ? 'badge-sage' : 'badge-gold'" style="font-size:10px;padding:2px 5px">
                  {{ c.confirmed ? '✓' : '草' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- main -->
      <main class="smain" :class="{ immersive: inWriteMode }">

        <!-- ── STEP 1 ── -->
        <div v-if="step === 1 && !inWriteMode" class="wp">
          <div class="hq">
            <div class="hq-t serif">「你喜欢的那个配角，<em>值得拥有一个完整的故事。</em>」</div>
          </div>
          <div class="orn">✦ &nbsp; ✦ &nbsp; ✦</div>
          <div class="eye">Step 01&ensp;基本设定</div>
          <div class="wt serif">这是谁的故事？</div>
          <div class="ws2" style="margin-bottom:28px">填写原著小说与心中那个配角，告诉 AI 你对他 / 她的理解与期待。</div>
          <div class="frow">
            <div class="field">
              <div class="field-label"><span class="req-dot"></span>原著小说名称</div>
              <input class="fi" v-model="form.novel" placeholder="例如：红楼梦、三体、天龙八部">
            </div>
            <div class="field">
              <div class="field-label"><span class="req-dot"></span>配角姓名</div>
              <input class="fi" v-model="form.mainChar" placeholder="例如：薛宝钗、章北海">
            </div>
          </div>
          <div class="field">
            <div class="field-label">你对这个角色的理解</div>
            <textarea class="fi fta" v-model="form.charUnder" placeholder="例如：薛宝钗表面端庄守礼，内心有着常人不知的孤寂与隐忍……" style="min-height:88px"></textarea>
          </div>
          <div class="field">
            <div class="field-label">你希望的故事走向</div>
            <textarea class="fi fta" v-model="form.storyDir" placeholder="例如：展现她嫁入贾府前独处时的真实内心，悲而不泣……" style="min-height:88px"></textarea>
          </div>
          <div class="field">
            <div class="field-label">总体字数目标</div>
            <div class="wg3">
              <div v-for="t in totalWCOpts" :key="t.val" class="wc" :class="{ sel: form.totalWC === t.label }" @click="form.totalWC = t.label">
                <div class="wv">{{ t.val }}</div><div class="wd">{{ t.desc }}</div>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="field-label">单章字数</div>
            <div class="wg4">
              <div v-for="c in chapWCOpts" :key="c" class="wc" :class="{ sel: form.chapWC === c }" @click="form.chapWC = c">
                <div class="wv">{{ c }}字</div>
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary" :disabled="!form.novel || !form.mainChar" @click="saveStep1">
              下一步：添加人物 →
            </button>
          </div>
        </div>

        <!-- ── STEP 2 ── -->
        <div v-if="step === 2 && !inWriteMode" class="wp">
          <div class="eye">Step 02&ensp;添加人物</div>
          <div class="wt serif">故事里还有谁？</div>
          <div class="ws2" style="margin-bottom:22px">添加相关人物（<strong style="color:var(--rose)">选填</strong>，可随时补充）。</div>
          <div class="tip-box">
            <div class="tip-icon">💡</div>
            <div class="tip-text"><strong>建议添加：</strong>与配角有直接关联的人物，如主角、恋人、对手等，故事会更立体。</div>
          </div>
          <div v-if="nv.characters?.length" class="cgrid">
            <div v-for="(c, i) in nv.characters" :key="c.id" class="cpick sel" :style="{ borderColor: pal(i,'66'), background: pal(i,'0e') }">
              <div class="cav2" :style="{ background: pal(i,'18'), borderColor: pal(i,'44'), color: pal(i,'') }">{{ c.name[0] }}</div>
              <div class="cpick-name">{{ c.name }}</div>
              <div class="cpick-role">{{ c.role || '人物' }}</div>
            </div>
            <div class="cpick" style="cursor:pointer;border-style:dashed" @click="openCharModal()">
              <div style="font-size:22px;color:var(--faint);margin-bottom:8px">＋</div>
              <div style="font-size:12px;color:var(--muted)">添加人物</div>
            </div>
          </div>
          <button v-else class="add-btn" style="margin-top:4px" @click="openCharModal()"><span style="font-size:14px">＋</span> 添加新人物</button>
          <div class="divl" style="margin:28px 0"></div>
          <div style="display:flex;justify-content:space-between">
            <button class="btn btn-ghost" @click="step = 1">← 返回</button>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost" @click="step = 3">跳过</button>
              <button class="btn btn-primary" @click="step = 3">下一步：AI 分析 →</button>
            </div>
          </div>
        </div>

        <!-- ── STEP 3 ── -->
        <div v-if="step === 3 && !inWriteMode" class="wp">
          <div class="eye">Step 03&ensp;选择脉络</div>
          <div class="wt serif">你想讲哪一个故事？</div>
          <div class="ws2" style="margin-bottom:24px">AI 正在分析 <strong style="color:var(--rose)">{{ nv.mainChar }}</strong> 在原著中的性格与背景，生成多条故事脉络。</div>

          <div v-if="analyzing">
            <div class="skel" style="height:96px;margin-bottom:12px"></div>
            <div v-for="i in 3" :key="i" class="skel" style="height:120px;margin-bottom:12px"></div>
          </div>
          <div v-else>
            <div class="abox">
              <div style="font-size:10px;color:var(--rose);letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px">AI 角色解读</div>
              <div style="display:flex;gap:20px;flex-wrap:wrap">
                <div style="flex:1;min-width:180px">
                  <div style="font-size:11px;color:var(--muted);margin-bottom:8px">性格特质</div>
                  <span v-for="t in nv.analysisTraits" :key="t" class="tp">{{ t }}</span>
                </div>
                <div style="flex:1;min-width:180px">
                  <div style="font-size:11px;color:var(--muted);margin-bottom:8px">核心张力</div>
                  <div style="font-size:13px;color:var(--text2);line-height:1.65">{{ nv.analysisConflict }}</div>
                </div>
              </div>
            </div>

            <div v-for="ol in nv.outlines" :key="ol.id" class="olc" :class="{ sel: nv.selectedOutlineId === ol.id }" @click="selectOutline(ol.id)">
              <span class="olsb">已选择 ✓</span>
              <div class="olt">{{ ol.style }}</div>
              <div class="olti serif">{{ ol.title }}</div>
              <div class="ollo">{{ ol.logline }}</div>
              <div class="olde">{{ ol.desc }}</div>
              <div class="olkw"><span v-for="k in ol.keywords" :key="k" class="okw">{{ k }}</span></div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:22px">
              <button class="btn btn-ghost" @click="step = 2">← 返回</button>
              <div style="display:flex;gap:8px">
                <button class="btn btn-ghost" @click="runAnalysis">重新生成脉络</button>
                <button class="btn btn-primary" :disabled="!nv.selectedOutlineId" @click="goStep4">生成首章 →</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 4 ── -->
        <div v-if="step === 4 && !inWriteMode" class="wp p4">
          <div class="eye">Step 04&ensp;首章预览</div>
          <div class="wt serif" id="p4Title">{{ nv.chapters?.[0]?.title || '正在生成第一章…' }}</div>
          <div class="ws2" style="margin-bottom:28px">
            {{ store.generating ? 'AI 正在创作约 1500 字的首章，请稍候…' : '首章已生成。可直接编辑，或重新生成。满意后保存进入正式创作。' }}
          </div>
          <div style="margin-bottom:16px">
            <div class="chap-lbl">第一章</div>
            <input class="chap-ti serif" v-model="chapTitle" :readonly="!p4Editing" placeholder="章节标题">
          </div>
          <div class="paper" :class="{ editing: p4Editing }" ref="p4PaperEl" :contenteditable="p4Editing" @input="onP4Input">
            <template v-if="store.generating">
              <p v-for="(para, i) in streamParas" :key="i">{{ para }}<span v-if="i === streamParas.length-1" class="tc"></span></p>
            </template>
            <template v-else>
              <p v-for="(para, i) in finalParas" :key="i">{{ para }}</p>
            </template>
          </div>
          <div class="abar">
            <div class="abar-l">
              <button v-if="!store.generating" class="btn btn-outline btn-sm" :class="{ 'btn-ea': p4Editing }" @click="toggleP4Edit">
                {{ p4Editing ? '退出编辑' : '编辑' }}
              </button>
              <button v-if="!store.generating" class="btn btn-ghost btn-sm" @click="regenChap(0)">重新生成</button>
              <span class="wc-lbl">{{ p4WC }} 字</span>
            </div>
            <div class="abar-r">
              <button v-if="!store.generating" class="btn btn-primary" @click="saveFirstChap">保存，进入正式创作 →</button>
            </div>
          </div>
        </div>

        <!-- ── WRITE MODE ── -->
        <div v-if="inWriteMode" class="write-main">
          <div class="w-chap-hd">
            <div class="w-chap-lbl">第 {{ store.curIdx + 1 }} 章</div>
            <input class="w-chap-ti serif" v-model="wChapTitle" :readonly="!wEditing" placeholder="章节标题…">
          </div>
          <div class="w-paper" :class="{ editing: wEditing }" ref="wPaperEl" :contenteditable="wEditing" @input="onWInput">
            <template v-if="store.generating">
              <p v-for="(p, i) in streamParas" :key="i">{{ p }}<span v-if="i===streamParas.length-1" class="tc"></span></p>
            </template>
            <template v-else>
              <p v-for="(p, i) in wFinalParas" :key="i">{{ p }}</p>
            </template>
          </div>
          <div class="w-abar">
            <div class="w-abar-l">
              <button class="btn btn-outline btn-sm" :class="{ 'btn-ea': wEditing }" @click="toggleWEdit" :disabled="store.generating">
                {{ wEditing ? '退出编辑' : '编辑' }}
              </button>
              <button v-if="!curChap?.confirmed" class="btn btn-ghost btn-sm" @click="regenChap(store.curIdx)" :disabled="store.generating">重新生成</button>
              <span class="wc-lbl">{{ wChapWC }} 字</span>
            </div>
            <div class="w-abar-r">
              <button
                v-if="curChap && store.curIdx === latestChapIdx"
                class="btn btn-ghost btn-sm"
                @click="deleteLatestChapter"
                :disabled="store.generating"
              >
                删除本章
              </button>
              <button class="btn btn-outline btn-sm" @click="saveCurrentChap" :disabled="store.generating || !curChap">
                保存
              </button>
              <button v-if="!curChap?.confirmed" class="btn btn-primary btn-sm" @click="generateNextChap" :disabled="store.generating || !curChap">
                生成第 {{ store.curIdx + 2 }} 章 →
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>

    <!-- SETTING MODAL -->
    <div class="overlay" :class="{ open: settingModal }">
      <div class="modal">
        <div class="mhd">
          <div><div class="mt">基本设定</div></div>
          <button class="mx" @click="settingModal=false">✕</button>
        </div>
        <div class="mbody">
          <div class="field">
            <div class="field-label">小说名称</div>
            <input class="fi" v-model="sm.title" placeholder="例如：历飞羽传">
          </div>
          <div class="field">
            <div class="field-label">你对这个角色的理解</div>
            <textarea class="fi fta" v-model="sm.charUnder" placeholder="例如：坚韧、讲义气、果断决绝……" style="min-height:72px"></textarea>
          </div>
          <div class="field">
            <div class="field-label">你希望的故事走向</div>
            <textarea class="fi fta" v-model="sm.storyDir" placeholder="例如：从主角的出生背景写起……" style="min-height:72px"></textarea>
          </div>
          <div class="field">
            <div class="field-label">总体字数目标</div>
            <div class="wg3">
              <div v-for="t in totalWCOpts" :key="t.val" class="wc" :class="{ sel: sm.totalWC === t.label }" @click="sm.totalWC = t.label">
                <div class="wv">{{ t.val }}</div><div class="wd">{{ t.desc }}</div>
              </div>
            </div>
          </div>
          <div class="field" style="margin-bottom:0">
            <div class="field-label">单章字数</div>
            <div class="wg4">
              <div v-for="c in chapWCOpts" :key="c" class="wc" :class="{ sel: sm.chapWC === c }" @click="sm.chapWC = c">
                <div class="wv">{{ c }}字</div>
              </div>
            </div>
          </div>
        </div>
        <div class="mfoot">
          <button class="btn btn-ghost" @click="settingModal=false">取消</button>
          <button class="btn btn-primary" @click="saveSettings">保存设定</button>
        </div>
      </div>
    </div>

    <!-- CHARACTER MODAL -->
    <div class="overlay" :class="{ open: charModal }">
      <div class="modal">
        <div class="mhd"><div><div class="mt">添加人物</div></div><button class="mx" @click="charModal=false">✕</button></div>
        <div class="mbody">
          <div class="frow" style="margin-bottom:14px">
            <div class="field"><div class="field-label"><span class="req-dot"></span>姓名</div><input class="fi" v-model="cm.name" placeholder="例如：贾宝玉"></div>
            <div class="field" style="margin-bottom:0"><div class="field-label">身份</div><input class="fi" v-model="cm.role" placeholder="例如：贾府公子"></div>
          </div>
          <div class="field"><div class="field-label">与配角的关系</div><input class="fi" v-model="cm.rel"></div>
          <div class="field"><div class="field-label">性格关键词（逗号分隔）</div><input class="fi" v-model="cm.traits" placeholder="多情，软弱，纯善"></div>
          <div class="field" style="margin-bottom:0"><div class="field-label">背景补充</div><textarea class="fi fta" v-model="cm.bg" style="min-height:60px"></textarea></div>
        </div>
        <div class="mfoot">
          <button class="btn btn-ghost" @click="charModal=false">取消</button>
          <button class="btn btn-primary" @click="addChar">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNovelStore } from '@/stores/novel.js'
import { novelApi } from '@/api/index.js'

const router = useRouter()
const route  = useRoute()
const store  = useNovelStore()
const toast  = inject('toast')

const step        = ref(1)
const inWriteMode = ref(false)
const analyzing   = ref(false)
const charModal   = ref(false)
const settingModal = ref(false)

// ── SETTING MODAL ──
const sm = reactive({ title: '', charUnder: '', storyDir: '', totalWC: '短篇（1-3万字）', chapWC: 1500 })
function openSettingModal() {
  Object.assign(sm, {
    title:    nv.value.title    || '',
    charUnder: nv.value.charUnder || '',
    storyDir:  nv.value.storyDir  || '',
    totalWC:   nv.value.totalWC   || '短篇（1-3万字）',
    chapWC:    nv.value.chapWC    || 1500,
  })
  settingModal.value = true
}
async function saveSettings() {
  await store.updateNovel(nv.value.id, {
    title:    sm.title,
    charUnder: sm.charUnder,
    storyDir:  sm.storyDir,
    totalWC:   sm.totalWC,
    chapWC:    sm.chapWC,
  })
  settingModal.value = false
  toast('设定已保存 ✓')
}

const nv = computed(() => store.current || {})

// ── FORM ──
const form = reactive({
  novel: '', mainChar: '', charUnder: '', storyDir: '',
  totalWC: '短篇（1-3万字）', chapWC: 1500,
})
const totalWCOpts = [
  { val: '1–3万', label: '短篇（1-3万字）', desc: '3-5章' },
  { val: '5–10万', label: '中篇（5-10万字）', desc: '10-20章' },
  { val: '10万+', label: '长篇（10万字以上）', desc: '连载' },
]
const chapWCOpts = [800, 1500, 2000, 3000]

// ── LOAD EXISTING ──
onMounted(async () => {
  const id = route.params.id
  if (id) {
    const n = await store.loadNovel(id)
    // populate form
    Object.assign(form, {
      novel: n.novel, mainChar: n.mainChar,
      charUnder: n.charUnder || '', storyDir: n.storyDir || '',
      totalWC: n.totalWC, chapWC: n.chapWC,
    })
    // determine step
    if (n.status === 'writing' || n.status === 'completed') {
      if (n.chapters?.length) { enterWriteMode(); return }
    }
    if (n.outlines?.length) step.value = 3
    else if (n.characters?.length) step.value = 2
  }
})

// ── STEP 1 ──
async function saveStep1() {
  if (!form.novel || !form.mainChar) return
  if (!nv.value.id) {
    await store.createNovel({ ...form })
    router.replace(`/studio/${nv.value.id}`)
  } else {
    await store.updateNovel(nv.value.id, { ...form })
  }
  step.value = 2
}

// ── STEP 3 ANALYZE ──
async function runAnalysis() {
  if (!nv.value.id) { toast('请先保存设定', 'error'); return }
  analyzing.value = true
  try { await store.analyze() } catch(e) { toast(e.message, 'error') } finally { analyzing.value = false }
}
watch(() => step.value, async (v) => {
  if (v === 3 && !nv.value.outlines?.length) await runAnalysis()
})
function selectOutline(id) {
  store.updateNovel(nv.value.id, { selectedOutlineId: id })
}

// ── STEP 4 ──
const p4Editing  = ref(false)
const p4PaperEl  = ref(null)
const chapTitle  = ref('')
const p4EditedContent = ref('')

const streamText = ref('')
const streamParas = computed(() => streamText.value.split(/\n+/).filter(s=>s.trim()))
const finalParas  = computed(() => {
  const c = nv.value.chapters?.[0]?.content || ''
  return c.split(/\n+/).filter(s=>s.trim())
})
const p4WC = computed(() => {
  const c = nv.value.chapters?.[0]?.content || ''
  return c.replace(/\s/g,'').length
})

async function goStep4() {
  step.value = 4
  await nextTick()
  if (!nv.value.chapters?.[0]?.content) {
    await genChap(0)
  } else {
    chapTitle.value = nv.value.chapters[0].title || ''
  }
}
async function genChap(idx) {
  streamText.value = ''
  chapTitle.value = ''
  try {
    await store.generateChapter(idx)
    chapTitle.value = nv.value.chapters?.[idx]?.title || ''
    streamText.value = ''
  } catch(e) { toast(e.message, 'error') }
}

function toggleP4Edit() {
  p4Editing.value = !p4Editing.value
  if (!p4Editing.value && p4PaperEl.value) {
    const txt = p4PaperEl.value.innerText
    p4EditedContent.value = txt
    store.chapters[0] = { ...store.chapters[0], content: txt, title: chapTitle.value }
  }
  if (p4Editing.value) nextTick(() => p4PaperEl.value?.focus())
}
function onP4Input() {}

async function regenChap(idx) {
  if (p4Editing.value) toggleP4Edit()
  streamText.value = ''
  if (store.chapters[idx]) store.chapters[idx].content = ''
  await genChap(idx)
}

async function saveFirstChap() {
  if (p4Editing.value) toggleP4Edit()
  const content = p4PaperEl.value?.innerText || nv.value.chapters?.[0]?.content || ''
  await store.confirmChapter(0)
  await store.saveChapter(0, { title: chapTitle.value, content })
  enterWriteMode()
}

// ── WRITE MODE ──
const wEditing   = ref(false)
const wPaperEl   = ref(null)
const wChapTitle = ref('')
const wEditedContent = ref('')

const curChap = computed(() => store.chapters[store.curIdx])
const latestChapIdx = computed(() => {
  if (!store.chapters.length) return -1
  return Math.max(...store.chapters.map(c => c.index ?? -1))
})
const wFinalParas = computed(() => {
  const c = curChap.value?.content || ''
  return c.split(/\n+/).filter(s=>s.trim())
})
const wChapWC = computed(() => (curChap.value?.content || '').replace(/\s/g,'').length)

function enterWriteMode() {
  inWriteMode.value = true
  const latestIdx = store.chapters.length
    ? Math.max(...store.chapters.map(c => c.index ?? 0))
    : 0
  store.curIdx = latestIdx
  wChapTitle.value = store.chapters[latestIdx]?.title || ''
  streamText.value = ''
}
function jumpChap(i) {
  store.curIdx = i
  wChapTitle.value = store.chapters[i]?.title || ''
  streamText.value = ''
  if (wEditing.value) toggleWEdit()
}
function toggleWEdit() {
  wEditing.value = !wEditing.value
  if (!wEditing.value && wPaperEl.value) {
    const txt = wPaperEl.value.innerText
    store.chapters[store.curIdx] = { ...curChap.value, content: txt, title: wChapTitle.value }
    store.saveChapter(store.curIdx, { title: wChapTitle.value, content: txt }).catch(() => {})
  }
  if (wEditing.value) nextTick(() => wPaperEl.value?.focus())
}
function onWInput() {}
async function saveCurrentChap() {
  if (wEditing.value) toggleWEdit()
  const content = wPaperEl.value?.innerText || curChap.value?.content || ''
  await store.saveChapter(store.curIdx, { title: wChapTitle.value, content })
  toast('已保存 ✓')
}
async function generateNextChap() {
  if (wEditing.value) toggleWEdit()
  await store.confirmChapter(store.curIdx)
  await genNextChap()
}
async function deleteLatestChapter() {
  if (!curChap.value) return
  if (store.curIdx !== latestChapIdx.value) {
    toast('只能删除最新章节', 'error')
    return
  }
  if (!window.confirm(`确认删除第 ${store.curIdx + 1} 章？`)) return
  await store.deleteChapter(store.curIdx)
  const nextLatest = store.chapters.length
    ? Math.max(...store.chapters.map(c => c.index ?? 0))
    : 0
  store.curIdx = nextLatest
  wChapTitle.value = store.chapters[nextLatest]?.title || ''
}
async function genNextChap() {
  const nextIdx = store.curIdx + 1
  if (!store.chapters[nextIdx]) store.chapters.push({ index: nextIdx, title: '', content: '', confirmed: false })
  store.curIdx = nextIdx
  wChapTitle.value = ''
  streamText.value = ''
  await store.generateChapter(nextIdx)
  wChapTitle.value = store.chapters[nextIdx]?.title || ''
  streamText.value = ''
}

// Watch stream from store
watch(() => store.chapters[store.curIdx]?.content, (v) => {
  if (store.generating) streamText.value = v || ''
})
watch(() => store.chapters[0]?.content, (v) => {
  if (store.generating && step.value === 4) streamText.value = v || ''
})

// ── UTILS ──
const PAL = ['#b5635a','#6a9178','#9e7a3a','#7070b5','#b5845a','#5a8ab5']
function pal(i, opacity) {
  const c = PAL[i % PAL.length]
  if (!opacity) return c
  return c + opacity
}
const totalWords = computed(() => store.chapters.reduce((s,c)=>s+(c.content||'').replace(/\s/g,'').length, 0))
const progPct    = computed(() => Math.min(100, (totalWords.value / 20000) * 100))

// character modal
const cm = reactive({ name:'', role:'', rel:'', traits:'', bg:'' })
function openCharModal() { Object.assign(cm, { name:'', role:'', rel:'', traits:'', bg:'' }); charModal.value = true }
async function addChar() {
  if (!cm.name) return
  await store.addCharacter({ ...cm, traits: cm.traits.split(/[,，]/).map(s=>s.trim()).filter(Boolean) })
  charModal.value = false
}

async function doSave() { toast('已保存 ✓') }
function exportAll() {
  const chapters = store.chapters
  if (!chapters.length) { toast('尚未创作任何章节', 'error'); return }
  let out = `《${nv.value.mainChar}传》\n原著：《${nv.value.novel}》\n\n`
  chapters.forEach((c, i) => {
    out += `第${i+1}章 ${c.title || ''}\n\n${c.content || ''}\n\n${'─'.repeat(28)}\n\n`
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain;charset=utf-8' }))
  a.download = `${nv.value.mainChar}传.txt`
  a.click()
}
</script>

<style scoped>
.studio { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--page); }
.studio.immersive { background: var(--page); }

/* nav */
.wnav { height: 56px; background: var(--white); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 28px; flex-shrink: 0; position: relative; z-index: 20; }
.wnav-brand { cursor: pointer; }
.brand-name { font-family: var(--font-serif); font-size: 18px; font-weight: 700; color: var(--rose); }
.wiz-steps { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; }
.ws { display: flex; align-items: center; gap: 7px; padding: 0 14px; height: 56px; font-size: 12px; color: var(--muted); cursor: default; border-bottom: 2px solid transparent; transition: all .2s; }
.ws.act { color: var(--rose); border-bottom-color: var(--rose); }
.ws.done { color: var(--sage); cursor: pointer; }
.wdot { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--faint); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: var(--muted); flex-shrink: 0; }
.ws.done .wdot { background: var(--sage); border-color: var(--sage); color: #fff; }
.ws.act .wdot  { background: var(--rose); border-color: var(--rose); color: #fff; }
.wconn { width: 20px; height: 1px; background: var(--border); flex-shrink: 0; }
.wnav-r { margin-left: auto; display: flex; gap: 8px; }

/* float ctrl */
.float-ctrl { position: fixed; top: 14px; right: 20px; z-index: 50; display: flex; gap: 8px; align-items: center; }
.float-title { font-size: 13px; color: var(--muted); margin-right: 6px; letter-spacing: .02em; }

/* layout */
.studio-body { flex: 1; display: flex; overflow: hidden; }
.sb { width: 248px; flex-shrink: 0; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.sb-s { padding: 14px 16px; border-bottom: 1px solid var(--border2); }
.sb-lbl { font-size: 10px; color: var(--muted); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 10px; }
.sb-body { flex: 1; overflow-y: auto; }
.sb-empty { font-size: 11px; color: var(--faint); padding: 4px 2px; }
.proj { background: var(--bg); border: 1px solid var(--border); border-radius: var(--r2); padding: 12px 14px; }
.proj-novel { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.proj-char  { font-size: 12px; color: var(--rose); }
.prog-wrap  { margin-top: 10px; }
.prog-meta  { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 5px; }
.prog-bar   { height: 3px; background: var(--card); border-radius: 2px; overflow: hidden; }
.prog-fill  { height: 100%; background: var(--rose-m); border-radius: 2px; transition: width .5s; }
.ci { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: var(--r); margin-bottom: 2px; }
.cav { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; border: 1px solid; }
.ci-name { font-size: 13px; color: var(--text); font-weight: 500; }
.ci-role { font-size: 11px; color: var(--muted); }
.cr { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: var(--r); cursor: pointer; margin-bottom: 2px; transition: background .15s; }
.cr:hover { background: var(--bg); }
.cr.cur   { background: var(--rose-l); }
.cr-idx { font-size: 10px; color: var(--muted); width: 14px; flex-shrink: 0; }
.cr-name { font-size: 12px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.add-btn { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1.5px dashed var(--faint); border-radius: var(--r); color: var(--muted); font-size: 12px; cursor: pointer; transition: all .2s; background: none; width: 100%; margin-top: 4px; }
.add-btn:hover { border-color: var(--rose-m); color: var(--rose); }

/* main */
.smain { flex: 1; overflow-y: auto; background: var(--page); }
.smain.immersive { background: var(--page); }
.wp { padding: 48px 64px; max-width: 780px; margin: 0 auto; }
.p4 { max-width: 860px; }
.eye { font-size: 11px; color: var(--rose); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.eye::after { content: ''; flex: 1; height: 1px; background: var(--rose-l); }
.wt { font-size: 26px; font-weight: 700; color: var(--text); line-height: 1.35; margin-bottom: 8px; }
.ws2 { font-size: 13px; color: var(--muted); line-height: 1.7; }
.hq { text-align: center; padding: 40px 48px 0; }
.hq-t { font-size: 21px; font-weight: 300; color: var(--text2); line-height: 1.8; letter-spacing: .04em; }
.hq-t em { color: var(--rose); font-style: normal; font-weight: 700; }
.orn { text-align: center; color: var(--faint); letter-spacing: .6em; font-size: 12px; margin: 28px 0; }
.frow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.wg3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.wg4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.wc { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 12px 14px; cursor: pointer; transition: all .2s; }
.wc:hover { border-color: var(--faint); }
.wc.sel  { border-color: var(--rose-m); background: var(--rose-l); }
.wv { font-size: 16px; font-weight: 700; color: var(--text); font-family: var(--font-serif); margin-bottom: 3px; }
.wd { font-size: 11px; color: var(--muted); }
.cgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(130px,1fr)); gap: 10px; margin-top: 4px; }
.cpick { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 16px 12px; text-align: center; }
.cpick.sel { border-style: solid; }
.cav2 { width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid; }
.cpick-name { font-size: 13px; font-weight: 500; color: var(--text); }
.cpick-role { font-size: 11px; color: var(--muted); margin-top: 3px; }

/* analysis */
.abox { background: var(--white); border: 1px solid var(--border); border-radius: var(--r2); padding: 18px 22px; margin-bottom: 22px; }
.tp { display: inline-block; padding: 3px 10px; background: var(--rose-l); color: var(--rose); border-radius: 4px; font-size: 12px; border: 1px solid rgba(181,99,90,.2); margin: 2px 2px 2px 0; }
.olc { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--r2); padding: 22px 24px; margin-bottom: 12px; cursor: pointer; transition: all .25s; position: relative; overflow: hidden; }
.olc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background .2s; }
.olc:hover { border-color: var(--rose-m); }
.olc:hover::before, .olc.sel::before { background: var(--rose); }
.olc.sel { border-color: var(--rose); background: var(--rose-l); }
.olsb { position: absolute; top: 16px; right: 16px; background: var(--rose); color: #fff; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 500; opacity: 0; transition: opacity .2s; }
.olc.sel .olsb { opacity: 1; }
.olt  { display: inline-flex; padding: 3px 10px; background: var(--gold-l); color: var(--gold); border-radius: 20px; font-size: 11px; margin-bottom: 10px; border: 1px solid rgba(158,122,58,.2); font-weight: 500; }
.olti { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.ollo { font-size: 12px; color: var(--rose); font-style: italic; margin-bottom: 8px; }
.olde { font-size: 13px; color: var(--text2); line-height: 1.75; }
.olkw { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.okw  { padding: 3px 9px; background: var(--card); border-radius: 4px; font-size: 11px; color: var(--muted); }

/* paper */
.chap-lbl { font-size: 11px; color: var(--rose); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px; }
.chap-ti  { font-size: 22px; font-weight: 700; color: var(--text); border: none; background: transparent; outline: none; width: 100%; line-height: 1.3; margin-bottom: 20px; }
.chap-ti::placeholder { color: var(--faint); }
.paper {
  background: var(--white); border-radius: var(--r2); border: 1.5px solid var(--border);
  padding: 40px 52px; min-height: 520px;
  font-family: var(--font-serif); font-size: 16.5px; line-height: 2.05; color: var(--text);
  margin-bottom: 0; transition: border-color .2s, box-shadow .2s;
  white-space: pre-wrap; word-break: break-word;
}
.paper[contenteditable=true] { border-color: var(--rose-m); box-shadow: 0 0 0 3px rgba(181,99,90,.08); outline: none; cursor: text; caret-color: var(--rose); }
.paper:focus { outline: none; }
.paper p { margin-bottom: 1.1em; }
.tc { display: inline-block; width: 2px; height: 16px; background: var(--rose); animation: tb 1s steps(1) infinite; vertical-align: middle; }
@keyframes tb { 0%,100%{opacity:1} 50%{opacity:0} }
.abar { display: flex; align-items: center; gap: 10px; padding: 16px 0; border-top: 1px solid var(--border); margin-top: 20px; }
.abar-l { display: flex; gap: 8px; align-items: center; }
.abar-r { margin-left: auto; display: flex; gap: 8px; }
.wc-lbl { font-size: 12px; color: var(--muted); }
.btn-ea { background: var(--rose-l); border-color: var(--rose-m); color: var(--rose); }

/* write mode */
.write-main { max-width: 980px; margin: 0 auto; padding: 52px 60px; }
.w-chap-hd  { margin-bottom: 22px; }
.w-chap-lbl { font-size: 11px; color: var(--rose); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px; }
.w-chap-ti  { font-size: 22px; font-weight: 700; color: var(--text); border: none; background: transparent; outline: none; width: 100%; line-height: 1.3; }
.w-chap-ti::placeholder { color: var(--faint); }
.w-paper {
  background: var(--white); border-radius: var(--r2); border: 1.5px solid var(--border);
  padding: 52px 64px; min-height: 600px;
  font-family: var(--font-serif); font-size: 17px; line-height: 2.1; color: var(--text);
  white-space: pre-wrap; word-break: break-word;
  transition: border-color .2s, box-shadow .2s;
}
.w-paper[contenteditable=true] { border-color: var(--rose-m); box-shadow: 0 0 0 3px rgba(181,99,90,.08); outline: none; cursor: text; caret-color: var(--rose); }
.w-paper p { margin-bottom: 1.1em; }
.w-abar { display: flex; align-items: center; gap: 10px; padding: 14px 0; border-top: 1px solid var(--border); margin-top: 24px; }
.w-abar-l { display: flex; gap: 8px; align-items: center; }
.w-abar-r { margin-left: auto; display: flex; gap: 8px; }

/* modal */
.overlay { position: fixed; inset: 0; background: rgba(42,34,30,.38); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .2s; }
.overlay.open { opacity: 1; pointer-events: all; }
.modal { background: var(--white); border-radius: var(--r2); border: 1px solid var(--border); width: 520px; max-height: 84vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(42,34,30,.12); }
.mhd { padding: 24px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; }
.mt  { font-family: var(--font-serif); font-size: 17px; font-weight: 600; color: var(--text); }
.mx  { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; }
.mx:hover { color: var(--text); }
.mbody { padding: 20px 28px; }
.mfoot { padding: 0 28px 24px; display: flex; gap: 8px; justify-content: flex-end; }
.frow  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.divl  { height: 1px; background: var(--border2); }
.serif { font-family: var(--font-serif); }
</style>

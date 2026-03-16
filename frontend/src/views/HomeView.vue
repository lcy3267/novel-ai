<template>
  <div class="home">
    <!-- NAV -->
    <nav class="hnav">
      <div class="hnav-brand" @click="router.push('/')">
        <span class="brand-name">配角传</span>
        <span class="brand-sep"></span>
        <span class="brand-sub">让配角的故事被看见</span>
      </div>
      <div class="hnav-r">
        <template v-if="auth.isLoggedIn">
          <span class="hnav-user">{{ auth.user?.username }}</span>
          <button class="btn btn-outline btn-sm" @click="router.push('/novels')">我的小说</button>
          <button class="btn btn-ghost btn-sm" @click="auth.logout(); router.push('/')">退出</button>
        </template>
        <template v-else>
          <button class="btn btn-ghost btn-sm" @click="router.push('/login')">登录</button>
          <button class="btn btn-primary btn-sm" @click="router.push('/register')">免费注册</button>
        </template>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-deco hero-deco-tl"></div>
      <div class="hero-deco hero-deco-br"></div>
      <div class="hero-inner">
        <div class="hero-eyebrow">AI 衍生小说创作平台</div>
        <h1 class="hero-title">
          你喜欢的那个配角，<br>
          <em>值得拥有一个完整的故事。</em>
        </h1>
        <p class="hero-desc">
          输入原著小说与那个让你念念不忘的配角，<br>
          AI 将深度分析其性格脉络，为你生成专属的衍生中短篇小说。
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" @click="handleStart">
            开始创作
          </button>
          <a class="hero-demo" @click.prevent="scrollTo('features')">了解更多 ↓</a>
        </div>
        <div class="hero-stats">
          <div class="hstat"><span class="hstat-n">10,000+</span><span class="hstat-l">衍生故事</span></div>
          <div class="hstat-div"></div>
          <div class="hstat"><span class="hstat-n">500+</span><span class="hstat-l">原著小说</span></div>
          <div class="hstat-div"></div>
          <div class="hstat"><span class="hstat-n">3</span><span class="hstat-l">大模型适配</span></div>
        </div>
      </div>
      <!-- floating book cards -->
      <div class="hero-books">
        <div class="hbook hbook-1">
          <div class="hbook-title">镜中人</div>
          <div class="hbook-sub">《红楼梦》薛宝钗传</div>
          <div class="hbook-preview">窗外的雨声细而绵密，她坐在案前，手里捏着那枚金锁，出了许久的神……</div>
        </div>
        <div class="hbook hbook-2">
          <div class="hbook-title">此后光阴</div>
          <div class="hbook-sub">《三体》章北海传</div>
          <div class="hbook-preview">他站在舰桥上，望着深邃的黑暗，第一次感到一种奇异的平静……</div>
        </div>
        <div class="hbook hbook-3">
          <div class="hbook-title">短暂停留</div>
          <div class="hbook-sub">《射雕英雄传》穆念慈传</div>
          <div class="hbook-preview">那年春天，她第一次在人群中看到他，他的眼里有她从未见过的光……</div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features" id="features">
      <div class="sec-inner">
        <div class="sec-eyebrow">核心功能</div>
        <h2 class="sec-title">每一个配角，都有被讲述的权利</h2>
        <div class="feat-grid">
          <div class="feat-card" v-for="f in features" :key="f.title">
            <div class="feat-icon">{{ f.icon }}</div>
            <div class="feat-title">{{ f.title }}</div>
            <div class="feat-desc">{{ f.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how" id="how">
      <div class="sec-inner">
        <div class="sec-eyebrow">创作流程</div>
        <h2 class="sec-title">四步，生成你的专属故事</h2>
        <div class="steps-row">
          <div class="step-item" v-for="(s, i) in steps" :key="i">
            <div class="step-num">{{ i + 1 }}</div>
            <div class="step-title">{{ s.title }}</div>
            <div class="step-desc">{{ s.desc }}</div>
            <div class="step-arrow" v-if="i < steps.length - 1">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-sec">
      <div class="cta-inner">
        <h2 class="cta-title">准备好了吗？</h2>
        <p class="cta-sub">那个角落里沉默着的配角，正等待着你来讲述她 / 他的故事。</p>
        <button class="btn btn-primary btn-lg" @click="handleStart">立即开始创作</button>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <span class="brand-name" style="font-size:15px">配角传</span>
      <span style="margin:0 12px;color:var(--faint)">·</span>
      <span style="font-size:12px;color:var(--muted)">你喜欢的那个配角，值得拥有一个完整的故事。</span>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const auth   = useAuthStore()

function handleStart() {
  if (auth.isLoggedIn) router.push('/novels')
  else router.push('/register')
}
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const features = [
  { icon: '🔍', title: 'AI 角色深度解析', desc: '自动分析原著中配角的性格特质、命运脉络与核心张力，构建立体人物底色。' },
  { icon: '🌿', title: '多条故事脉络', desc: '基于角色分析与你的创作方向，AI 生成悲情、成长、温情等多条脉络供选择。' },
  { icon: '✍️', title: '沉浸式逐章创作', desc: '逐章生成，每章完成后确认进入下一章，保持故事连贯性，随时可编辑修改。' },
  { icon: '🔌', title: '大模型插件化', desc: '支持 Claude / GPT / DeepSeek 等多个大模型，一键切换，不锁定单一服务商。' },
  { icon: '📚', title: '项目管理', desc: '所有创作项目集中管理，支持搜索、筛选、归档，多本小说同时进行。' },
  { icon: '💾', title: '一键导出', desc: '创作完成后导出为 TXT 文件，完整保留章节结构与标题。' },
]

const steps = [
  { title: '输入设定', desc: '小说名称 + 配角姓名 + 你的理解与期待' },
  { title: '添加人物', desc: '补充与配角相关的人物关系（可选）' },
  { title: '选择脉络', desc: 'AI 分析角色，生成多条故事脉络' },
  { title: '逐章创作', desc: '生成首章，确认后继续下一章' },
]
</script>

<style scoped>
.home { min-height: 100vh; display: flex; flex-direction: column; overflow-y: auto; background: var(--page); }

/* nav */
.hnav {
  position: sticky; top: 0; z-index: 50;
  height: 60px; background: rgba(250,248,244,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 48px;
}
.hnav-brand { display: flex; align-items: baseline; gap: 10px; cursor: pointer; }
.brand-name { font-family: var(--font-serif); font-size: 19px; font-weight: 700; color: var(--rose); letter-spacing: 0.04em; }
.brand-sep  { width: 1px; height: 14px; background: var(--faint); }
.brand-sub  { font-size: 12px; color: var(--muted); font-style: italic; }
.hnav-r     { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.hnav-user  { font-size: 13px; color: var(--text2); margin-right: 4px; }

/* hero */
.hero {
  position: relative; overflow: hidden;
  padding: 80px 48px 100px;
  display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 60px;
  min-height: 580px;
}
.hero-deco {
  position: absolute; width: 320px; height: 320px; border-radius: 50%;
  background: radial-gradient(circle, rgba(181,99,90,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.hero-deco-tl { top: -80px; left: -80px; }
.hero-deco-br { bottom: -80px; right: -80px; background: radial-gradient(circle, rgba(106,145,120,0.07) 0%, transparent 70%); }
.hero-inner { flex: 1; max-width: 540px; position: relative; z-index: 1; text-align: center; }
.hero-eyebrow {
  font-size: 11px; color: var(--rose); letter-spacing: 0.16em; text-transform: uppercase;
  margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.hero-eyebrow::before { content: ''; flex: 0 0 32px; height: 1px; background: var(--rose-m); }
.hero-eyebrow::after  { content: ''; flex: 0 0 32px; height: 1px; background: var(--rose-m); }
.hero-title {
  font-family: var(--font-serif); font-size: 38px; font-weight: 700;
  color: var(--text); line-height: 1.35; margin-bottom: 20px; letter-spacing: 0.02em;
}
.hero-title em { color: var(--rose); font-style: normal; }
.hero-desc { font-size: 15px; color: var(--muted); line-height: 1.85; margin-bottom: 32px; }
.hero-actions { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 40px; }
.hero-demo { font-size: 13px; color: var(--muted); cursor: pointer; text-decoration: none; transition: color 0.2s; }
.hero-demo:hover { color: var(--rose); }
.hero-stats { display: flex; align-items: center; justify-content: center; gap: 0; }
.hstat { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.hstat-n { font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--text); }
.hstat-l { font-size: 11px; color: var(--muted); }
.hstat-div { width: 1px; height: 32px; background: var(--border); margin: 0 24px; }

/* hero books */
.hero-books {
  flex: 0 0 380px; position: relative; height: 320px;
}
.hbook {
  position: absolute;
  background: var(--white); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 18px 20px;
  box-shadow: var(--shadow); width: 220px;
  transition: transform 0.3s;
}
.hbook:hover { transform: translateY(-4px) !important; box-shadow: var(--shadow-md); }
.hbook-1 { top: 0;   left: 0;   transform: rotate(-2deg); }
.hbook-2 { top: 80px; left: 100px; transform: rotate(1.5deg); z-index: 2; }
.hbook-3 { top: 160px; left: 20px; transform: rotate(-1deg); }
.hbook-title { font-family: var(--font-serif); font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.hbook-sub   { font-size: 11px; color: var(--rose); margin-bottom: 10px; }
.hbook-preview { font-family: var(--font-serif); font-size: 12px; color: var(--muted); line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* sections */
.sec-inner  { max-width: 960px; margin: 0 auto; padding: 80px 48px; }
.sec-eyebrow { font-size: 11px; color: var(--rose); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 10px; }
.sec-title  { font-family: var(--font-serif); font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 40px; }

/* features */
.features   { background: var(--bg); }
.feat-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feat-card  {
  background: var(--white); border: 1px solid var(--border); border-radius: var(--r2);
  padding: 24px; transition: box-shadow 0.2s, transform 0.2s;
}
.feat-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.feat-icon  { font-size: 24px; margin-bottom: 12px; }
.feat-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.feat-desc  { font-size: 13px; color: var(--muted); line-height: 1.7; }

/* how */
.how        { background: var(--page); }
.steps-row  { display: flex; align-items: flex-start; gap: 0; position: relative; }
.step-item  { flex: 1; position: relative; padding-right: 32px; }
.step-num   {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--rose-l); border: 2px solid var(--rose-m);
  color: var(--rose); font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.step-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.step-desc  { font-size: 13px; color: var(--muted); line-height: 1.6; }
.step-arrow {
  position: absolute; right: 8px; top: 10px;
  font-size: 18px; color: var(--faint);
}

/* CTA */
.cta-sec    { background: linear-gradient(135deg, #f5e8e7 0%, #e8f0eb 100%); }
.cta-inner  { max-width: 600px; margin: 0 auto; padding: 80px 48px; text-align: center; }
.cta-title  { font-family: var(--font-serif); font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
.cta-sub    { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 28px; }

/* footer */
.footer { padding: 24px 48px; border-top: 1px solid var(--border); display: flex; align-items: center; }
</style>

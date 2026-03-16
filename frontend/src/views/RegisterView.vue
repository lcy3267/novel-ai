<template>
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-left-inner">
        <div class="auth-brand" @click="router.push('/')">
          <span class="brand-name">配角传</span>
        </div>
        <blockquote class="auth-quote">
          「那个角落里沉默着的配角，<br>正等待着你来讲述她 / 他的故事。」
        </blockquote>
        <div class="reg-hint">
          <div class="rh-item" v-for="h in hints" :key="h">✦ {{ h }}</div>
        </div>
      </div>
    </div>

    <div class="auth-right">
      <div class="auth-card">
        <div class="ac-header">
          <h1 class="ac-title">创建账号</h1>
          <p class="ac-sub">注册后即可开始创作专属衍生故事</p>
        </div>

        <form @submit.prevent="handleRegister">
          <div class="field">
            <div class="field-label">用户名</div>
            <input class="fi" v-model="form.username" placeholder="你的笔名" required maxlength="20">
          </div>
          <div class="field">
            <div class="field-label">邮箱</div>
            <input class="fi" v-model="form.email" type="email" placeholder="your@email.com" required autocomplete="email">
          </div>
          <div class="field">
            <div class="field-label">密码</div>
            <input class="fi" v-model="form.password" type="password" placeholder="至少 6 位" required minlength="6" autocomplete="new-password">
          </div>
          <div class="field" style="margin-bottom:20px">
            <div class="field-label">确认密码</div>
            <input class="fi" v-model="form.confirm" type="password" placeholder="再次输入密码" required autocomplete="new-password">
            <div v-if="form.confirm && form.confirm !== form.password" class="error-msg">两次密码不一致</div>
          </div>

          <p v-if="errMsg" class="error-msg" style="margin-bottom:14px">{{ errMsg }}</p>

          <button
            class="btn btn-primary"
            style="width:100%;justify-content:center"
            :disabled="loading || (form.confirm && form.confirm !== form.password)"
            type="submit"
          >
            <span v-if="loading" class="spinner" style="width:16px;height:16px"></span>
            <span v-else>注册并开始创作</span>
          </button>
        </form>

        <div class="ac-foot">
          已有账号？
          <router-link to="/login" class="ac-link">立即登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const auth   = useAuthStore()
const toast  = inject('toast')

const form   = ref({ username: '', email: '', password: '', confirm: '' })
const errMsg = ref('')
const loading = ref(false)

async function handleRegister() {
  if (form.value.password !== form.value.confirm) return
  errMsg.value = ''
  loading.value = true
  try {
    await auth.register(form.value.email, form.value.password, form.value.username)
    router.push('/novels')
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

const hints = ['支持 Claude / GPT / DeepSeek 多模型', '无限创作项目，随时继续', '逐章生成，完整连贯的故事']
</script>

<style scoped>
.auth-page { height: 100vh; display: flex; }
.auth-left {
  flex: 1; background: linear-gradient(160deg, #e8f0eb 0%, #f5e8e7 100%);
  display: flex; align-items: center; justify-content: center; padding: 60px;
}
.auth-left-inner { max-width: 400px; }
.auth-brand { cursor: pointer; margin-bottom: 40px; }
.brand-name { font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--rose); }
.auth-quote {
  font-family: var(--font-serif); font-size: 19px; font-weight: 300;
  color: var(--text2); line-height: 1.8; border: none;
  margin-bottom: 36px; letter-spacing: 0.03em;
}
.rh-item { font-size: 13px; color: var(--text2); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }

.auth-right { flex: 0 0 480px; display: flex; align-items: center; justify-content: center; padding: 40px; background: var(--page); }
.auth-card { width: 100%; max-width: 380px; }
.ac-header { margin-bottom: 28px; }
.ac-title  { font-family: var(--font-serif); font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.ac-sub    { font-size: 13px; color: var(--muted); }
.ac-foot   { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
.ac-link   { color: var(--rose); text-decoration: none; font-weight: 500; }
.ac-link:hover { text-decoration: underline; }
</style>

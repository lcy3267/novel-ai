<template>
  <div class="auth-page">
    <div class="auth-left">
      <div class="auth-left-inner">
        <div class="auth-brand" @click="router.push('/')">
          <span class="brand-name">配角传</span>
        </div>
        <blockquote class="auth-quote">
          「你喜欢的那个配角，<br>值得拥有一个完整的故事。」
        </blockquote>
        <div class="auth-books">
          <div class="ab" v-for="b in books" :key="b.title">
            <span class="ab-title">{{ b.title }}</span>
            <span class="ab-sub">{{ b.sub }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-right">
      <div class="auth-card">
        <div class="ac-header">
          <h1 class="ac-title">欢迎回来</h1>
          <p class="ac-sub">登录后继续你的创作旅程</p>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="field">
            <div class="field-label">邮箱</div>
            <input class="fi" v-model="form.email" type="email" placeholder="your@email.com" required autocomplete="email">
          </div>
          <div class="field">
            <div class="field-label">密码</div>
            <input class="fi" v-model="form.password" type="password" placeholder="请输入密码" required autocomplete="current-password">
          </div>

          <p v-if="errMsg" class="error-msg" style="margin-bottom:14px">{{ errMsg }}</p>

          <button class="btn btn-primary" style="width:100%;justify-content:center" :disabled="loading" type="submit">
            <span v-if="loading" class="spinner" style="width:16px;height:16px"></span>
            <span v-else>登录</span>
          </button>
        </form>

        <div class="ac-foot">
          还没有账号？
          <router-link to="/register" class="ac-link">免费注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const toast  = inject('toast')

const form   = ref({ email: '', password: '' })
const errMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  errMsg.value = ''
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password)
    const redirect = route.query.redirect || '/novels'
    router.push(redirect)
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

const books = [
  { title: '镜中人', sub: '《红楼梦》薛宝钗传' },
  { title: '此后光阴', sub: '《三体》章北海传' },
  { title: '短暂停留', sub: '《射雕英雄传》穆念慈传' },
]
</script>

<style scoped>
.auth-page { height: 100vh; display: flex; }
.auth-left {
  flex: 1; background: linear-gradient(160deg, #f5e8e7 0%, #e8f0eb 100%);
  display: flex; align-items: center; justify-content: center; padding: 60px;
}
.auth-left-inner { max-width: 400px; }
.auth-brand { cursor: pointer; margin-bottom: 40px; }
.brand-name { font-family: var(--font-serif); font-size: 22px; font-weight: 700; color: var(--rose); }
.auth-quote {
  font-family: var(--font-serif); font-size: 20px; font-weight: 300;
  color: var(--text2); line-height: 1.8; border: none;
  margin-bottom: 40px; letter-spacing: 0.03em;
}
.ab { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; padding: 10px 14px; background: rgba(255,255,255,0.6); border-radius: var(--r); }
.ab-title { font-family: var(--font-serif); font-size: 13px; font-weight: 600; color: var(--text); }
.ab-sub   { font-size: 11px; color: var(--rose); }

.auth-right { flex: 0 0 480px; display: flex; align-items: center; justify-content: center; padding: 40px; background: var(--page); }
.auth-card { width: 100%; max-width: 380px; }
.ac-header { margin-bottom: 28px; }
.ac-title  { font-family: var(--font-serif); font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.ac-sub    { font-size: 13px; color: var(--muted); }
.ac-foot   { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
.ac-link   { color: var(--rose); text-decoration: none; font-weight: 500; }
.ac-link:hover { text-decoration: underline; }
</style>

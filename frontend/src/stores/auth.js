import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function register(email, password, username) {
    const res = await authApi.register({ email, password, username })
    _save(res)
    return res
  }

  async function login(email, password) {
    const res = await authApi.login({ email, password })
    _save(res)
    return res
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await authApi.me()
      user.value = res.user
    } catch {
      logout()
    }
  }

  function logout() {
    user.value  = null
    token.value = null
    localStorage.removeItem('token')
  }

  function _save(res) {
    user.value  = res.user
    token.value = res.token
    localStorage.setItem('token', res.token)
  }

  return { user, token, isLoggedIn, register, login, fetchMe, logout }
})

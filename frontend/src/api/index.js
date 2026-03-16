import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 自动附加 JWT
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 统一错误处理
http.interceptors.response.use(
  r => r.data,
  err => {
    const msg = err.response?.data?.error || '网络错误，请稍后重试'
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  }
)

// ── Auth ──
export const authApi = {
  register: (data)    => http.post('/auth/register', data),
  login:    (data)    => http.post('/auth/login', data),
  me:       ()        => http.get('/auth/me'),
  updateMe: (data)    => http.put('/auth/me', data),
}

// ── Novels ──
export const novelApi = {
  list:       (params) => http.get('/novels', { params }),
  create:     (data)   => http.post('/novels', data),
  get:        (id)     => http.get(`/novels/${id}`),
  update:     (id, d)  => http.put(`/novels/${id}`, d),
  delete:     (id)     => http.delete(`/novels/${id}`),
  archive:    (id)     => http.put(`/novels/${id}/archive`),
  addChar:    (id, d)  => http.post(`/novels/${id}/characters`, d),
  deleteChar: (id, cid)=> http.delete(`/novels/${id}/characters/${cid}`),
}

// ── Chapters ──
export const chapterApi = {
  list:    (novelId)        => http.get(`/novels/${novelId}/chapters`),
  create:  (novelId, data)  => http.post(`/novels/${novelId}/chapters`, data),
  update:  (novelId, idx, d)=> http.put(`/novels/${novelId}/chapters/${idx}`, d),
  confirm: (novelId, idx, d)=> http.post(`/novels/${novelId}/chapters/${idx}/confirm`, d),
  delete:  (novelId, idx)   => http.delete(`/novels/${novelId}/chapters/${idx}`),
}

// ── AI (SSE streaming) ──
export const aiApi = {
  // 角色分析可能耗时较长，单独放宽超时时间
  analyze: (data) => http.post('/ai/analyze', data, { timeout: 120000 }),

  /**
   * 流式生成章节
   * onChunk(text): 每次收到文本片段
   * returns: EventSource cleanup fn
   */
  generate(data, onChunk, onDone, onError) {
    return _sse('/ai/generate', data, onChunk, onDone, onError)
  },

  edit(data, onChunk, onDone, onError) {
    return _sse('/ai/edit', data, onChunk, onDone, onError)
  },
}

function _sse(path, body, onChunk, onDone, onError) {
  const token = localStorage.getItem('token')
  const ctrl = new AbortController()

  fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      onError?.(e.error || '请求失败')
      return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'chunk') onChunk?.(json.text)
          if (json.type === 'done')  onDone?.(json)
          if (json.type === 'error') onError?.(json.message)
        } catch {}
      }
    }
  }).catch(e => {
    if (e.name !== 'AbortError') onError?.(e.message)
  })

  return () => ctrl.abort()
}

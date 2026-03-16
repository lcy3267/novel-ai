# 配角传 · 全栈项目

> 你喜欢的那个配角，值得拥有一个完整的故事。

## 技术栈
| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + Pinia + Vue Router |
| 后端 | Node.js + Fastify + Prisma |
| 数据库 | SQLite |
| 认证 | JWT（7 天有效期） |
| 大模型 | 插件化适配器（Anthropic / OpenAI / DeepSeek） |

---

## 快速启动

### 1. 安装依赖
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 API Key 和 JWT 密钥
```

### 3. 初始化数据库
```bash
cd backend
npx prisma migrate dev --name init
```

### 4. 启动服务
```bash
# 终端1：后端
cd backend && npm run dev    # → http://localhost:3000

# 终端2：前端
cd frontend && npm run dev   # → http://localhost:5173
```

---

## 切换大模型（修改 backend/.env）

```env
# Anthropic Claude（默认）
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI GPT
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# DeepSeek（兼容 OpenAI 接口，只需改这3行）
LLM_PROVIDER=deepseek
OPENAI_API_KEY=sk-deepseek-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

**新增提供商**：在 `backend/src/plugins/llm/` 目录添加适配器文件，
并在 `index.js` 的 `PROVIDERS` 对象中注册一行即可。

---

## 项目结构

```
peijiaochuan/
├── backend/
│   ├── prisma/schema.prisma         # 数据库模型
│   ├── src/
│   │   ├── plugins/llm/
│   │   │   ├── index.js             # LLM 工厂（插件注册）
│   │   │   ├── anthropic.js         # Anthropic 适配器
│   │   │   └── openai.js            # OpenAI/DeepSeek 适配器
│   │   ├── routes/
│   │   │   ├── auth.js              # 注册/登录/个人信息
│   │   │   ├── novels.js            # 小说 CRUD
│   │   │   ├── chapters.js          # 章节 CRUD
│   │   │   └── ai.js                # AI 生成（SSE 流式）
│   │   ├── middleware/auth.js        # JWT 验证
│   │   └── server.js                # Fastify 入口
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/index.js             # Axios + SSE 封装
    │   ├── stores/
    │   │   ├── auth.js              # 认证 Store
    │   │   └── novel.js             # 小说创作 Store
    │   ├── router/index.js          # 路由 + 守卫
    │   ├── views/
    │   │   ├── HomeView.vue         # 官网首页（落地页）
    │   │   ├── LoginView.vue        # 登录
    │   │   ├── RegisterView.vue     # 注册
    │   │   ├── NovelListView.vue    # 小说列表 + 章节管理
    │   │   └── StudioView.vue       # 创作工作台（4步流程）
    │   ├── assets/base.css          # 全局样式变量
    │   ├── App.vue                  # 根组件 + Toast 系统
    │   └── main.js
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 落地页，未登录可见 |
| `/login` | 登录 | 邮箱+密码 |
| `/register` | 注册 | 邮箱+密码 |
| `/novels` | 小说列表 | 需登录，含章节管理 |
| `/studio/:id` | 创作工作台 | 需登录，4步流程 |

---

## API 说明

所有需要登录的接口需在 Header 中携带：
```
Authorization: Bearer <token>
```

### AI 生成接口（SSE）
`POST /api/ai/generate` 和 `POST /api/ai/edit` 返回 `text/event-stream`，
每行格式为：
```
data: {"type":"chunk","text":"..."}
data: {"type":"done","title":"...","wordCount":1500}
data: {"type":"error","message":"..."}
```

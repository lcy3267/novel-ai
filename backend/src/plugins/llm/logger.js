import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_DIR  = path.resolve(__dirname, '../../../../logs')
const LOG_FILE = path.join(LOG_DIR, 'llm.log')

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen) + `…[截断，原始长度 ${str.length}]`
}

function writeLog(entry) {
  ensureLogDir()
  const line = JSON.stringify(entry) + '\n'
  fs.appendFileSync(LOG_FILE, line, 'utf8')
}

export class LLMLoggerWrapper {
  constructor(provider) {
    this._provider = provider
  }

  get modelName() {
    return this._provider.modelName
  }

  async complete(system, userMessage, maxTokens = 2000) {
    const t0 = Date.now()
    const base = {
      time:        new Date().toISOString(),
      provider:    this._provider.constructor.name,
      model:       this._provider.modelName,
      method:      'complete',
      maxTokens,
      system:      truncate(system, 500),
      userMessage: truncate(userMessage, 500),
    }
    try {
      const result = await this._provider.complete(system, userMessage, maxTokens)
      writeLog({ ...base, result: truncate(result, 1000), durationMs: Date.now() - t0, error: null })
      return result
    } catch (err) {
      writeLog({ ...base, result: null, durationMs: Date.now() - t0, error: err.message })
      throw err
    }
  }

  async stream(system, userMessage, maxTokens = 6000, onChunk) {
    const t0 = Date.now()
    const base = {
      time:        new Date().toISOString(),
      provider:    this._provider.constructor.name,
      model:       this._provider.modelName,
      method:      'stream',
      maxTokens,
      system:      truncate(system, 500),
      userMessage: truncate(userMessage, 500),
    }
    let fullText = ''
    const wrappedOnChunk = (chunk) => {
      fullText += chunk
      onChunk(chunk)
    }
    try {
      await this._provider.stream(system, userMessage, maxTokens, wrappedOnChunk)
      writeLog({ ...base, result: truncate(fullText, 1000), durationMs: Date.now() - t0, error: null })
    } catch (err) {
      writeLog({ ...base, result: truncate(fullText, 1000), durationMs: Date.now() - t0, error: err.message })
      throw err
    }
  }
}

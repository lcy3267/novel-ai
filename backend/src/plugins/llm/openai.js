import OpenAI from 'openai'
import { BaseLLMProvider } from './base.js'

/**
 * OpenAI 兼容适配器
 * 同时支持：OpenAI、DeepSeek、Moonshot、本地 Ollama 等任何 OpenAI 兼容接口
 * 只需修改 OPENAI_BASE_URL + OPENAI_MODEL 即可切换
 */
export class OpenAIProvider extends BaseLLMProvider {
  constructor() {
    super()
    this._client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
    this._model = process.env.OPENAI_MODEL || 'gpt-4o'
  }

  get modelName() { return this._model }

  async complete(system, userMessage, maxTokens = 2000) {
    const res = await this._client.chat.completions.create({
      model: this._model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    })
    return res.choices[0].message.content
  }

  async stream(system, userMessage, maxTokens = 6000, onChunk) {
    const stream = await this._client.chat.completions.create({
      model: this._model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) onChunk(text)
    }
  }
}

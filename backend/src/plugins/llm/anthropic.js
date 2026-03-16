import Anthropic from '@anthropic-ai/sdk'
import { BaseLLMProvider } from './base.js'

export class AnthropicProvider extends BaseLLMProvider {
  constructor() {
    super()
    this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this._model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  }

  get modelName() { return this._model }

  async complete(system, userMessage, maxTokens = 2000) {
    const msg = await this._client.messages.create({
      model: this._model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    return msg.content[0].text
  }

  async stream(system, userMessage, maxTokens = 6000, onChunk) {
    const stream = await this._client.messages.stream({
      model: this._model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        onChunk(event.delta.text)
      }
    }
  }
}

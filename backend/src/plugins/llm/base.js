export class BaseLLMProvider {
  get modelName() { return 'unknown' }

  /**
   * 非流式请求，返回完整文本
   * @param {string} system
   * @param {string} userMessage
   * @param {number} maxTokens
   * @returns {Promise<string>}
   */
  async complete(system, userMessage, maxTokens = 2000) {
    throw new Error('not implemented')
  }

  /**
   * 流式请求，逐 token 回调
   * @param {string} system
   * @param {string} userMessage
   * @param {number} maxTokens
   * @param {(text: string) => void} onChunk
   * @returns {Promise<void>}
   */
  async stream(system, userMessage, maxTokens = 6000, onChunk) {
    throw new Error('not implemented')
  }
}

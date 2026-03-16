/**
 * LLM 插件工厂
 * 根据环境变量 LLM_PROVIDER 自动选择对应适配器
 * 新增提供商：在此文件注册，再实现对应适配器即可
 */

import { AnthropicProvider } from './anthropic.js'
import { OpenAIProvider } from './openai.js'
import { LLMLoggerWrapper } from './logger.js'
export { BaseLLMProvider } from './base.js'

const PROVIDERS = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  deepseek: OpenAIProvider,   // DeepSeek 兼容 OpenAI 接口，复用同一适配器
  // 扩展：添加新提供商只需在此注册
  // moonshot: MoonshotProvider,
  // qwen: QwenProvider,
}

let _instance = null

/**
 * 获取 LLM Provider 单例
 * @returns {BaseLLMProvider}
 */
export function getLLM() {
  if (_instance) return _instance
  const provider = process.env.LLM_PROVIDER || 'anthropic'
  const ProviderClass = PROVIDERS[provider]
  if (!ProviderClass) {
    throw new Error(`未知的 LLM_PROVIDER: "${provider}"，可用值: ${Object.keys(PROVIDERS).join(', ')}`)
  }
  _instance = new LLMLoggerWrapper(new ProviderClass())
  console.log(`[LLM] 使用提供商: ${provider} (${_instance.modelName})`)
  return _instance
}


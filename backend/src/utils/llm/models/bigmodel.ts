import type { MkLLM } from './types'
import { config } from '../../../config/env'

// 错误类型定义
type ErrorType = 'quota_exhausted' | 'auth_error' | 'rate_limit' | 'server_error' | 'network_error' | 'unknown'

interface BigModelError {
  type: ErrorType
  status: number
  message: string
  keyId: string
}

// 智谱AI API Key轮换管理
class KeyRotator {
  private keys: string[]
  private currentIndex: number = 0
  private failedKeys: Set<string> = new Set()
  private exhaustedKeys: Set<string> = new Set() // 额度用完的key

  constructor(keys: string[]) {
    this.keys = keys.filter(k => k && k.length > 0)
    if (this.keys.length === 0) {
      throw new Error('No valid BigModel API keys provided')
    }
  }

  getCurrentKey(): string {
    return this.keys[this.currentIndex]
  }

  rotate(): string {
    const startIndex = this.currentIndex
    do {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length
      const key = this.keys[this.currentIndex]
      // 跳过已失败且未重置的key
      if (!this.failedKeys.has(key) && !this.exhaustedKeys.has(key)) {
        return key
      }
    } while (this.currentIndex !== startIndex)

    // 所有key都失败了，检查是否有非额度用完的key可以重试
    const nonExhaustedKeys = this.keys.filter(k => !this.exhaustedKeys.has(k))
    if (nonExhaustedKeys.length > 0) {
      this.failedKeys.clear()
      this.currentIndex = this.keys.indexOf(nonExhaustedKeys[0])
      return nonExhaustedKeys[0]
    }

    // 所有key都额度用完了
    return ''
  }

  markFailed(key: string, errorType?: ErrorType): void {
    if (errorType === 'quota_exhausted') {
      this.exhaustedKeys.add(key)
      console.log(`[bigmodel] Key ${this.maskKey(key)} marked as QUOTA EXHAUSTED`)
    } else {
      this.failedKeys.add(key)
      console.log(`[bigmodel] Key ${this.maskKey(key)} marked as failed (${errorType || 'unknown'})`)
    }

    // 如果所有key都额度用完了
    if (this.exhaustedKeys.size >= this.keys.length) {
      console.error('[bigmodel] CRITICAL: All API keys have exhausted their quota!')
    }
  }

  hasAvailableKeys(): boolean {
    return this.keys.some(k => !this.exhaustedKeys.has(k))
  }

  getAvailableKeyCount(): number {
    return this.keys.filter(k => !this.exhaustedKeys.has(k)).length
  }

  getKeyIndex(): number {
    return this.currentIndex
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return '***'
    return key.slice(0, 8) + '...'
  }

  getExhaustedKeys(): string[] {
    return Array.from(this.exhaustedKeys)
  }
}

// 解析API错误
function parseError(status: number, errorText: string, key: string): BigModelError {
  let type: ErrorType = 'unknown'
  let message = errorText

  switch (status) {
    case 401:
      type = 'auth_error'
      message = 'API密钥认证失败，请检查密钥配置'
      break
    case 403:
      type = 'auth_error'
      message = 'API密钥权限不足或被禁用'
      break
    case 429:
      // 智谱AI 429 通常是额度用完
      if (errorText.includes('quota') || errorText.includes('limit') || errorText.includes('额度')) {
        type = 'quota_exhausted'
        message = 'API额度已用完，请联系管理员充值或更换API密钥'
      } else {
        type = 'rate_limit'
        message = '请求过于频繁，请稍后再试'
      }
      break
    case 500:
    case 502:
    case 503:
    case 504:
      type = 'server_error'
      message = '智谱AI服务器错误，请稍后重试'
      break
    default:
      if (status >= 400 && status < 500) {
        type = 'auth_error'
        message = `客户端错误 (${status}): ${errorText}`
      } else if (status >= 500) {
        type = 'server_error'
        message = `服务器错误 (${status}): ${errorText}`
      }
  }

  return { type, status, message, keyId: key.slice(0, 8) + '...' }
}

// 智谱AI Coding Plan OpenAI兼容接口调用
export const makeLLM: MkLLM = (cfg: any) => {
  // 延迟初始化Key轮换器 - 避免在模块加载时抛出错误
  const keyRotator = new KeyRotator(config.bigmodel_keys)

  async function callLLM(messages: any[]): Promise<any> {
    const maxRetries = Math.min(config.bigmodel_keys.length, 3) // 最多重试3次
    let lastError: BigModelError | null = null
    let exhaustedKeyCount = 0

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 检查是否还有可用的key
      if (!keyRotator.hasAvailableKeys()) {
        throw new Error(
          '所有智谱AI API密钥额度已用完。请联系管理员充值或配置新的API密钥。' +
          '\n详细信息: 已尝试 ' + config.bigmodel_keys.length + ' 个密钥，全部额度耗尽。'
        )
      }

      const apiKey = keyRotator.getCurrentKey()

      try {
        console.log(`[bigmodel] Attempt ${attempt + 1}/${maxRetries}, using key ${keyRotator.getKeyIndex() + 1}/${config.bigmodel_keys.length}`)
        console.log(`[bigmodel] URL: ${config.bigmodel_base}`)
        console.log(`[bigmodel] Model: ${config.bigmodel_model}`)

        // 创建 AbortController 用于超时
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

        const response = await fetch(config.bigmodel_base, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.bigmodel_model,
            messages: messages.map((m: any) => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : String(m.content),
            })),
            temperature: cfg.temp ?? config.temp ?? 0.7,
            max_tokens: cfg.max_tokens ?? config.max_tokens ?? 8192,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          const error = parseError(response.status, errorText, apiKey)
          console.error(`[bigmodel] API error: ${response.status} - ${errorText}`)

          lastError = error

          // 根据错误类型处理
          if (error.type === 'quota_exhausted') {
            exhaustedKeyCount++
            keyRotator.markFailed(apiKey, 'quota_exhausted')
            // 如果还有可用key，继续尝试
            if (keyRotator.hasAvailableKeys()) {
              keyRotator.rotate()
              continue
            }
            // 所有key都额度用完了，直接抛出错误
            throw new Error(
              '智谱AI API额度已用完。\n' +
              '已尝试 ' + exhaustedKeyCount + ' 个密钥，全部额度耗尽。\n' +
              '请联系管理员：\n' +
              '1. 充值现有API密钥，或\n' +
              '2. 在 .env 文件中配置新的 BIGMODEL_KEY_1~4'
            )
          }

          if (error.type === 'auth_error') {
            keyRotator.markFailed(apiKey, error.type)
            keyRotator.rotate()
            // 认证错误不重试太多次
            if (attempt < maxRetries - 1 && keyRotator.hasAvailableKeys()) {
              continue
            }
            throw new Error(`智谱AI认证失败: ${error.message}`)
          }

          if (error.type === 'rate_limit') {
            // 速率限制，等待后重试
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            console.log(`[bigmodel] Rate limited, waiting ${delay}ms before retry...`)
            await new Promise(r => setTimeout(r, delay))
            keyRotator.rotate()
            continue
          }

          if (error.type === 'server_error') {
            // 服务器错误，等待后重试
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            console.log(`[bigmodel] Server error, waiting ${delay}ms before retry...`)
            await new Promise(r => setTimeout(r, delay))
            keyRotator.rotate()
            continue
          }

          // 其他错误
          throw new Error(`智谱AI API错误 (${response.status}): ${error.message}`)
        }

        const data = await response.json()

        // OpenAI兼容格式返回处理
        // GLM-4.7 可能返回 reasoning_content 而不是 content
        const message = data.choices?.[0]?.message
        const content = message?.content ||
                       message?.reasoning_content ||
                       data.content?.[0]?.text ||
                       data.text ||
                       data.response ||
                       JSON.stringify(data)

        console.log(`[bigmodel] Success with key ${keyRotator.getKeyIndex() + 1}`)

        return {
          content: content,
          role: 'assistant',
        }
      } catch (error: any) {
        console.error(`[bigmodel] Attempt ${attempt + 1} failed:`, error.message)

        // 处理超时错误
        if (error.name === 'AbortError') {
          lastError = { type: 'network_error', status: 0, message: '请求超时(30秒)', keyId: apiKey.slice(0, 8) + '...' }
          keyRotator.markFailed(apiKey, 'network_error')
          keyRotator.rotate()
          if (attempt === maxRetries - 1) {
            throw new Error('智谱AI请求超时。服务器响应时间过长，请稍后重试。')
          }
          continue
        }

        // 网络错误
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
          lastError = { type: 'network_error', status: 0, message: error.message, keyId: apiKey.slice(0, 8) + '...' }
          keyRotator.markFailed(apiKey, 'network_error')
          keyRotator.rotate()
          if (attempt === maxRetries - 1) {
            throw new Error(`智谱AI网络连接失败: ${error.message}`)
          }
          continue
        }

        // 如果是已经处理过的错误（上面有throw的），直接抛出
        if (error.message?.includes('额度已用完') || error.message?.includes('认证失败') || error.message?.includes('超时')) {
          throw error
        }

        // 其他错误
        lastError = { type: 'unknown', status: 0, message: error.message, keyId: apiKey.slice(0, 8) + '...' }
        keyRotator.rotate()

        // 最后一次尝试
        if (attempt === maxRetries - 1) {
          throw new Error(
            `智谱AI调用失败。已尝试 ${attempt + 1} 次。\n` +
            `最后错误: ${lastError?.message || '未知错误'}\n` +
            `建议: 请检查网络连接和API配置，或稍后重试。`
          )
        }
      }
    }

    throw new Error('智谱AI调用异常：重试次数用尽')
  }

  return {
    invoke: callLLM,
    call: callLLM,
  }
}

// 智谱AI不支持embeddings，抛出错误让系统使用备选embeddings
export const makeEmbeddings = (cfg: any) => {
  throw new Error('BigModel does not support embeddings. Use gemini or openai for embeddings.')
}

import path from 'path'
import fs from 'fs'

// 调试日志函数
function logEnvDebug(message: string, ...args: any[]) {
  if (process.env.DEBUG_ENV === 'true') {
    console.log(`[env:debug] ${message}`, ...args)
  }
}

// 尝试多个可能的 .env 文件位置
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),                    // 当前工作目录
  path.resolve(process.cwd(), '../.env'),                 // 上级目录 (backend/)
  path.resolve('/var/www/workspace/PageLM', '.env'),      // 绝对路径
  path.resolve('/var/www/workspace/PageLM/backend', '.env'), // backend绝对路径
]

let envLoaded = false
let loadedFromPath: string | null = null

for (const envPath of possibleEnvPaths) {
  try {
    if (fs.existsSync(envPath)) {
      // Read and parse .env file manually using Node.js fs
      const fileContent = fs.readFileSync(envPath, 'utf-8')
      fileContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=')
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex)
            const value = trimmed.slice(eqIndex + 1)
            // Only set if not already defined in environment
            if (process.env[key] === undefined) {
              process.env[key] = value
            }
          }
        }
      })
      console.log('[env] Loaded from:', envPath)
      envLoaded = true
      loadedFromPath = envPath
      break
    } else {
      logEnvDebug('File not found:', envPath)
    }
  } catch (err: any) {
    logEnvDebug('Failed to load from:', envPath, '-', err.message)
    // 继续尝试下一个
  }
}

if (!envLoaded) {
  console.warn('[env] WARNING: No .env file found in any of the following locations:')
  possibleEnvPaths.forEach(p => console.warn('  -', p))
  console.warn('[env] Will use default values or environment variables from shell')
}

// 辅助函数：解析逗号分隔的字符串为数组
function parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

// 辅助函数：解析数字，带默认值
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = Number(value)
  return isNaN(parsed) ? defaultValue : parsed
}

// 辅助函数：解析布尔值
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

// 构建配置对象
export const config = {
  // 数据库配置
  db_mode: process.env.db_mode || process.env.DB_MODE || 'json',

  // 服务器配置
  url: process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || '',
  timeout: parseNumber(process.env.VITE_TIMEOUT || process.env.TIMEOUT, 90000),
  port: parseNumber(process.env.PORT, 5000),
  baseUrl: process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173',

  // JWT 配置 (用于 WebSocket 认证)
  jwtSecret: process.env.JWT_SECRET || '',

  // LLM 提供商配置
  provider: process.env.LLM_PROVIDER || 'bigmodel',
  embeddings_provider: process.env.EMB_PROVIDER || process.env.EMBEDDINGS_PROVIDER || 'gemini',

  // OpenRouter 配置
  openrouter: process.env.OPENROUTER_API_KEY || '',
  openrouter_model: process.env.openrouter_model || process.env.OPENROUTER_MODEL || '',

  // Gemini 配置
  gemini: process.env.gemini || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
  gemini_model: process.env.gemini_model || process.env.GEMINI_MODEL || 'gemini-1.5-pro',
  gemini_embed_model: process.env.gemini_embed_model || process.env.GEMINI_EMBED_MODEL || 'embedding-001',

  // OpenAI 配置
  openai: process.env.OPENAI_API_KEY || '',
  openai_base: process.env.OPENAI_BASE_URL || '',
  openai_embed: process.env.OPENAI_EMBED_API_KEY || process.env.OPENAI_API_KEY || '',
  openai_embed_base: process.env.OPENAI_EMBED_BASE_URL || '',
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openai_embed_model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-large',

  // Claude 配置
  claude: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
  claude_model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',

  // Grok 配置
  grok: process.env.XAI_API_KEY || process.env.GROK_API_KEY || '',
  grok_model: process.env.GROK_MODEL || 'grok-2-latest',
  grok_base: process.env.GROK_BASE || 'https://api.x.ai/v1',

  // 智谱AI配置 - 支持多种配置方式
  // 方式1: 使用 BIGMODEL_KEY_1~4 单独配置
  // 方式2: 使用 BIGMODEL_KEYS 逗号分隔配置
  // 方式3: 使用单个 BIGMODEL_API_KEY
  bigmodel_keys: (() => {
    const keys: string[] = []

    // 尝试从 BIGMODEL_KEYS (逗号分隔) 读取
    if (process.env.BIGMODEL_KEYS) {
      keys.push(...process.env.BIGMODEL_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0))
    }

    // 尝试从 BIGMODEL_KEY_1~4 读取
    for (let i = 1; i <= 4; i++) {
      const key = process.env[`BIGMODEL_KEY_${i}`]
      if (key && key.length > 0) {
        keys.push(key)
      }
    }

    // 尝试从 BIGMODEL_API_KEY 读取
    if (process.env.BIGMODEL_API_KEY) {
      keys.push(process.env.BIGMODEL_API_KEY)
    }

    // 去重
    const uniqueKeys = [...new Set(keys)]

    if (uniqueKeys.length === 0) {
      console.warn('[env] WARNING: No BigModel API keys found in environment variables')
      console.warn('[env] Please set BIGMODEL_KEY_1~4 or BIGMODEL_KEYS or BIGMODEL_API_KEY')
    } else {
      console.log(`[env] Loaded ${uniqueKeys.length} BigModel API key(s)`)
    }

    return uniqueKeys
  })(),
  bigmodel_model: process.env.BIGMODEL_MODEL || 'glm-4.7',
  bigmodel_base: process.env.BIGMODEL_BASE || 'https://open.bigmodel.cn/api/anthropic',

  // Ollama 配置
  ollama: {
    model: process.env.OLLAMA_MODEL || 'phi3',
    embedModel: process.env.OLLAMA_EMBED_MODEL || '',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  },

  // LLM 参数
  temp: parseNumber(process.env.LLM_TEMP, 1),
  max_tokens: parseNumber(process.env.LLM_MAXTOK || process.env.LLM_MAX_TOKENS, 8000),

  // TTS 配置
  tts_provider: process.env.TTS_PROVIDER || 'edge',
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  tts_voice_edge: process.env.TTS_VOICE_EDGE || 'en-US-AvaNeural',
  tts_voice_alt_edge: process.env.TTS_VOICE_ALT_EDGE || 'en-US-AndrewNeural',
  eleven_api_key: process.env.ELEVEN_API_KEY || '',
  eleven_voice_a: process.env.ELEVEN_VOICE_A || '',
  eleven_voice_b: process.env.ELEVEN_VOICE_B || '',
  google_creds: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  tts_voice_google: process.env.TTS_VOICE_GOOGLE || 'en-US-Neural2-F',
  tts_voice_alt_google: process.env.TTS_VOICE_ALT_GOOGLE || 'en-US-Neural2-D',

  // 转录配置
  transcription_provider: process.env.TRANSCRIPTION_PROVIDER || 'openai',
  assemblyai_api_key: process.env.ASSEMBLYAI_API_KEY || '',
  google_project_id: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
}

// 配置验证和警告
if (config.provider === 'bigmodel' && config.bigmodel_keys.length === 0) {
  console.error('[env] ERROR: LLM_PROVIDER is set to "bigmodel" but no API keys are configured!')
  console.error('[env] The application will not be able to generate AI responses.')
}

if (config.embeddings_provider === 'gemini' && !config.gemini) {
  console.warn('[env] WARNING: EMB_PROVIDER is set to "gemini" but GOOGLE_API_KEY is not set!')
  console.warn('[env] Embeddings functionality may not work correctly.')
}

// 导出调试信息函数
export function getEnvDebugInfo() {
  return {
    envLoaded,
    loadedFromPath,
    searchedPaths: possibleEnvPaths,
    provider: config.provider,
    bigmodelKeyCount: config.bigmodel_keys.length,
    hasGeminiKey: !!config.gemini,
    hasOpenAIKey: !!config.openai,
    hasClaudeKey: !!config.claude,
  }
}

// 如果启用调试模式，打印配置摘要
if (process.env.DEBUG_ENV === 'true') {
  console.log('[env:debug] Configuration summary:')
  console.log('  - Provider:', config.provider)
  console.log('  - Embeddings Provider:', config.embeddings_provider)
  console.log('  - BigModel Keys:', config.bigmodel_keys.length)
  console.log('  - Port:', config.port)
  console.log('  - DB Mode:', config.db_mode)
}

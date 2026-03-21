/**
 * Environment Configuration Unit Tests
 *
 * Tests for the environment configuration module including:
 * - Environment variable parsing
 * - Default value handling
 * - Configuration validation
 * - Multiple provider key support
 *
 * NOTE: The env module has side effects at import time (reads .env file, initializes config).
 * These tests validate the parseNumber, parseBoolean, parseStringArray helper behaviors
 * and the exported config object using environment variable manipulation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockEnv } from '../../helpers/setup'

// Mock fs module to prevent .env file loading
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  default: {
    existsSync: vi.fn(() => false),
  },
}))

describe('Environment Configuration', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    if (cleanup) {
      cleanup()
      cleanup = undefined
    }
  })

  // -------------------------------------------------------------------------
  // Helper function tests (via config object behavior)
  // -------------------------------------------------------------------------

  describe('parseNumber helper', () => {
    it('should return default value for undefined PORT', async () => {
      cleanup = mockEnv({ PORT: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(5000)
    })

    it('should parse valid number string', async () => {
      cleanup = mockEnv({ PORT: '8080' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(8080)
    })

    it('should return default for NaN input', async () => {
      cleanup = mockEnv({ PORT: 'not-a-number' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(5000)
    })

    it('should handle zero correctly', async () => {
      cleanup = mockEnv({ PORT: '0' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(0)
    })

    it('should parse timeout as number', async () => {
      cleanup = mockEnv({ TIMEOUT: '30000', VITE_TIMEOUT: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.timeout).toBe(30000)
    })
  })

  describe('parseBoolean helper (via module behavior)', () => {
    it('should parse "true" string as truthy via debug mode', async () => {
      cleanup = mockEnv({ DEBUG_ENV: 'true' })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.resetModules()
      await import('../../../src/config/env')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[env:debug]'))
      consoleSpy.mockRestore()
    })

    it('should not log debug info when DEBUG_ENV is false', async () => {
      cleanup = mockEnv({ DEBUG_ENV: 'false' })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.resetModules()
      await import('../../../src/config/env')
      const debugCalls = consoleSpy.mock.calls.filter(
        args => String(args[0]).includes('[env:debug] Configuration summary')
      )
      expect(debugCalls.length).toBe(0)
      consoleSpy.mockRestore()
    })
  })

  describe('parseStringArray helper (bigmodel_keys)', () => {
    it('should return empty array when no keys configured', async () => {
      cleanup = mockEnv({
        BIGMODEL_KEYS: undefined as any,
        BIGMODEL_KEY_1: undefined as any,
        BIGMODEL_KEY_2: undefined as any,
        BIGMODEL_KEY_3: undefined as any,
        BIGMODEL_KEY_4: undefined as any,
        BIGMODEL_API_KEY: undefined as any,
      })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(Array.isArray(config.bigmodel_keys)).toBe(true)
    })

    it('should parse comma-separated BIGMODEL_KEYS', async () => {
      cleanup = mockEnv({ BIGMODEL_KEYS: 'key1,key2,key3' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toContain('key1')
      expect(config.bigmodel_keys).toContain('key2')
      expect(config.bigmodel_keys).toContain('key3')
    })

    it('should trim whitespace from array items', async () => {
      cleanup = mockEnv({ BIGMODEL_KEYS: ' key1 , key2 , key3 ' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toContain('key1')
      expect(config.bigmodel_keys).not.toContain(' key1 ')
    })

    it('should filter out empty strings from BIGMODEL_KEYS', async () => {
      cleanup = mockEnv({ BIGMODEL_KEYS: 'key1,,key2,,,key3' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys.length).toBe(3)
    })
  })

  describe('BigModel key configuration', () => {
    it('should support BIGMODEL_KEYS comma-separated format', async () => {
      cleanup = mockEnv({ BIGMODEL_KEYS: 'key-a,key-b,key-c' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toHaveLength(3)
      expect(config.bigmodel_keys).toEqual(['key-a', 'key-b', 'key-c'])
    })

    it('should support BIGMODEL_KEY_1 to BIGMODEL_KEY_4 format', async () => {
      cleanup = mockEnv({
        BIGMODEL_KEY_1: 'key-1',
        BIGMODEL_KEY_2: 'key-2',
        BIGMODEL_KEY_3: 'key-3',
        BIGMODEL_KEY_4: 'key-4',
      })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toContain('key-1')
      expect(config.bigmodel_keys).toContain('key-2')
      expect(config.bigmodel_keys).toContain('key-3')
      expect(config.bigmodel_keys).toContain('key-4')
    })

    it('should support BIGMODEL_API_KEY single key format', async () => {
      cleanup = mockEnv({ BIGMODEL_API_KEY: 'single-key' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toContain('single-key')
    })

    it('should deduplicate keys from multiple sources', async () => {
      cleanup = mockEnv({
        BIGMODEL_KEYS: 'shared-key,unique-1',
        BIGMODEL_KEY_1: 'shared-key',
        BIGMODEL_KEY_2: 'unique-2',
        BIGMODEL_API_KEY: 'shared-key',
      })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      // shared-key should appear only once after deduplication
      const sharedKeyCount = config.bigmodel_keys.filter((k: string) => k === 'shared-key').length
      expect(sharedKeyCount).toBe(1)
    })

    it('should handle empty key list gracefully', async () => {
      cleanup = mockEnv({
        BIGMODEL_KEYS: undefined as any,
        BIGMODEL_KEY_1: undefined as any,
        BIGMODEL_API_KEY: undefined as any,
      })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_keys).toEqual([])
    })
  })

  describe('LLM provider configuration', () => {
    it('should default to bigmodel provider', async () => {
      cleanup = mockEnv({ LLM_PROVIDER: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.provider).toBe('bigmodel')
    })

    it('should read LLM_PROVIDER from env', async () => {
      cleanup = mockEnv({ LLM_PROVIDER: 'openai' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.provider).toBe('openai')
    })

    it('should support gemini provider', async () => {
      cleanup = mockEnv({ LLM_PROVIDER: 'gemini' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.provider).toBe('gemini')
    })

    it('should support claude provider', async () => {
      cleanup = mockEnv({ LLM_PROVIDER: 'claude' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.provider).toBe('claude')
    })

    it('should support ollama provider', async () => {
      cleanup = mockEnv({ LLM_PROVIDER: 'ollama' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.provider).toBe('ollama')
    })
  })

  describe('Embeddings provider configuration', () => {
    it('should default to gemini embeddings provider', async () => {
      cleanup = mockEnv({ EMB_PROVIDER: undefined as any, EMBEDDINGS_PROVIDER: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.embeddings_provider).toBe('gemini')
    })

    it('should read EMB_PROVIDER from env', async () => {
      cleanup = mockEnv({ EMB_PROVIDER: 'openai' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.embeddings_provider).toBe('openai')
    })

    it('should support EMBEDDINGS_PROVIDER alias', async () => {
      cleanup = mockEnv({ EMBEDDINGS_PROVIDER: 'ollama', EMB_PROVIDER: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.embeddings_provider).toBe('ollama')
    })
  })

  describe('API key configurations', () => {
    it('should read OpenAI API key', async () => {
      cleanup = mockEnv({ OPENAI_API_KEY: 'sk-test-openai' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.openai).toBe('sk-test-openai')
    })

    it('should read Gemini API key from GOOGLE_API_KEY', async () => {
      cleanup = mockEnv({ GOOGLE_API_KEY: 'gemini-key', GEMINI_API_KEY: undefined as any, gemini: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.gemini).toBe('gemini-key')
    })

    it('should use GOOGLE_API_KEY when GEMINI_API_KEY is also set (GOOGLE_API_KEY takes precedence)', async () => {
      cleanup = mockEnv({ GOOGLE_API_KEY: 'google-key', GEMINI_API_KEY: 'gemini-specific-key', gemini: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      // GOOGLE_API_KEY has precedence over GEMINI_API_KEY in the fallback chain
      expect(config.gemini).toBe('google-key')
    })

    it('should read Claude API key from ANTHROPIC_API_KEY', async () => {
      cleanup = mockEnv({ ANTHROPIC_API_KEY: 'anthropic-key', CLAUDE_API_KEY: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.claude).toBe('anthropic-key')
    })

    it('should support CLAUDE_API_KEY alias', async () => {
      cleanup = mockEnv({ CLAUDE_API_KEY: 'claude-specific-key', ANTHROPIC_API_KEY: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.claude).toBe('claude-specific-key')
    })

    it('should read Grok API key from XAI_API_KEY', async () => {
      cleanup = mockEnv({ XAI_API_KEY: 'xai-key', GROK_API_KEY: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.grok).toBe('xai-key')
    })

    it('should support GROK_API_KEY alias', async () => {
      cleanup = mockEnv({ GROK_API_KEY: 'grok-specific-key', XAI_API_KEY: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.grok).toBe('grok-specific-key')
    })
  })

  describe('Model configuration', () => {
    it('should have default bigmodel model', async () => {
      cleanup = mockEnv({ BIGMODEL_MODEL: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_model).toBe('glm-4.7')
    })

    it('should have default gemini model', async () => {
      cleanup = mockEnv({ GEMINI_MODEL: undefined as any, gemini_model: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.gemini_model).toBe('gemini-1.5-pro')
    })

    it('should have default openai model', async () => {
      cleanup = mockEnv({ OPENAI_MODEL: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.openai_model).toBe('gpt-4o-mini')
    })

    it('should have default claude model', async () => {
      cleanup = mockEnv({ CLAUDE_MODEL: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.claude_model).toBe('claude-3-5-sonnet-latest')
    })

    it('should allow custom BIGMODEL_MODEL selection', async () => {
      cleanup = mockEnv({ BIGMODEL_MODEL: 'glm-4-flash' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.bigmodel_model).toBe('glm-4-flash')
    })

    it('should allow custom OPENAI_MODEL selection', async () => {
      cleanup = mockEnv({ OPENAI_MODEL: 'gpt-4o' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.openai_model).toBe('gpt-4o')
    })
  })

  describe('TTS configuration', () => {
    it('should default to edge TTS provider', async () => {
      cleanup = mockEnv({ TTS_PROVIDER: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.tts_provider).toBe('edge')
    })

    it('should read TTS_PROVIDER from env', async () => {
      cleanup = mockEnv({ TTS_PROVIDER: 'google' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.tts_provider).toBe('google')
    })

    it('should read TTS_VOICE_EDGE from env', async () => {
      cleanup = mockEnv({ TTS_VOICE_EDGE: 'en-GB-SoniaNeural' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.tts_voice_edge).toBe('en-GB-SoniaNeural')
    })

    it('should have default voice for edge provider', async () => {
      cleanup = mockEnv({ TTS_VOICE_EDGE: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.tts_voice_edge).toBe('en-US-AvaNeural')
    })
  })

  describe('Transcription configuration', () => {
    it('should default to openai transcription provider', async () => {
      cleanup = mockEnv({ TRANSCRIPTION_PROVIDER: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.transcription_provider).toBe('openai')
    })

    it('should support alternative providers', async () => {
      cleanup = mockEnv({ TRANSCRIPTION_PROVIDER: 'google' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.transcription_provider).toBe('google')
    })

    it('should support assemblyai provider', async () => {
      cleanup = mockEnv({ TRANSCRIPTION_PROVIDER: 'assemblyai' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.transcription_provider).toBe('assemblyai')
    })
  })

  describe('Database configuration', () => {
    it('should default to json database mode', async () => {
      cleanup = mockEnv({ db_mode: undefined as any, DB_MODE: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      // In test environment, db_mode is set to 'json' by setup.ts beforeAll
      expect(config.db_mode).toBe('json')
    })

    it('should read DB_MODE from env', async () => {
      cleanup = mockEnv({ DB_MODE: 'sqlite', db_mode: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.db_mode).toBe('sqlite')
    })

    it('should support db_mode lowercase alias', async () => {
      cleanup = mockEnv({ db_mode: 'postgres', DB_MODE: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.db_mode).toBe('postgres')
    })
  })

  describe('Server configuration', () => {
    it('should have default port of 5000', async () => {
      cleanup = mockEnv({ PORT: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(5000)
    })

    it('should read PORT from env', async () => {
      cleanup = mockEnv({ PORT: '3000' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.port).toBe(3000)
    })

    it('should have default timeout of 90000ms', async () => {
      cleanup = mockEnv({ VITE_TIMEOUT: undefined as any, TIMEOUT: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.timeout).toBe(90000)
    })

    it('should read TIMEOUT from env', async () => {
      cleanup = mockEnv({ TIMEOUT: '60000', VITE_TIMEOUT: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.timeout).toBe(60000)
    })
  })

  describe('getEnvDebugInfo', () => {
    it('should return object with required debug properties', async () => {
      cleanup = mockEnv({ BIGMODEL_API_KEY: 'test-key' })
      vi.resetModules()
      const { getEnvDebugInfo } = await import('../../../src/config/env')
      const debugInfo = getEnvDebugInfo()

      expect(debugInfo).toHaveProperty('envLoaded')
      expect(debugInfo).toHaveProperty('searchedPaths')
      expect(debugInfo).toHaveProperty('provider')
      expect(debugInfo).toHaveProperty('bigmodelKeyCount')
      expect(debugInfo).toHaveProperty('hasGeminiKey')
      expect(debugInfo).toHaveProperty('hasOpenAIKey')
      expect(debugInfo).toHaveProperty('hasClaudeKey')
    })

    it('should reflect hasGeminiKey correctly', async () => {
      cleanup = mockEnv({ GOOGLE_API_KEY: 'gemini-key' })
      vi.resetModules()
      const { getEnvDebugInfo } = await import('../../../src/config/env')
      const debugInfo = getEnvDebugInfo()
      expect(debugInfo.hasGeminiKey).toBe(true)
    })

    it('should reflect hasOpenAIKey correctly', async () => {
      cleanup = mockEnv({ OPENAI_API_KEY: 'openai-key' })
      vi.resetModules()
      const { getEnvDebugInfo } = await import('../../../src/config/env')
      const debugInfo = getEnvDebugInfo()
      expect(debugInfo.hasOpenAIKey).toBe(true)
    })

    it('should reflect hasClaudeKey correctly', async () => {
      cleanup = mockEnv({ ANTHROPIC_API_KEY: 'claude-key' })
      vi.resetModules()
      const { getEnvDebugInfo } = await import('../../../src/config/env')
      const debugInfo = getEnvDebugInfo()
      expect(debugInfo.hasClaudeKey).toBe(true)
    })
  })

  describe('Configuration warnings', () => {
    it('should warn when bigmodel provider is selected but no keys configured', async () => {
      cleanup = mockEnv({
        LLM_PROVIDER: 'bigmodel',
        BIGMODEL_KEYS: undefined as any,
        BIGMODEL_KEY_1: undefined as any,
        BIGMODEL_API_KEY: undefined as any,
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.resetModules()
      await import('../../../src/config/env')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'))
      consoleSpy.mockRestore()
    })

    it('should warn when gemini embeddings selected but no gemini key', async () => {
      cleanup = mockEnv({
        EMB_PROVIDER: 'gemini',
        GOOGLE_API_KEY: undefined as any,
        GEMINI_API_KEY: undefined as any,
        gemini: undefined as any,
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.resetModules()
      await import('../../../src/config/env')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING'))
      consoleSpy.mockRestore()
    })
  })

  describe('Ollama configuration', () => {
    it('should have default Ollama settings', async () => {
      cleanup = mockEnv({
        OLLAMA_MODEL: undefined as any,
        OLLAMA_EMBED_MODEL: undefined as any,
        OLLAMA_BASE_URL: undefined as any,
      })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.ollama).toEqual({
        model: 'phi3',
        embedModel: '',
        baseUrl: 'http://localhost:11434',
      })
    })

    it('should allow custom Ollama model', async () => {
      cleanup = mockEnv({ OLLAMA_MODEL: 'llama2' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.ollama.model).toBe('llama2')
    })

    it('should allow custom Ollama embed model', async () => {
      cleanup = mockEnv({ OLLAMA_EMBED_MODEL: 'nomic-embed-text' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.ollama.embedModel).toBe('nomic-embed-text')
    })

    it('should allow custom Ollama base URL', async () => {
      cleanup = mockEnv({ OLLAMA_BASE_URL: 'http://custom:11434' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.ollama.baseUrl).toBe('http://custom:11434')
    })
  })

  describe('LLM parameters', () => {
    it('should have default temperature of 1', async () => {
      cleanup = mockEnv({ LLM_TEMP: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.temp).toBe(1)
    })

    it('should read LLM_TEMP from env', async () => {
      cleanup = mockEnv({ LLM_TEMP: '0.7' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.temp).toBe(0.7)
    })

    it('should have default max tokens of 8000', async () => {
      cleanup = mockEnv({ LLM_MAXTOK: undefined as any, LLM_MAX_TOKENS: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.max_tokens).toBe(8000)
    })

    it('should read LLM_MAXTOK from env', async () => {
      cleanup = mockEnv({ LLM_MAXTOK: '4000' })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.max_tokens).toBe(4000)
    })

    it('should support LLM_MAX_TOKENS alias', async () => {
      cleanup = mockEnv({ LLM_MAX_TOKENS: '2000', LLM_MAXTOK: undefined as any })
      vi.resetModules()
      const { config } = await import('../../../src/config/env')
      expect(config.max_tokens).toBe(2000)
    })
  })
})

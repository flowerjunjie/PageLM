import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks must be declared before any imports that use them.
// vi.mock is hoisted to the top of the file, so no top-level variable
// references inside the factory are allowed.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('../../../src/utils/llm/llm', () => ({
  default: {
    invoke: vi.fn(),
  },
}))

vi.mock('../../../src/utils/text/normalize', () => ({
  normalizeTopic: vi.fn((topic: unknown) => {
    if (topic == null) return ''
    if (typeof topic === 'string') return topic.trim()
    return String(topic)
  }),
}))

import llm from '../../../src/utils/llm/llm'
import { handleQuiz, type QuizItem } from '../../../src/services/quiz/index'

const mockInvoke = vi.mocked(llm.invoke)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeQuizItems(count = 5): QuizItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1} about the topic?`,
    options: [`A) Option A${i}`, `B) Option B${i}`, `C) Option C${i}`, `D) Option D${i}`],
    correct: ((i % 4) + 1) as 1 | 2 | 3 | 4,
    hint: `Hint for ${i + 1}`,
    explanation: `Explanation for question ${i + 1}`,
  }))
}

function jsonResponse(items: QuizItem[]): string {
  return JSON.stringify(items)
}

describe('QuizService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // handleQuiz – happy path
  // ─────────────────────────────────────────────────────────────────────────────
  describe('handleQuiz – success cases', () => {
    it('should return exactly 5 QuizItems on a valid JSON response', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('basic math')

      expect(result).toHaveLength(5)
    })

    it('each item should have id, question, options, correct, hint, explanation', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('history')

      result.forEach((q, i) => {
        expect(q).toHaveProperty('id', i + 1)
        expect(q).toHaveProperty('question')
        expect(q).toHaveProperty('options')
        expect(q).toHaveProperty('correct')
        expect(q).toHaveProperty('hint')
        expect(q).toHaveProperty('explanation')
      })
    })

    it('each item should have exactly 4 options', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('science')

      result.forEach(q => {
        expect(q.options).toHaveLength(4)
      })
    })

    it('each correct value should be between 1 and 4 (inclusive)', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('geography')

      result.forEach(q => {
        expect(q.correct).toBeGreaterThanOrEqual(1)
        expect(q.correct).toBeLessThanOrEqual(4)
      })
    })

    it('should strip markdown code fences from the response', async () => {
      const items = makeQuizItems(5)
      mockInvoke.mockResolvedValue(`\`\`\`json\n${JSON.stringify(items)}\n\`\`\``)

      const result = await handleQuiz('chemistry')

      expect(result).toHaveLength(5)
    })

    it('should strip plain ``` fences without language tag', async () => {
      const items = makeQuizItems(5)
      mockInvoke.mockResolvedValue(`\`\`\`\n${JSON.stringify(items)}\n\`\`\``)

      const result = await handleQuiz('physics')

      expect(result).toHaveLength(5)
    })

    it('should trim whitespace from question text', async () => {
      const items = makeQuizItems(5)
      items[0].question = '  What is the answer?  '
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      expect(result[0].question).toBe('What is the answer?')
    })

    it('should cap question text at 160 characters', async () => {
      const items = makeQuizItems(5)
      items[0].question = 'X'.repeat(200)
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      expect(result[0].question.length).toBeLessThanOrEqual(160)
    })

    it('should handle correct as letter string "A"-"D"', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], correct: 'A' as any }
      items[1] = { ...items[1], correct: 'B' as any }
      items[2] = { ...items[2], correct: 'C' as any }
      items[3] = { ...items[3], correct: 'D' as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      expect(result[0].correct).toBe(1)
      expect(result[1].correct).toBe(2)
      expect(result[2].correct).toBe(3)
      expect(result[3].correct).toBe(4)
    })

    it('should handle correct as numeric string "1"-"4"', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], correct: '1' as any }
      items[1] = { ...items[1], correct: '2' as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      expect(result[0].correct).toBe(1)
      expect(result[1].correct).toBe(2)
    })

    it('should clamp out-of-range correct values to 1-4', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], correct: 0 as any }
      items[1] = { ...items[1], correct: 5 as any }
      items[2] = { ...items[2], correct: -1 as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      result.forEach(q => {
        expect(q.correct).toBeGreaterThanOrEqual(1)
        expect(q.correct).toBeLessThanOrEqual(4)
      })
    })

    it('should return exactly 5 items even when LLM returns more than 5', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(10)))

      const result = await handleQuiz('literature')

      expect(result).toHaveLength(5)
    })

    it('should pad to 5 items when LLM returns fewer than 5', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(2)))

      const result = await handleQuiz('test')

      expect(result).toHaveLength(5)
      // All padded items should still be valid
      result.forEach(q => {
        expect(q.options).toHaveLength(4)
        expect(q.correct).toBeGreaterThanOrEqual(1)
        expect(q.correct).toBeLessThanOrEqual(4)
      })
    })

    it('should pad to 5 items when LLM returns an empty array', async () => {
      mockInvoke.mockResolvedValue('[]')

      const result = await handleQuiz('test')

      expect(result).toHaveLength(5)
    })

    it('should handle special characters in the topic', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('test: & < > "quotes" \'single\'')

      expect(result).toHaveLength(5)
    })

    it('should handle unicode characters in questions', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], question: 'What is 🍎 + 🍎?' }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('emoji test')

      expect(result[0].question).toContain('🍎')
    })

    it('should fill missing options up to 4 using placeholder text', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], options: ['A) Only one'] as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      expect(result[0].options).toHaveLength(4)
    })

    it('should deduplicate and trim option text', async () => {
      const items = makeQuizItems(5)
      items[0] = {
        ...items[0],
        options: ['A) Same', 'B) Same', 'C) Different', 'D) Another'] as any,
      }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('test')

      // After deduplication there should still be exactly 4 options
      expect(result[0].options).toHaveLength(4)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // handleQuiz – retry logic
  //
  // The coerce() function gracefully pads any response (including null or empty
  // string) to exactly 5 valid placeholder items.  Therefore handleQuiz only
  // retries when the FIRST parsed result isn't a valid quiz (e.g. LLM returns
  // non-JSON or a JSON object instead of an array).  It only throws when
  // BOTH attempts return something that coerce cannot normalise into a valid
  // 5-item quiz – which cannot happen because coerce always produces 5 items.
  //
  // Accurate observable behaviour:
  //   1. Non-JSON first response → second attempt called → result returned.
  //   2. LLM rejects (throws) → error propagates.
  //   3. null / empty-string response → coerce pads → 5 items returned.
  // ─────────────────────────────────────────────────────────────────────────────
  describe('handleQuiz – retry logic', () => {
    it('should retry with strict prompt when first response is invalid JSON', async () => {
      mockInvoke
        .mockResolvedValueOnce('Not valid JSON at all')
        .mockResolvedValueOnce(jsonResponse(makeQuizItems(5)))

      const result = await handleQuiz('retry test')

      expect(mockInvoke).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(5)
    })

    it('should return 5 placeholder items when both attempts return un-parseable text', async () => {
      // coerce(null) → 5 placeholder items → validQuiz returns true
      mockInvoke.mockResolvedValue('Not valid JSON')

      const result = await handleQuiz('unparseable')

      // Both attempts fail to parse → second attempt runs → coerce(null) pads to 5
      expect(result).toHaveLength(5)
      expect(mockInvoke).toHaveBeenCalledTimes(2)
    })

    it('should return 5 placeholder items when LLM returns null on both attempts', async () => {
      mockInvoke.mockResolvedValue(null as any)

      const result = await handleQuiz('null response')

      expect(result).toHaveLength(5)
      expect(mockInvoke).toHaveBeenCalledTimes(2)
    })

    it('should return 5 placeholder items when LLM returns empty string on both attempts', async () => {
      mockInvoke.mockResolvedValue('')

      const result = await handleQuiz('empty string')

      expect(result).toHaveLength(5)
      expect(mockInvoke).toHaveBeenCalledTimes(2)
    })

    it('should return 5 placeholder items when first response is a JSON object (not array)', async () => {
      // coerce({notAnArray: true}) → arr=[] → padded to 5 valid items → validQuiz passes
      // So the service succeeds on the first attempt without needing a second call.
      mockInvoke.mockResolvedValueOnce('{"notAnArray": true}')

      const result = await handleQuiz('object response')

      expect(result).toHaveLength(5)
      expect(mockInvoke).toHaveBeenCalledTimes(1)
    })

    it('should not make a second call when the first response is a valid 5-item array', async () => {
      mockInvoke.mockResolvedValue(jsonResponse(makeQuizItems(5)))

      await handleQuiz('single attempt')

      expect(mockInvoke).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // handleQuiz – LLM error propagation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('handleQuiz – LLM errors', () => {
    it('should propagate LLM timeout errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Timeout'))

      await expect(handleQuiz('test')).rejects.toThrow()
    })

    it('should propagate LLM network errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'))

      await expect(handleQuiz('test')).rejects.toThrow()
    })

    it('should propagate LLM rate limit errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(handleQuiz('test')).rejects.toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // handleQuiz – coercion edge cases
  // ─────────────────────────────────────────────────────────────────────────────
  describe('handleQuiz – coercion', () => {
    it('should coerce missing question to a placeholder string', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], question: '' as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('coerce test')

      expect(typeof result[0].question).toBe('string')
      expect(result[0].question.length).toBeGreaterThan(0)
    })

    it('should coerce missing hint to a default string', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], hint: '' as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('hint test')

      expect(typeof result[0].hint).toBe('string')
      expect(result[0].hint.length).toBeGreaterThan(0)
    })

    it('should coerce missing explanation to a default string', async () => {
      const items = makeQuizItems(5)
      items[0] = { ...items[0], explanation: '' as any }
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('explanation test')

      expect(typeof result[0].explanation).toBe('string')
      expect(result[0].explanation.length).toBeGreaterThan(0)
    })

    it('should assign sequential ids 1-5 regardless of LLM ids', async () => {
      const items = makeQuizItems(5)
      items.forEach((item, i) => { item.id = (i + 10) as any }) // wrong ids
      mockInvoke.mockResolvedValue(jsonResponse(items))

      const result = await handleQuiz('id test')

      expect(result.map(q => q.id)).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle LLM response with leading/trailing whitespace', async () => {
      const items = makeQuizItems(5)
      mockInvoke.mockResolvedValue(`   \n${JSON.stringify(items)}\n   `)

      const result = await handleQuiz('whitespace test')

      expect(result).toHaveLength(5)
    })
  })
})

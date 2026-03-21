/**
 * Text Normalization Utility Tests
 */

import { describe, it, expect } from 'vitest'
import { normalizeTopic } from '../../../../src/utils/text/normalize'

describe('normalizeTopic', () => {
  // ---------------------------------------------------------------------------
  // String input
  // ---------------------------------------------------------------------------

  it('should trim whitespace from input', () => {
    const result = normalizeTopic('  hello world  ')
    expect(result).toBe('hello world')
  })

  it('should collapse multiple spaces to single space', () => {
    const result = normalizeTopic('hello    world')
    expect(result).toBe('hello world')
  })

  it('should handle empty string', () => {
    const result = normalizeTopic('')
    expect(result).toBe('')
  })

  it('should handle string with only whitespace', () => {
    const result = normalizeTopic('   ')
    expect(result).toBe('')
  })

  it('should preserve valid characters', () => {
    const input = 'What is machine learning?'
    const result = normalizeTopic(input)
    expect(result).toBe(input)
  })

  it('should normalize mixed whitespace (tabs and newlines)', () => {
    const result = normalizeTopic('  hello \t\n  world  ')
    expect(result).toBe('hello world')
  })

  // ---------------------------------------------------------------------------
  // Null / undefined input
  // ---------------------------------------------------------------------------

  it('should handle null input', () => {
    const result = normalizeTopic(null as any)
    expect(result).toBe('')
  })

  it('should handle undefined input', () => {
    const result = normalizeTopic(undefined as any)
    expect(result).toBe('')
  })

  // ---------------------------------------------------------------------------
  // Non-string primitives (falls through to String(input).trim())
  // ---------------------------------------------------------------------------

  it('should convert number input to string', () => {
    const result = normalizeTopic(123 as any)
    expect(result).toBe('123')
  })

  it('should convert boolean true to string', () => {
    const result = normalizeTopic(true as any)
    expect(result).toBe('true')
  })

  it('should convert boolean false to string', () => {
    const result = normalizeTopic(false as any)
    expect(result).toBe('false')
  })

  it('should convert float number to string', () => {
    const result = normalizeTopic(3.14 as any)
    expect(result).toBe('3.14')
  })

  // ---------------------------------------------------------------------------
  // Object input - named property extraction
  // ---------------------------------------------------------------------------

  it('should extract topic property from object', () => {
    const result = normalizeTopic({ topic: 'machine learning' } as any)
    expect(result).toBe('machine learning')
  })

  it('should extract title property when topic is absent', () => {
    const result = normalizeTopic({ title: 'Deep Learning Basics' } as any)
    expect(result).toBe('Deep Learning Basics')
  })

  it('should extract question property when topic and title are absent', () => {
    const result = normalizeTopic({ question: 'What is entropy?' } as any)
    expect(result).toBe('What is entropy?')
  })

  it('should extract query property when topic, title, question are absent', () => {
    const result = normalizeTopic({ query: 'gradient descent' } as any)
    expect(result).toBe('gradient descent')
  })

  it('should extract q property as shorthand query', () => {
    const result = normalizeTopic({ q: 'calculus' } as any)
    expect(result).toBe('calculus')
  })

  it('should extract text property as last named fallback', () => {
    const result = normalizeTopic({ text: 'physics formulas' } as any)
    expect(result).toBe('physics formulas')
  })

  it('should prefer topic over title when both present', () => {
    const result = normalizeTopic({ topic: 'topic-value', title: 'title-value' } as any)
    expect(result).toBe('topic-value')
  })

  it('should prefer title over question when topic is absent', () => {
    const result = normalizeTopic({ title: 'title-value', question: 'question-value' } as any)
    expect(result).toBe('title-value')
  })

  it('should skip whitespace-only string candidate and fall through to JSON.stringify', () => {
    // topic is present but is only whitespace, so candidate.trim() is falsy
    const result = normalizeTopic({ topic: '   ' } as any)
    // Should fall through to JSON.stringify since cand.trim() is empty
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should trim the extracted object property value', () => {
    const result = normalizeTopic({ topic: '  trimmed  ' } as any)
    expect(result).toBe('trimmed')
  })

  // ---------------------------------------------------------------------------
  // Object input - JSON.stringify fallback (no recognized property)
  // ---------------------------------------------------------------------------

  it('should JSON.stringify object when no recognized property exists', () => {
    const obj = { foo: 'bar', baz: 42 }
    const result = normalizeTopic(obj as any)
    expect(result).toBe(JSON.stringify(obj))
  })

  it('should truncate JSON.stringify result to 4000 chars for large objects', () => {
    // Create an object whose JSON representation exceeds 4000 chars
    const largeObj = { data: 'x'.repeat(5000) }
    const result = normalizeTopic(largeObj as any)
    expect(result.length).toBe(4000)
  })

  it('should not truncate JSON.stringify result when exactly 4000 chars', () => {
    // {"data":"..."} overhead is 11 chars ({"data":""}), so payload = 4000 - 11 = 3989
    const payload = 'x'.repeat(3989)
    const obj = { data: payload }
    const json = JSON.stringify(obj)
    expect(json.length).toBe(4000)
    const result = normalizeTopic(obj as any)
    expect(result.length).toBe(4000)
  })

  it('should return String(input) when JSON.stringify throws (circular reference)', () => {
    const circular: any = { name: 'test' }
    circular.self = circular // circular reference causes JSON.stringify to throw
    const result = normalizeTopic(circular as any)
    // Falls back to String(input) which produces "[object Object]"
    expect(result).toBe('[object Object]')
  })

  it('should handle empty object with JSON.stringify fallback', () => {
    const result = normalizeTopic({} as any)
    expect(result).toBe('{}')
  })

  it('should handle array input via JSON.stringify', () => {
    const result = normalizeTopic(['a', 'b', 'c'] as any)
    expect(result).toBe('["a","b","c"]')
  })

  it('should handle non-string candidate (numeric topic) and fall through to JSON', () => {
    // topic exists but is a number, not a string, so it doesn't satisfy
    // typeof cand === "string" check - falls through to JSON.stringify
    const result = normalizeTopic({ topic: 42 } as any)
    expect(typeof result).toBe('string')
    expect(result).toContain('42')
  })
})

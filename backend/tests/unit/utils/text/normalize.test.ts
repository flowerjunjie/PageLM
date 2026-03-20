/**
 * Text Normalization Utility Tests
 */

import { describe, it, expect } from 'vitest'
import { normalizeTopic } from '../../../../src/utils/text/normalize'

describe('normalizeTopic', () => {
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

  it('should convert non-string input to string', () => {
    const result = normalizeTopic(123 as any)
    expect(typeof result).toBe('string')
  })

  it('should handle null input', () => {
    const result = normalizeTopic(null as any)
    expect(result).toBe('')
  })

  it('should handle undefined input', () => {
    const result = normalizeTopic(undefined as any)
    expect(result).toBe('')
  })

  it('should preserve valid characters', () => {
    const input = 'What is machine learning?'
    const result = normalizeTopic(input)
    expect(result).toBe(input)
  })

  it('should normalize mixed whitespace', () => {
    const result = normalizeTopic('  hello \t\n  world  ')
    expect(result).toBe('hello world')
  })
})

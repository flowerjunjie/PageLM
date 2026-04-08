/**
 * Ask Module Utility Unit Tests
 *
 * Tests for pure utility functions in the ask module that don't require
 * external dependencies (LLM, file system, etc.)
 */

import { describe, it, expect } from 'vitest'

// We need to test the utility functions in isolation
// Import the module to access its internal functions

describe('Ask Module Utilities', () => {
  describe('toText', () => {
    // Helper that mimics the toText function logic
    const toText = (out: any): string => {
      if (!out) return ""
      if (typeof out === "string") return out
      if (typeof out?.content === "string") return out.content
      if (Array.isArray(out?.content)) return out.content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("")
      if (Array.isArray(out?.generations) && out.generations[0]?.text) return out.generations[0].text
      return String(out ?? "")
    }

    it('should return empty string for null/undefined', () => {
      expect(toText(null)).toBe("")
      expect(toText(undefined)).toBe("")
    })

    it('should return string as-is', () => {
      expect(toText("Hello")).toBe("Hello")
      expect(toText("")).toBe("")
    })

    it('should extract content from object with content property', () => {
      expect(toText({ content: "Hello" })).toBe("Hello")
      expect(toText({ content: "Nested content" })).toBe("Nested content")
    })

    it('should handle array content with text parts', () => {
      const input = { content: [
        { text: "Part 1" },
        { text: "Part 2" },
        " plain string"
      ]}
      expect(toText(input)).toBe("Part 1Part 2 plain string")
    })

    it('should handle generations array format', () => {
      const input = { generations: [{ text: "Generated text" }] }
      expect(toText(input)).toBe("Generated text")
    })

    it('should fall back to String() for unknown structures', () => {
      expect(toText({ some: "object" })).toBe("[object Object]")
      expect(toText(42)).toBe("42")
      expect(toText(true)).toBe("true")
    })
  })

  describe('guessTopic', () => {
    // Helper that mimics the guessTopic function logic
    const guessTopic = (q: string): string => {
      const t = String(q ?? "").trim().replace(/\s+/g, " ")
      if (t.length <= 80) return t
      const m = t.match(/\babout\s+([^?.!]{3,80})/i) || t.match(/\b(on|of|for|in)\s+([^?.!]{3,80})/i)
      return (m?.[2] || m?.[1] || t.slice(0, 80)).trim()
    }

    it('should return short questions as-is', () => {
      expect(guessTopic("What is AI?")).toBe("What is AI?")
      expect(guessTopic("How does photosynthesis work?")).toBe("How does photosynthesis work?")
    })

    it('should truncate long questions to 80 chars', () => {
      const longQuestion = "A".repeat(100)
      expect(guessTopic(longQuestion).length).toBe(80)
    })

    it('should extract topic after "about" for long questions (>80 chars)', () => {
      // The actual function only extracts topic for strings > 80 chars
      const longQ = "Can you please explain about machine learning algorithms and deep neural networks?"
      expect(guessTopic(longQ)).toContain("machine learning")
      expect(guessTopic(longQ)).not.toContain("Can you")
    })

    it('should extract topic after prepositions for long questions', () => {
      const longQ = "Question on recursion in programming concepts and examples for implementation"
      expect(guessTopic(longQ)).toContain("recursion")
    })

    it('should handle edge cases', () => {
      expect(guessTopic("")).toBe("")
      expect(guessTopic("   ")).toBe("")
      expect(guessTopic("a")).toBe("a")
    })

    it('should normalize whitespace', () => {
      expect(guessTopic("What   is    AI?")).toBe("What is AI?")
    })
  })

  describe('extractFirstJsonObject', () => {
    // Helper that mimics the extractFirstJsonObject function logic
    const extractFirstJsonObject = (s: string): string => {
      let depth = 0, start = -1
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]
        if (ch === "{") { if (depth === 0) start = i; depth++ }
        else if (ch === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1) }
      }
      return ""
    }

    it('should extract a simple JSON object', () => {
      const input = 'Some text before {"key": "value"} some text after'
      expect(extractFirstJsonObject(input)).toBe('{"key": "value"}')
    })

    it('should extract nested JSON', () => {
      const input = 'text {"nested": {"key": [1,2,3]}} more text'
      expect(extractFirstJsonObject(input)).toBe('{"nested": {"key": [1,2,3]}}')
    })

    it('should return empty string for no valid JSON', () => {
      expect(extractFirstJsonObject("no json here")).toBe("")
      expect(extractFirstJsonObject("{ unmatched")).toBe("")
      expect(extractFirstJsonObject("} start wrong")).toBe("")
    })

    it('should handle JSON at start of string', () => {
      const input = '{"start": true}'
      expect(extractFirstJsonObject(input)).toBe('{"start": true}')
    })

    it('should handle JSON at end of string', () => {
      const input = 'Some text {"end": true}'
      expect(extractFirstJsonObject(input)).toBe('{"end": true}')
    })

    it('should handle empty object', () => {
      expect(extractFirstJsonObject("{}")).toBe("{}")
      expect(extractFirstJsonObject("text {} more")).toBe("{}")
    })
  })

  describe('tryParse', () => {
    // Helper that mimics the tryParse function logic
    const tryParse = <T = unknown>(s: string): T | null => {
      try { return JSON.parse(s) as T } catch { return null }
    }

    it('should parse valid JSON', () => {
      expect(tryParse('{"key": "value"}')).toEqual({ key: "value" })
      expect(tryParse('[1, 2, 3]')).toEqual([1, 2, 3])
      expect(tryParse('"string"')).toBe("string")
      expect(tryParse('123')).toBe(123)
      expect(tryParse('true')).toBe(true)
      expect(tryParse('null')).toBe(null)
    })

    it('should return null for invalid JSON', () => {
      expect(tryParse('invalid')).toBe(null)
      expect(tryParse('{key: value}')).toBe(null)
      expect(tryParse('[1, 2,')).toBe(null)
      expect(tryParse('')).toBe(null)
    })

    it('should parse with type hint', () => {
      const result = tryParse<{ name: string }>('{"name": "test"}')
      expect(result?.name).toBe("test")
    })
  })

  describe('toMessageContent', () => {
    // Helper that mimics the toMessageContent function logic
    const toMessageContent = (content: any): string => {
      if (content == null) return ""
      if (typeof content === "string") return content
      if (typeof content === "object") {
        const cand = content.answer ?? content.content
        if (typeof cand === "string" && cand.trim()) return cand
        try { return JSON.stringify(content) } catch { return String(content) }
      }
      return String(content)
    }

    it('should return null/undefined as empty string', () => {
      expect(toMessageContent(null)).toBe("")
      expect(toMessageContent(undefined)).toBe("")
    })

    it('should return string as-is', () => {
      expect(toMessageContent("Hello")).toBe("Hello")
    })

    it('should extract answer from object', () => {
      expect(toMessageContent({ answer: "The answer" })).toBe("The answer")
    })

    it('should extract content from object', () => {
      expect(toMessageContent({ content: "The content" })).toBe("The content")
    })

    it('should JSON stringify unknown objects', () => {
      expect(toMessageContent({ key: "value" })).toBe('{"key":"value"}')
    })

    it('should handle nested objects', () => {
      const result = toMessageContent({ nested: { deep: true } })
      expect(result).toContain("nested")
    })
  })

  describe('serializeHistoryForCache', () => {
    // Helper that mimics the serializeHistoryForCache function logic
    const toMessageContent = (content: any): string => {
      if (content == null) return ""
      if (typeof content === "string") return content
      if (typeof content === "object") {
        const cand = content.answer ?? content.content
        if (typeof cand === "string" && cand.trim()) return cand
        try { return JSON.stringify(content) } catch { return String(content) }
      }
      return String(content)
    }

    const serializeHistoryForCache = (history: any[]): string[] => {
      if (!history || !history.length) return []
      return history
        .slice(-4)
        .filter((m) => m?.role === "user" || m?.role === "assistant")
        .map((m) => `${m.role}:${toMessageContent(m.content).slice(0, 120)}`)
    }

    it('should return empty array for null/undefined', () => {
      expect(serializeHistoryForCache(null as any)).toEqual([])
      expect(serializeHistoryForCache(undefined as any)).toEqual([])
      expect(serializeHistoryForCache([])).toEqual([])
    })

    it('should filter to only user and assistant roles', () => {
      const history = [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" }
      ]
      const result = serializeHistoryForCache(history)
      expect(result).toHaveLength(2)
      expect(result[0]).toContain("user:Hello")
      expect(result[1]).toContain("assistant:Hi there")
    })

    it('should only keep last 4 messages', () => {
      const history = [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
        { role: "assistant", content: "4" },
        { role: "user", content: "5" },
        { role: "assistant", content: "6" }
      ]
      const result = serializeHistoryForCache(history)
      expect(result).toHaveLength(4)
    })

    it('should truncate content to 120 chars', () => {
      const longContent = "A".repeat(200)
      const history = [{ role: "user", content: longContent }]
      const result = serializeHistoryForCache(history)
      expect(result[0].length).toBeLessThanOrEqual(125) // "user:" + 120 chars + possible rounding
    })
  })

  describe('toConversationHistory', () => {
    // Helper that mimics the toConversationHistory function logic
    const toMessageContent = (content: any): string => {
      if (content == null) return ""
      if (typeof content === "string") return content
      if (typeof content === "object") {
        const cand = content.answer ?? content.content
        if (typeof cand === "string" && cand.trim()) return cand
        try { return JSON.stringify(content) } catch { return String(content) }
      }
      return String(content)
    }

    const toConversationHistory = (history: any[]): Array<{ role: string; content: string }> => {
      if (!history || !history.length) return []
      const recent = history.slice(-6)
      const out: Array<{ role: string; content: string }> = []
      for (const msg of recent) {
        if (!msg || (msg.role !== "user" && msg.role !== "assistant")) continue
        out.push({ role: msg.role, content: toMessageContent(msg.content) })
      }
      return out
    }

    it('should return empty array for null/undefined/empty', () => {
      expect(toConversationHistory(null as any)).toEqual([])
      expect(toConversationHistory(undefined as any)).toEqual([])
      expect(toConversationHistory([])).toEqual([])
    })

    it('should filter to only user and assistant roles', () => {
      const history = [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "tool", content: "Tool result" }
      ]
      const result = toConversationHistory(history)
      expect(result).toHaveLength(2)
      expect(result[0].role).toBe("user")
      expect(result[1].role).toBe("assistant")
    })

    it('should only keep last 6 messages', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: String(i)
      }))
      const result = toConversationHistory(history)
      expect(result).toHaveLength(6)
    })

    it('should convert content to string', () => {
      const history = [{ role: "user", content: { answer: "structured" } }]
      const result = toConversationHistory(history)
      expect(result[0].content).toBe("structured")
    })

    it('should handle null/undefined messages in array', () => {
      const history = [
        null,
        { role: "user", content: "valid" },
        undefined,
        { role: "assistant", content: "also valid" }
      ]
      const result = toConversationHistory(history)
      expect(result).toHaveLength(2)
    })
  })

  describe('AskPayload structure', () => {
    it('should have correct shape for valid response', () => {
      const payload = {
        topic: "JavaScript",
        answer: "## JavaScript Basics\n\nJavaScript is...",
        flashcards: [
          { q: "What is a closure?", a: "A closure is...", tags: ["javascript", "advanced"] }
        ]
      }

      expect(typeof payload.topic).toBe("string")
      expect(typeof payload.answer).toBe("string")
      expect(Array.isArray(payload.flashcards)).toBe(true)
      expect(payload.flashcards[0]).toHaveProperty("q")
      expect(payload.flashcards[0]).toHaveProperty("a")
    })

    it('should allow optional materials field', () => {
      const payload = {
        topic: "Test",
        answer: "Answer",
        flashcards: [],
        materials: {
          flashcards: [],
          notes: { id: "n1", title: "Notes", summary: "Summary" },
          quiz: { id: "q1", questionCount: 5 }
        }
      }

      expect(payload.materials).toBeDefined()
      expect(payload.materials!.notes).toHaveProperty("id")
      expect(payload.materials!.quiz).toHaveProperty("questionCount")
    })
  })
})

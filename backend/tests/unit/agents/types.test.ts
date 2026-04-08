/**
 * Agent Types Unit Tests
 *
 * Tests for agent type definitions and type guards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import types directly for type testing
import type {
  MsgRole,
  Msg,
  Ctx,
  ToolIO,
  Agent,
  PlanStep,
  Plan,
  Route,
  ActOut,
  ReflectOut,
  Turn,
  ExecStep,
  ExecPlan,
  ExecIn,
  ExecOut,
} from '../../../../src/agents/types'

describe('Agent Types', () => {
  describe('MsgRole', () => {
    it('should accept valid roles', () => {
      const roles: MsgRole[] = ['system', 'user', 'assistant']
      roles.forEach(role => {
        expect(['system', 'user', 'assistant']).toContain(role)
      })
    })

    it('should define message structure', () => {
      const msg: Msg = {
        role: 'user',
        content: 'Hello, agent!',
      }
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('Hello, agent!')
    })
  })

  describe('Ctx (Context)', () => {
    it('should accept optional namespace', () => {
      const ctx: Ctx = { ns: 'chat-123' }
      expect(ctx.ns).toBe('chat-123')
    })

    it('should accept optional session id', () => {
      const ctx: Ctx = { sid: 'session-456' }
      expect(ctx.sid).toBe('session-456')
    })

    it('should accept memory record', () => {
      const ctx: Ctx = {
        mem: {
          lastTopic: 'math',
          preferences: { lang: 'en' },
        },
      }
      expect(ctx.mem?.lastTopic).toBe('math')
    })

    it('should allow all fields to be optional', () => {
      const ctx: Ctx = {}
      expect(ctx.ns).toBeUndefined()
      expect(ctx.sid).toBeUndefined()
      expect(ctx.mem).toBeUndefined()
    })
  })

  describe('ToolIO', () => {
    it('should define tool with name, description, and schema', () => {
      const tool: ToolIO = {
        name: 'calculator',
        desc: 'Performs mathematical calculations',
        schema: { type: 'object', properties: { a: { type: 'number' } } },
        run: async (input: any) => input.a * 2,
      }
      expect(tool.name).toBe('calculator')
      expect(tool.desc).toBe('Performs mathematical calculations')
    })

    it('should support async tool execution', async () => {
      const tool: ToolIO = {
        name: 'asyncTool',
        desc: 'An async tool',
        schema: {},
        run: async (input: any) => {
          return new Promise(resolve => setTimeout(() => resolve(input.value * 2), 10))
        },
      }
      const result = await tool.run({ value: 5 })
      expect(result).toBe(10)
    })
  })

  describe('Agent', () => {
    it('should define agent with id, name, system prompt, and tools', () => {
      const agent: Agent = {
        id: 'agent-001',
        name: 'Math Tutor',
        sys: 'You are a helpful math tutor.',
        tools: [],
      }
      expect(agent.id).toBe('agent-001')
      expect(agent.name).toBe('Math Tutor')
      expect(agent.sys).toBe('You are a helpful math tutor.')
    })

    it('should associate tools with agent', () => {
      const tool: ToolIO = {
        name: 'calculate',
        desc: 'Calculate',
        schema: {},
        run: async () => 42,
      }
      const agent: Agent = {
        id: 'agent-002',
        name: 'Calculator Agent',
        sys: 'You calculate things.',
        tools: [tool],
      }
      expect(agent.tools).toHaveLength(1)
      expect(agent.tools[0].name).toBe('calculate')
    })
  })

  describe('Plan and PlanStep', () => {
    it('should define plan with steps', () => {
      const step: PlanStep = {
        tool: 'search',
        input: { query: 'What is AI?' },
      }
      const plan: Plan = {
        steps: [step],
      }
      expect(plan.steps).toHaveLength(1)
      expect(plan.steps[0].tool).toBe('search')
    })

    it('should support multiple steps', () => {
      const plan: Plan = {
        steps: [
          { tool: 'search', input: { query: 'AI' } },
          { tool: 'summarize', input: { text: 'AI is...' } },
          { tool: 'quiz', input: { topic: 'AI' } },
        ],
      }
      expect(plan.steps).toHaveLength(3)
    })
  })

  describe('Route', () => {
    it('should define route with tool and input', () => {
      const route: Route = {
        tool: 'ask',
        input: { question: 'What is 2+2?' },
      }
      expect(route.tool).toBe('ask')
      expect(route.input.question).toBe('What is 2+2?')
    })
  })

  describe('ActOut (Action Output)', () => {
    it('should contain output and optional raw data', () => {
      const output: ActOut = {
        output: 'The answer is 4',
        raw: { model: 'gpt-4', confidence: 0.95 },
      }
      expect(output.output).toBe('The answer is 4')
      expect(output.raw?.model).toBe('gpt-4')
    })

    it('should work without raw field', () => {
      const output: ActOut = {
        output: 'Simple result',
      }
      expect(output.output).toBe('Simple result')
      expect(output.raw).toBeUndefined()
    })
  })

  describe('ReflectOut (Reflection Output)', () => {
    it('should indicate success', () => {
      const reflection: ReflectOut = {
        ok: true,
      }
      expect(reflection.ok).toBe(true)
      expect(reflection.fix).toBeUndefined()
    })

    it('should indicate failure with fix suggestion', () => {
      const reflection: ReflectOut = {
        ok: false,
        fix: { tool: 'retry', input: { attempt: 2 } },
      }
      expect(reflection.ok).toBe(false)
      expect(reflection.fix?.tool).toBe('retry')
    })
  })

  describe('Turn', () => {
    it('should contain messages and context', () => {
      const turn: Turn = {
        msgs: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        ctx: { ns: 'chat-123' },
      }
      expect(turn.msgs).toHaveLength(2)
      expect(turn.ctx.ns).toBe('chat-123')
    })
  })

  describe('Execution Types', () => {
    it('should define execution step', () => {
      const step: ExecStep = {
        tool: 'ask',
        input: { question: 'What is AI?' },
        timeoutMs: 30000,
        retries: 3,
      }
      expect(step.tool).toBe('ask')
      expect(step.timeoutMs).toBe(30000)
      expect(step.retries).toBe(3)
    })

    it('should define execution plan with steps', () => {
      const execPlan: ExecPlan = {
        steps: [
          { tool: 'search', input: { query: 'AI' } },
          { tool: 'ask', input: { question: 'Summarize' } },
        ],
      }
      expect(execPlan.steps).toHaveLength(2)
    })

    it('should define execution input', () => {
      const execIn: ExecIn = {
        agent: 'research-agent',
        plan: { steps: [{ tool: 'search', input: { query: 'AI' } }] },
        ctx: { ns: 'research-001' },
      }
      expect(execIn.agent).toBe('research-agent')
      expect(execIn.ctx?.ns).toBe('research-001')
    })

    it('should define execution output', () => {
      const execOut: ExecOut = {
        trace: [
          { tool: 'search', result: 'AI results...' },
          { tool: 'ask', result: 'AI is...' },
        ],
        result: { summary: 'AI is artificial intelligence' },
        threadId: 'thread-123',
      }
      expect(execOut.trace).toHaveLength(2)
      expect(execOut.result.summary).toBe('AI is artificial intelligence')
      expect(execOut.threadId).toBe('thread-123')
    })
  })
})

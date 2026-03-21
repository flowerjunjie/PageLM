/**
 * LLM Utility Unit Tests
 *
 * Tests for wrapChat() which wraps a LangChain chat model with a
 * standardized invoke/call interface.
 */

import { describe, it, expect, vi } from 'vitest'
import { wrapChat } from '../../../../src/utils/llm/models/util'

describe('wrapChat', () => {
  it('should return an object with invoke and call methods', () => {
    const fakeModel = { invoke: vi.fn() }
    const wrapped = wrapChat(fakeModel)

    expect(wrapped).toHaveProperty('invoke')
    expect(wrapped).toHaveProperty('call')
    expect(typeof wrapped.invoke).toBe('function')
    expect(typeof wrapped.call).toBe('function')
  })

  it('invoke should delegate to model.invoke', async () => {
    const mockResult = { content: 'Hello from AI' }
    const fakeModel = { invoke: vi.fn().mockResolvedValue(mockResult) }
    const wrapped = wrapChat(fakeModel)

    const messages = [{ role: 'user', content: 'Hi' }]
    const result = await wrapped.invoke(messages as any)

    expect(fakeModel.invoke).toHaveBeenCalledWith(messages)
    expect(result).toBe(mockResult)
  })

  it('call should also delegate to model.invoke', async () => {
    const mockResult = { content: 'Response via call' }
    const fakeModel = { invoke: vi.fn().mockResolvedValue(mockResult) }
    const wrapped = wrapChat(fakeModel)

    const messages = [{ role: 'user', content: 'Test' }]
    const result = await wrapped.call(messages as any)

    expect(fakeModel.invoke).toHaveBeenCalledWith(messages)
    expect(result).toBe(mockResult)
  })

  it('invoke and call should both call the same underlying invoke', async () => {
    const fakeModel = { invoke: vi.fn().mockResolvedValue('ok') }
    const wrapped = wrapChat(fakeModel)

    await wrapped.invoke([] as any)
    await wrapped.call([] as any)

    expect(fakeModel.invoke).toHaveBeenCalledTimes(2)
  })

  it('should forward arguments correctly to model.invoke from call', async () => {
    const fakeModel = { invoke: vi.fn().mockResolvedValue(null) }
    const wrapped = wrapChat(fakeModel)

    const messages = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ]
    await wrapped.call(messages as any)

    expect(fakeModel.invoke).toHaveBeenCalledWith(messages)
  })

  it('should propagate errors from model.invoke', async () => {
    const fakeModel = {
      invoke: vi.fn().mockRejectedValue(new Error('API error')),
    }
    const wrapped = wrapChat(fakeModel)

    await expect(wrapped.invoke([] as any)).rejects.toThrow('API error')
  })
})

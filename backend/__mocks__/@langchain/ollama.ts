/**
 * Mock for @langchain/ollama module
 * Used when the package is not installed in the environment
 */

export const ChatOllama = vi.fn().mockImplementation(() => ({
  invoke: vi.fn(),
  stream: vi.fn(),
  bind: vi.fn().mockReturnThis(),
}))

export const OllamaEmbeddings = vi.fn().mockImplementation(() => ({
  embedQuery: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
  embedDocuments: vi.fn().mockResolvedValue([new Array(1536).fill(0)]),
}))
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { makeModels, getNextModel, resetModelIndex } from "../../utils/llm/models"
import { execDirect } from "../../agents/runtime"
import { normalizeTopic } from "../../utils/text/normalize"
import { config } from "../../config/env"
import { generateAllMaterials } from "./learning-materials"
import { saveLearningMaterials } from "../../core/routes/materials"

// 初始化 LLM
let llm: any = null
let llmInitError: Error | null = null

try {
  const models = makeModels()
  llm = models.llm
} catch (error: any) {
  llmInitError = error
  console.error('[ask] Failed to initialize LLM:', error.message)
}

// 重新初始化 LLM（用于模型切换）
function reinitLLM(fallbackModel?: string): void {
  try {
    const models = makeModels(fallbackModel)
    llm = models.llm
    console.log('[ask] LLM reinitialized with new model:', fallbackModel || 'default')
  } catch (error: any) {
    llmInitError = error
    console.error('[ask] Failed to reinitialize LLM:', error.message)
  }
}

// 检查是否应该切换模型
function shouldSwitchToNextModel(error: any): boolean {
  if (!error) return false
  const message = error.message || String(error)
  return message.includes('429') ||
         message.includes('rate limit') ||
         message.includes('quota') ||
         message.includes('额度') ||
         message.includes('TOO_MANY_REQUESTS') ||
         message.includes('resource has been exhausted')
}

export type AskCard = { q: string; a: string; tags?: string[] }
export type LearningMaterialRef = {
  flashcards: { id: string; question: string; answer: string; tags: string[] }[]
  notes: { id: string; title: string; summary: string }
  quiz: { id: string; questionCount: number }
}
export type AskPayload = { topic: string; answer: string; flashcards: AskCard[]; materials?: LearningMaterialRef }

// 错误类型
class LLMError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'LLMError'
  }
}

function toText(out: any): string {
  if (!out) return ""
  if (typeof out === "string") return out
  if (typeof out?.content === "string") return out.content
  if (Array.isArray(out?.content)) return out.content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("")
  if (Array.isArray(out?.generations) && out.generations[0]?.text) return out.generations[0].text
  return String(out ?? "")
}

function guessTopic(q: string): string {
  const t = String(q ?? "").trim().replace(/\s+/g, " ")
  if (t.length <= 80) return t
  const m = t.match(/\babout\s+([^?.!]{3,80})/i) || t.match(/\b(on|of|for|in)\s+([^?.!]{3,80})/i)
  return (m?.[2] || m?.[1] || t.slice(0, 80)).trim()
}

function extractFirstJsonObject(s: string): string {
  let depth = 0, start = -1
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === "{") { if (depth === 0) start = i; depth++ }
    else if (ch === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1) }
  }
  return ""
}

function tryParse<T = unknown>(s: string): T | null {
  try { return JSON.parse(s) as T } catch { return null }
}

// 生成降级回复（当LLM不可用时）
function generateFallbackResponse(question: string, topic: string): AskPayload {
  console.log('[ask] Generating fallback response for:', question.slice(0, 50))
  return {
    topic: topic || "General",
    answer: `## 服务暂时不可用

很抱歉，我们的AI服务目前遇到了一些问题，无法处理您的请求。

**您的提问**: ${question}

### 可能的原因：
1. AI服务提供商暂时不可用
2. API密钥配置问题
3. 网络连接问题

### 建议：
- 请稍后重试
- 如果问题持续存在，请联系管理员检查服务配置

---
*此回复为系统自动生成的降级回复，不包含AI生成的内容。*`,
    flashcards: []
  }
}

export const BASE_SYSTEM_PROMPT = `
IMPORTANT: 你必须用中文（简体）回复所有内容，除非用户明确要求用英文。

Return ONLY a JSON object with this structure:
{
  "topic": "string",
  "answer": "markdown content",
  "flashcards": [{"q": "question", "a": "answer", "tags": ["tag1", "tag2"]}]
}

You are 灵犀, an AI educational assistant（中文AI教育助手）. Provide clear, engaging answers with practical examples in Chinese.
Create flashcards that test understanding, not rote memorization.
[[CORE PEDAGOGICAL PRINCIPLES "START"]]
1. **ANTI-ROTE LEARNING**: Actively discourage memorization without understanding. Always ask "WHY does this work?" and "WHEN would this fail?"
2. **Cognitive Load Theory**: Structure information to minimize extraneous load, optimize intrinsic load
3. **Dual Coding Theory**: Combine verbal and visual representations when possible
4. **Spaced Repetition**: Build content that naturally reinforces key concepts through understanding, not repetition
5. **Transfer Learning**: Always connect new concepts to prior knowledge and broader applications
6. **Metacognitive Awareness**: Help learners understand HOW they're learning, not just WHAT
7. **JOY-DRIVEN LEARNING**: Use humor, surprising connections, and delightful "aha!" moments to make learning memorable and fun
[[CORE PEDAGOGICAL PRINCIPLES "END"]]
[[ADVANCED CONTENT ARCHITECTURE "START"]]
1. **Adaptive Depth Scaling** (0-10 sophistication levels):
   - 0-2: Minimalist clarity (30-80 words) - Essential pattern only
   - 3-4: Conceptual foundation (150-300 words) - Core mechanism + 1 example
   - 5-6: Applied understanding (400-600 words) - Multiple contexts + common mistakes
   - 7-8: Expert integration (700-1000 words) - Edge cases + optimization strategies
   - 9-10: Mastery synthesis (1000+ words) - Cross-domain connections + research frontiers

2. **Multi-Modal Learning Integration**:
   - **Visual Scaffolding**: Use ASCII diagrams, tables, structured layouts
   - **Narrative Flow**: Transform dry facts into compelling stories with tension/resolution
   - **Analogical Reasoning**: Bridge abstract concepts via concrete, relatable analogies (preferably funny or surprising)
   - **Progressive Disclosure**: Layer complexity from simple → nuanced → expert
   - **Fun Factor**: Use pop culture references, memes, jokes, and absurd examples that stick in memory
   - **Surprise Elements**: Include unexpected connections that make learners go "Wait, THAT'S how it works?!"

3. **Enhanced Markdown Sophistication**:
   Use structured templates with visual elements:
   - Difficulty indicators and mental models
   - "Aha moment" sections for key insights
   - Reality vs theory comparisons in tables
   - Common cognitive traps with clear corrections
   - Memory techniques for retention
[[ADVANCED CONTENT ARCHITECTURE "END"]]
[[ADVANCED FLASHCARD SYSTEM "START"]]
**Enhanced Tag System**:
Use sophisticated tags: cognitive_load (reduces mental burden), transfer (connects domains), metacognition (learning awareness), deep (conceptual understanding), surface (essential facts), troubleshoot (diagnostic questions), synthesis (creative combinations), anti_rote (discourages memorization), fun_factor (entertaining examples), curiosity (sparks further exploration), story_driven (narrative-based learning)

**Card Quality Matrix**:
1. **Desirable Difficulty**: Challenging enough to strengthen memory, not frustrating
2. **Elaborative Interrogation**: "Why?" and "How?" questions that build understanding
3. **Interleaving**: Mix different types of knowledge to prevent mechanical responses
4. **Generation Effect**: Questions that require producing answers, not just recognizing them
5. **ANTI-MEMORIZATION**: Never ask for pure recall. Always require reasoning, application, or creative thinking
6. **Fun Challenge**: Include playful scenarios, thought experiments, and "what if" questions that spark curiosity

**Advanced Card Types**:
- **Concept Cards**: Core definitions with elaboration triggers (WHY does this matter?)
- **Application Cards**: "Given X situation, what would you do?" (real-world scenarios)
- **Connection Cards**: "How does X relate to Y?" (surprising links between domains)
- **Troubleshooting Cards**: "If you see symptom X, what's likely wrong?" (detective work)
- **Metacognitive Cards**: "How would you know you truly understand X?" (self-assessment)
- **Scenario Cards**: Fun hypothetical situations that require applying concepts creatively
- **Analogy Cards**: "If X were a [movie/game/food], what would it be and why?"
- **Prediction Cards**: "What would happen if we changed Y in this system?"
- **Story Cards**: "Explain X as if you're telling a story to a friend"
[[ADVANCED FLASHCARD SYSTEM "END"]]
[[SUPERIOR REASONING METHODS "START"]]
1. **Feynman Technique Integration**:
   - Explain simply enough that a curious 12-year-old could follow
   - Identify knowledge gaps and address them explicitly
   - Use analogies that illuminate rather than obscure (bonus points for funny ones!)
   - If you can't explain it simply, you don't understand it well enough yourself

2. **First Principles Thinking**:
   - Break complex topics into fundamental building blocks
   - Question assumptions and conventional wisdom
   - Build understanding from bedrock truth upward

3. **Socratic Method Enhancement**:
   - Embed self-questioning techniques
   - Guide discovery rather than simply presenting information
   - Challenge readers to predict, test, and refine their understanding

4. **Systems Thinking**:
   - Show how concepts fit into larger frameworks
   - Identify feedback loops and emergent properties
   - Connect micro-details to macro-patterns
[[SUPERIOR REASONING METHODS "END"]]
[[CONTEXT AWARENESS & PERSONALIZATION "START"]]
**Conversation Intelligence**:
- Track conceptual progression across the dialogue
- Identify knowledge gaps from previous exchanges
- Build upon established mental models
- Detect and correct misconceptions gently

**Adaptive Explanations**:
- Match vocabulary to demonstrated comprehension level
- Reference previous topics to build coherent knowledge structures
- Escalate complexity based on user engagement signals

**Error Prevention**:
- Anticipate common misunderstandings in the domain
- Provide pre-emptive clarifications for confusing concepts
- Include "sanity checks" and self-validation techniques

**Fun & Engagement Strategies**:
- Start with a hook: "Ever wonder why your phone doesn't explode when..."
- Use conversational tone: "Here's the weird thing about X..."
- Include "plot twists": "But here's where it gets interesting..."
- Create mini-mysteries: "Why do you think X happens before Y?"
- Use rhetorical questions: "What if I told you that X is actually..."
- Add personality: "This concept is like that friend who always..."
- Include failure stories: "Early attempts failed hilariously because..."
[[CONTEXT AWARENESS & PERSONALIZATION "END"]]
[[EXCELLENCE BENCHMARKS "START"]]
**Content Quality**:
- ✅ Deeper conceptual insights with actionable frameworks
- ✅ Multiple explanatory approaches for different learning styles
- ✅ Explicit connections to broader knowledge domains
- ✅ Troubleshooting guides for common implementation problems

**Learning Effectiveness**:
- ✅ Spaced repetition-optimized flashcard sequences
- ✅ Metacognitive skill development embedded naturally
- ✅ Transfer-focused examples spanning multiple contexts
- ✅ Progressive complexity that builds expertise systematically

**User Experience**:
- ✅ Conversation-aware responses that build knowledge coherently
- ✅ Anticipatory explanations that prevent confusion
- ✅ Motivational elements that sustain engagement
- ✅ Self-assessment tools that build learner autonomy
[[EXCELLENCE BENCHMARKS "END"]]
[[EXECUTION REQUIREMENTS "START"]]
- **Clarity**: Every sentence must advance understanding, never just state facts
- **Precision**: Technical accuracy without needless complexity
- **Engagement**: Ideas that stick and inspire further exploration through fun and surprise
- **Practicality**: Actionable insights that translate to real capability
- **Memory**: Content structured for long-term retention through understanding, not drilling
- **ANTI-ROTE MANDATE**: Actively challenge pure memorization. Always include "but why?" moments
- **Joy Factor**: Make learning delightful with humor, surprising connections, and playful examples
- **Curiosity Sparking**: End with questions that make learners want to explore further
[[EXECUTION REQUIREMENTS "END"]]
[[ANTI-ROTE LEARNING MANDATE "START"]]
**NEVER DO THIS (Rote Learning)**:
- "Memorize that X = Y"
- "The formula is..."
- "Remember these 5 steps"
- "The answer is always..."

**ALWAYS DO THIS (Deep Understanding)**:
- "X works like Y because of this underlying principle..."
- "You can derive this formula by thinking about..."
- "These steps make sense when you realize that..."
- "The answer depends on the situation because..."

**FUN EXAMPLE STRATEGIES**:
- Use food analogies ("TCP is like ordering pizza with delivery confirmation")
- Reference pop culture ("This algorithm is basically the sorting hat from Harry Potter")
- Create absurd scenarios ("Imagine you're a time-traveling detective...")
- Use gaming metaphors ("Think of memory management like inventory in an RPG")
- Include surprising connections ("Did you know this math concept is why your GPS works?")
[[ANTI-ROTE LEARNING MANDATE "END"]]
[[ENHANCED EXAMPLE OUTPUT "START"]]
Apply all principles above to create content that demonstrates:
- Multi-layered explanations that build intuition before formulas
- Mental models and analogies (preferably entertaining ones)
- Real-world connections that surprise and delight
- Cognitive load reduction through story-driven presentation
- Metacognitive questions that build learning awareness
- Advanced flashcards that require reasoning, not recall
- Fun examples that stick in memory through humor and surprise
- Explicit challenges to rote memorization with "but why?" moments
[[ENHANCED EXAMPLE OUTPUT "END"]]
[[RESTRICTIONS "START"]]
- Output ONLY the JSON object
- No prose or explanation outside JSON
- No backticks around JSON
- Apply all pedagogical principles seamlessly
- Make every response demonstrably superior to basic Q&A systems
[[RESTRICTIONS "END"]]
`.trim()

const cacheDir = path.join(process.cwd(), "storage", "cache", "ask")
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
const keyOf = (x: any) => crypto.createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex")
const readCache = (k: any) => { const f = path.join(cacheDir, keyOf(k) + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null }
const writeCache = (k: any, v: any) => { const f = path.join(cacheDir, keyOf(k) + ".json"); fs.writeFileSync(f, JSON.stringify(v)) }

type HistoryMessage = { role: string; content: any }

function toMessageContent(content: any): string {
  if (content == null) return ""
  if (typeof content === "string") return content
  if (typeof content === "object") {
    const cand = (content as any).answer ?? (content as any).content
    if (typeof cand === "string" && cand.trim()) return cand
    try { return JSON.stringify(content) } catch { return String(content) }
  }
  return String(content)
}

function serializeHistoryForCache(history?: HistoryMessage[]): string[] {
  if (!history || !history.length) return []
  return history
    .slice(-4)
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => `${m.role}:${toMessageContent(m.content).slice(0, 120)}`)
}

function toConversationHistory(history?: HistoryMessage[]): Array<{ role: string; content: string }> {
  if (!history || !history.length) return []
  const recent = history.slice(-6)
  const out: Array<{ role: string; content: string }> = []
  for (const msg of recent) {
    if (!msg || (msg.role !== "user" && msg.role !== "assistant")) continue
    out.push({ role: msg.role, content: toMessageContent(msg.content) })
  }
  return out
}

// 检查LLM是否可用
function ensureLLM(): void {
  if (llmInitError) {
    throw new LLMError(`LLM初始化失败: ${llmInitError.message}`, llmInitError)
  }
  if (!llm) {
    throw new LLMError('LLM未初始化，请检查配置')
  }
}

type AskWithContextOptions = {
  question: string
  context: string
  topic?: string
  systemPrompt?: string
  history?: HistoryMessage[]
  cacheScope?: string
}

export async function askWithContext(opts: AskWithContextOptions): Promise<AskPayload> {
  const rawQuestion = typeof opts.question === "string" ? opts.question : String(opts.question ?? "")
  const safeQ = normalizeTopic(rawQuestion)
  const ctx = typeof opts.context === "string" && opts.context.trim() ? opts.context : "NO_CONTEXT"
  const topic = typeof opts.topic === "string" && opts.topic.trim()
    ? opts.topic.trim()
    : guessTopic(safeQ) || "General"
  const systemPrompt = opts.systemPrompt?.trim() || BASE_SYSTEM_PROMPT
  const historyArr = Array.isArray(opts.history) ? opts.history : undefined
  const historyCache = serializeHistoryForCache(historyArr)

  const ck = { t: opts.cacheScope || "ask_ctx", q: safeQ, ctx, topic, sys: systemPrompt, hist: historyCache }
  const cached = readCache(ck)
  if (cached) return cached

  // 检查LLM可用性
  try {
    ensureLLM()
  } catch (error: any) {
    console.error('[ask] LLM not available:', error.message)
    // 返回降级回复
    return generateFallbackResponse(safeQ, topic)
  }

  const messages: any[] = [{ role: "system", content: systemPrompt }]
  for (const msg of toConversationHistory(historyArr)) messages.push(msg)

  messages.push({
    role: "user",
    content: `Context:\n${ctx}\n\nQuestion:\n${safeQ}\n\nTopic:\n${topic}\n\nReturn only the JSON object.`
  })

  console.log('[chat] Calling LLM with question:', safeQ.slice(0, 50))
  const llmStart = Date.now()

  try {
    const res = await Promise.race([
      llm.call(messages as any),
      new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout after 60s')), 60000))
    ]) as any

    console.log('[chat] LLM response received in', Date.now() - llmStart, 'ms')
    const draft = toText(res).trim()
    const jsonStr = extractFirstJsonObject(draft) || draft
    const parsed = tryParse<any>(jsonStr)

    const out: AskPayload =
      parsed && typeof parsed === "object"
        ? {
          topic: typeof parsed.topic === "string" ? parsed.topic : topic,
          answer: typeof parsed.answer === "string" ? parsed.answer : "",
          flashcards: Array.isArray(parsed.flashcards) ? (parsed.flashcards as AskCard[]) : [],
        }
        : { topic, answer: draft, flashcards: [] }

    writeCache(ck, out)
    return out
  } catch (error: any) {
    console.error('[chat] LLM call failed:', error.message)

    // 检查是否应该切换到下一个模型
    if (shouldSwitchToNextModel(error)) {
      console.log('[chat] Rate limit detected, trying next model...')
      const nextModel = getNextModel()
      reinitLLM(nextModel)
      // 重新获取 llm 引用，因为 reinitLLM() 更新了模块级别的 llm 变量
      llm = llm
      // 使用新模型重试一次
      try {
        const res = await Promise.race([
          llm.call(messages as any),
          new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout after 60s')), 60000))
        ]) as any
        console.log('[chat] LLM response received with fallback model in', Date.now() - llmStart, 'ms')
        const draft = toText(res).trim()
        const jsonStr = extractFirstJsonObject(draft) || draft
        const parsed = tryParse<any>(jsonStr)
        if (parsed && typeof parsed === "object") {
          const out: AskPayload = {
            topic: typeof parsed.topic === "string" ? parsed.topic : topic,
            answer: typeof parsed.answer === "string" ? parsed.answer : "",
            flashcards: Array.isArray(parsed.flashcards) ? (parsed.flashcards as AskCard[]) : [],
          }
          writeCache(ck, out)
          return out
        }
      } catch (retryError: any) {
        console.error('[chat] Retry with fallback model also failed:', retryError.message)
      }
    }

    // 根据错误类型提供友好的错误消息
    let errorMessage = 'AI服务暂时不可用'
    let shouldFallback = true

    if (error.message?.includes('额度') || error.message?.includes('quota')) {
      errorMessage = 'AI服务额度已用完，请联系管理员充值'
      shouldFallback = true
    } else if (error.message?.includes('认证') || error.message?.includes('auth') || error.message?.includes('401')) {
      errorMessage = 'AI服务认证失败，请检查API配置'
      shouldFallback = true
    } else if (error.message?.includes('timeout') || error.message?.includes('超时')) {
      errorMessage = 'AI服务响应超时，请稍后重试'
      shouldFallback = true
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = '网络连接失败，请检查网络状态'
      shouldFallback = true
    }

    if (shouldFallback) {
      console.log('[chat] Returning fallback response due to error')
      return generateFallbackResponse(safeQ, topic)
    }

    throw new LLMError(errorMessage, error)
  }
}

export async function handleAsk(
  q: string | { q: string; namespace?: string; history?: any[]; chatId?: string },
  ns?: string,
  k = 6,
  historyArg?: any[]
): Promise<AskPayload> {
  if (typeof q === "object" && q !== null) {
    const params = q
    return handleAsk(params.q, params.namespace ?? ns, k, params.history ?? historyArg)
  }

  const questionRaw = typeof q === "string" ? q : String(q ?? "")
  const safeQ = normalizeTopic(questionRaw)
  const nsFinal = typeof ns === "string" && ns.trim() ? ns : "pagelm"

  let ctxDocs: Array<{ text?: string }> = []

  try {
    const rag = await execDirect({
      agent: "researcher",
      plan: { steps: [{ tool: "rag.search", input: { q: safeQ, ns: nsFinal, k }, timeoutMs: 10000, retries: 0 }] },
      ctx: { ns: nsFinal }
    })
    ctxDocs = Array.isArray(rag) ? (rag as Array<{ text?: string }>) : []
  } catch (ragError) {
    // RAG search failed, continue without context
    console.log('[chat] RAG search failed, continuing without context:', ragError)
  }

  const ctx = ctxDocs.map(d => d?.text || "").join("\n\n") || "NO_CONTEXT"
  const topic = guessTopic(safeQ) || "General"

  const result = await askWithContext({
    question: questionRaw,
    context: ctx,
    topic,
    history: historyArg,
    systemPrompt: BASE_SYSTEM_PROMPT,
    cacheScope: `ans:${nsFinal}`
  })

  // Extract chatId from namespace if available
  const chatId = nsFinal.startsWith('chat:') ? nsFinal.slice(5) : undefined

  // Auto-generate learning materials after getting answer
  if (result.answer && chatId) {
    try {
      console.log('[chat] Auto-generating learning materials for chat:', chatId)
      const materials = await generateAllMaterials(safeQ, result.answer)
      const stored = await saveLearningMaterials(chatId, materials)

      // Add materials reference to result
      result.materials = {
        flashcards: materials.flashcards.map(f => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          tags: f.tags
        })),
        notes: {
          id: materials.notes.id,
          title: materials.notes.title,
          summary: materials.notes.summary
        },
        quiz: {
          id: materials.quiz.id,
          questionCount: materials.quiz.questions.length
        }
      }

      console.log(`[chat] Generated materials saved: ${stored.id}`)
    } catch (materialsError: any) {
      // Don't fail the whole request if materials generation fails
      console.error('[chat] Failed to generate learning materials:', materialsError.message)
    }
  }

  return result
}

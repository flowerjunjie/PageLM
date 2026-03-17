import { makeModels } from "../../utils/llm/models"
import { config } from "../../config/env"
import { scheduleReview } from "../../services/spaced-repetition"

// Initialize LLM
let llm: any = null
let llmInitError: Error | null = null

try {
  const models = makeModels()
  llm = models.llm
} catch (error: any) {
  llmInitError = error
  console.error("[learning-materials] Failed to initialize LLM:", error.message)
}

// Types
export interface FlashCard {
  id: string
  question: string
  answer: string
  tags: string[]
  createdAt: number
}

export interface NoteSummary {
  id: string
  title: string
  summary: string
  content: string
  keyPoints: string[]
  examples: string[]
  createdAt: number
}

export interface QuizQuestion {
  id: string
  question: string
  type: "choice" | "short_answer"
  options?: string[]
  correct?: number
  answer?: string
  explanation: string
}

export interface Quiz {
  id: string
  questions: QuizQuestion[]
  createdAt: number
}

export interface LearningMaterials {
  flashcards: FlashCard[]
  notes: NoteSummary
  quiz: Quiz
}

// Utility functions
function toText(out: any): string {
  if (!out) return ""
  if (typeof out === "string") return out
  if (typeof out?.content === "string") return out.content
  if (Array.isArray(out?.content))
    return out.content
      .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
      .join("")
  if (Array.isArray(out?.generations) && out.generations[0]?.text)
    return out.generations[0].text
  return String(out ?? "")
}

function extractFirstJsonObject(s: string): string {
  let depth = 0,
    start = -1
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && start !== -1) return s.slice(start, i + 1)
    }
  }
  return ""
}

function extractJsonArray(s: string): string {
  let depth = 0,
    start = -1
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === "[") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "]") {
      depth--
      if (depth === 0 && start !== -1) return s.slice(start, i + 1)
    }
  }
  return ""
}

function tryParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// LLM helper
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (llmInitError || !llm) {
    throw new Error("LLM not initialized")
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]

  const res = await Promise.race([
    llm.call(messages as any),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LLM timeout after 30s")), 30000)
    ),
  ]) as any

  return toText(res).trim()
}

// Generate flashcards from answer
export async function generateFlashcards(answer: string): Promise<FlashCard[]> {
  const systemPrompt = `
You are an educational AI assistant. Extract 3-5 key knowledge points from the provided content and generate flashcards in Q&A format.

Requirements:
1. Each flashcard should test understanding, not rote memorization
2. Questions should require reasoning or application
3. Answers should be concise but complete
4. Include relevant tags for categorization

Return ONLY a JSON array with this structure:
[
  {
    "question": "string",
    "answer": "string",
    "tags": ["tag1", "tag2"]
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.
`.trim()

  const userPrompt = `Please extract key knowledge points from the following content and generate flashcards:

${answer}

Generate 3-5 flashcards in the specified JSON format.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const jsonStr = extractJsonArray(response) || response
    const parsed = tryParse<Array<{ question: string; answer: string; tags?: string[] }>>(jsonStr)

    if (!Array.isArray(parsed)) {
      console.error("[generateFlashcards] Failed to parse response:", response)
      return []
    }

    const flashcards = parsed.map((item) => ({
      id: generateId(),
      question: item.question,
      answer: item.answer,
      tags: Array.isArray(item.tags) ? item.tags : ["general"],
      createdAt: Date.now(),
    }))

    // Automatically create review schedules for each flashcard
    for (const card of flashcards) {
      await scheduleReview(card.id)
    }

    return flashcards
  } catch (error: any) {
    console.error("[generateFlashcards] Error:", error.message)
    return []
  }
}

// Generate notes summary from answer
export async function generateNotesSummary(answer: string): Promise<NoteSummary> {
  const systemPrompt = `
You are an educational AI assistant. Transform the provided content into a structured study note.

Requirements:
1. Create a clear, descriptive title
2. Write a concise summary (2-3 sentences)
3. Extract 3-5 key points as bullet points
4. Include 1-2 concrete examples if applicable
5. Organize content for easy review and memorization

Return ONLY a JSON object with this structure:
{
  "title": "string",
  "summary": "string",
  "keyPoints": ["point1", "point2", "point3"],
  "examples": ["example1", "example2"]
}

IMPORTANT: Return ONLY the JSON object, no other text.
`.trim()

  const userPrompt = `Please transform the following content into structured study notes:

${answer}

Generate the notes in the specified JSON format.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const jsonStr = extractFirstJsonObject(response) || response
    const parsed = tryParse<{
      title: string
      summary: string
      keyPoints: string[]
      examples?: string[]
    }>(jsonStr)

    if (!parsed) {
      console.error("[generateNotesSummary] Failed to parse response:", response)
      // Fallback: create basic summary
      return {
        id: generateId(),
        title: "学习笔记",
        summary: answer.slice(0, 200) + "...",
        content: answer,
        keyPoints: ["请查看原始内容"],
        examples: [],
        createdAt: Date.now(),
      }
    }

    return {
      id: generateId(),
      title: parsed.title || "学习笔记",
      summary: parsed.summary || "",
      content: answer,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      createdAt: Date.now(),
    }
  } catch (error: any) {
    console.error("[generateNotesSummary] Error:", error.message)
    return {
      id: generateId(),
      title: "学习笔记",
      summary: answer.slice(0, 200) + "...",
      content: answer,
      keyPoints: ["请查看原始内容"],
      examples: [],
      createdAt: Date.now(),
    }
  }
}

// Generate quiz questions from question and answer
export async function generateQuizQuestions(
  question: string,
  answer: string
): Promise<Quiz> {
  const systemPrompt = `
You are an educational AI assistant. Generate 3 quiz questions based on the provided question and answer content.

Requirements:
1. Generate a mix of question types:
   - 2 multiple choice questions (with 4 options each, indicate correct answer index 0-3)
   - 1 short answer question
2. Questions should test understanding and application
3. Include explanations for why answers are correct
4. Make questions challenging but fair

Return ONLY a JSON object with this structure:
{
  "questions": [
    {
      "question": "string",
      "type": "choice",
      "options": ["option1", "option2", "option3", "option4"],
      "correct": 0,
      "explanation": "string"
    },
    {
      "question": "string",
      "type": "short_answer",
      "answer": "string",
      "explanation": "string"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no other text.
`.trim()

  const userPrompt = `Please generate 3 quiz questions based on:

Original Question: ${question}

Answer Content:
${answer}

Generate questions in the specified JSON format.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const jsonStr = extractFirstJsonObject(response) || response
    const parsed = tryParse<{
      questions: Array<{
        question: string
        type: "choice" | "short_answer"
        options?: string[]
        correct?: number
        answer?: string
        explanation: string
      }>
    }>(jsonStr)

    if (!parsed || !Array.isArray(parsed.questions)) {
      console.error("[generateQuizQuestions] Failed to parse response:", response)
      return {
        id: generateId(),
        questions: [],
        createdAt: Date.now(),
      }
    }

    return {
      id: generateId(),
      questions: parsed.questions.map((q) => ({
        id: generateId(),
        question: q.question,
        type: q.type,
        options: q.options,
        correct: q.correct,
        answer: q.answer,
        explanation: q.explanation,
      })),
      createdAt: Date.now(),
    }
  } catch (error: any) {
    console.error("[generateQuizQuestions] Error:", error.message)
    return {
      id: generateId(),
      questions: [],
      createdAt: Date.now(),
    }
  }
}

// Generate all learning materials at once
export async function generateAllMaterials(
  question: string,
  answer: string
): Promise<LearningMaterials> {
  console.log("[learning-materials] Generating materials for:", question.slice(0, 50))

  const [flashcards, notes, quiz] = await Promise.all([
    generateFlashcards(answer),
    generateNotesSummary(answer),
    generateQuizQuestions(question, answer),
  ])

  console.log(
    `[learning-materials] Generated: ${flashcards.length} flashcards, notes, ${quiz.questions.length} quiz questions`
  )

  return {
    flashcards,
    notes,
    quiz,
  }
}

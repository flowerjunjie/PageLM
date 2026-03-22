import db from '../utils/database/keyv'

export type { Subject } from '../types/subject'
import type { Subject } from '../types/subject'

export interface KnowledgeNode {
  id: string
  name: string
  subject: Subject
  learnedAt: number
  reviewCount: number
  x?: number
  y?: number
  size?: number
}

export interface KnowledgeEdge {
  source: string
  target: string
  strength: number
}

export interface LearningStats {
  totalStudyTime: number
  weeklyStudyTime: number
  masteredTopics: number
  totalFlashcards: number
  dueFlashcards: number
  quizAccuracy: number
  quizAccuracyTrend: number
  weeklyFlashcardsReviewed: number
  streakDays: number
}

export interface SubjectStats {
  subject: Subject
  name: string
  color: string
  nodeCount: number
  flashcardCount: number
  quizAccuracy: number
  studyTime: number
}

export interface LearningProfile {
  stats: LearningStats
  subjects: SubjectStats[]
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'quiz' | 'flashcard' | 'note' | 'chat' | 'podcast'
  title: string
  subject?: Subject
  timestamp: number
  metadata?: Record<string, unknown>
}

const SUBJECT_COLORS: Record<Subject, string> = {
  physics: '#3B82F6',
  chemistry: '#22C55E',
  biology: '#F97316',
  math: '#EF4444',
  history: '#8B5CF6',
  english: '#EC4899',
  other: '#6B7280'
}

const SUBJECT_NAMES: Record<Subject, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  math: 'Mathematics',
  history: 'History',
  english: 'English',
  other: 'Other'
}

function detectSubjectFromText(text: string): Subject {
  const lower = text.toLowerCase()
  if (/physics|mechanics|thermodynamics|electricity|magnetism|optics|quantum/.test(lower)) return 'physics'
  if (/chemistry|chemical|reaction|molecule|atom|organic|inorganic/.test(lower)) return 'chemistry'
  if (/biology|cell|organism|genetics|evolution|ecology|anatomy/.test(lower)) return 'biology'
  if (/math|mathematics|algebra|calculus|geometry|statistics|equation/.test(lower)) return 'math'
  if (/history|historical|ancient|medieval|war|revolution|civilization/.test(lower)) return 'history'
  return 'other'
}

function generateKnowledgeNodesFromFlashcards(flashcards: any[]): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = []
  const seen = new Set<string>()

  for (const card of flashcards) {
    const subject = detectSubjectFromText(card.tag || card.question || '')
    const key = `${subject}:${card.tag || 'general'}`

    if (!seen.has(key)) {
      seen.add(key)
      nodes.push({
        id: `node-${nodes.length}`,
        name: card.tag || 'General',
        subject,
        learnedAt: card.created || Date.now(),
        reviewCount: card.repetitions || card.reviewCount || 1
      })
    }
  }

  return nodes
}

function generateEdgesFromNodes(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = []

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]

      if (nodeA.subject === nodeB.subject) {
        edges.push({
          source: nodeA.id,
          target: nodeB.id,
          strength: Math.min(0.9, 0.3 + ((nodeA.reviewCount + nodeB.reviewCount) / 20))
        })
      }
    }
  }

  return edges
}

function calculatePositions(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const subjectGroups: Record<Subject, KnowledgeNode[]> = {
    physics: [], chemistry: [], biology: [], math: [], history: [], english: [], other: []
  }

  for (const node of nodes) {
    subjectGroups[node.subject].push(node)
  }

  const positioned: KnowledgeNode[] = []
  const centerX = 0
  const centerY = 0
  const radius = 300

  const subjects = Object.keys(subjectGroups) as Subject[]
  subjects.forEach((subject, i) => {
    const group = subjectGroups[subject]
    const angleBase = (i / subjects.length) * 2 * Math.PI
    const groupRadius = radius * 0.6

    group.forEach((node, j) => {
      const angle = angleBase + (j / Math.max(group.length, 1)) * 0.5 - 0.25
      const r = groupRadius + Math.random() * 100
      positioned.push({
        ...node,
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        size: 20 + (node.reviewCount || 1) * 5
      })
    })
  })

  return positioned
}

export async function getLearningStats(): Promise<LearningStats> {
  const flashcards = (await db.get('flashcards')) || []
  const chats = (await db.get('chats')) || []
  const quizResults = (await db.get('quiz_results')) || []

  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  const weeklyChats = chats.filter((c: any) => c.createdAt > oneWeekAgo)
  const weeklyStudyTime = weeklyChats.length * 15
  const totalStudyTime = chats.length * 15

  const masteredTopics = new Set(flashcards.map((f: any) => f.tag)).size
  const totalFlashcards = flashcards.length
  const dueFlashcards = flashcards.filter((f: any) => {
    const lastReview = f.lastReviewed || f.created
    const interval = f.interval || 24 * 60 * 60 * 1000
    return lastReview + interval < now
  }).length

  const recentQuizzes = quizResults.filter((q: any) => q.completedAt > oneWeekAgo)
  const correctAnswers = recentQuizzes.reduce((sum: number, q: any) => sum + (q.correctCount || 0), 0)
  const totalAnswers = recentQuizzes.reduce((sum: number, q: any) => sum + (q.totalCount || 0), 0)
  const quizAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

  const previousWeekQuizzes = quizResults.filter((q: any) => {
    return q.completedAt > twoWeeksAgo && q.completedAt <= oneWeekAgo
  })
  const prevCorrect = previousWeekQuizzes.reduce((sum: number, q: any) => sum + (q.correctCount || 0), 0)
  const prevTotal = previousWeekQuizzes.reduce((sum: number, q: any) => sum + (q.totalCount || 0), 0)
  const prevAccuracy = prevTotal > 0 ? Math.round((prevCorrect / prevTotal) * 100) : 0
  const quizAccuracyTrend = quizAccuracy - prevAccuracy

  const dailyActivity = (await db.get('daily_activity')) || {}
  let streakDays = 0
  for (let i = 0; i < 365; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    if (dailyActivity[date]) {
      streakDays++
    } else if (i > 0) {
      break
    }
  }

  return {
    totalStudyTime,
    weeklyStudyTime,
    masteredTopics,
    totalFlashcards,
    dueFlashcards,
    quizAccuracy,
    quizAccuracyTrend,
    weeklyFlashcardsReviewed: flashcards.filter((f: any) => f.lastReviewed && f.lastReviewed > oneWeekAgo).length,
    streakDays
  }
}

export async function getKnowledgeMapData(): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
  const flashcards = (await db.get('flashcards')) || []

  if (flashcards.length === 0) {
    const demoNodes: KnowledgeNode[] = [
      { id: 'n1', name: 'Newton\'s Laws', subject: 'physics', learnedAt: Date.now() - 86400000 * 7, reviewCount: 5, x: -150, y: -100, size: 45 },
      { id: 'n2', name: 'Kinematics', subject: 'physics', learnedAt: Date.now() - 86400000 * 5, reviewCount: 3, x: -100, y: -150, size: 35 },
      { id: 'n3', name: 'Chemical Bonds', subject: 'chemistry', learnedAt: Date.now() - 86400000 * 6, reviewCount: 4, x: 100, y: -120, size: 40 },
      { id: 'n4', name: 'Periodic Table', subject: 'chemistry', learnedAt: Date.now() - 86400000 * 4, reviewCount: 6, x: 150, y: -80, size: 50 },
      { id: 'n5', name: 'Cell Structure', subject: 'biology', learnedAt: Date.now() - 86400000 * 3, reviewCount: 2, x: 80, y: 100, size: 30 },
      { id: 'n6', name: 'DNA Replication', subject: 'biology', learnedAt: Date.now() - 86400000 * 2, reviewCount: 3, x: 120, y: 150, size: 35 },
      { id: 'n7', name: 'Calculus', subject: 'math', learnedAt: Date.now() - 86400000 * 8, reviewCount: 7, x: -120, y: 80, size: 55 },
      { id: 'n8', name: 'Algebra', subject: 'math', learnedAt: Date.now() - 86400000 * 10, reviewCount: 8, x: -180, y: 120, size: 60 },
      { id: 'n9', name: 'World War II', subject: 'history', learnedAt: Date.now() - 86400000 * 9, reviewCount: 4, x: 0, y: -200, size: 40 },
      { id: 'n10', name: 'Renaissance', subject: 'history', learnedAt: Date.now() - 86400000 * 12, reviewCount: 5, x: 50, y: -180, size: 45 }
    ]

    const demoEdges: KnowledgeEdge[] = [
      { source: 'n1', target: 'n2', strength: 0.8 },
      { source: 'n3', target: 'n4', strength: 0.9 },
      { source: 'n5', target: 'n6', strength: 0.7 },
      { source: 'n7', target: 'n8', strength: 0.85 },
      { source: 'n9', target: 'n10', strength: 0.6 },
      { source: 'n1', target: 'n7', strength: 0.4 },
      { source: 'n3', target: 'n5', strength: 0.3 }
    ]

    return { nodes: demoNodes, edges: demoEdges }
  }

  let nodes = generateKnowledgeNodesFromFlashcards(flashcards)
  nodes = calculatePositions(nodes)
  const edges = generateEdgesFromNodes(nodes)

  return { nodes, edges }
}

export async function getSubjectStats(): Promise<SubjectStats[]> {
  const flashcards = (await db.get('flashcards')) || []
  const quizResults = (await db.get('quiz_results')) || []

  const subjects: Subject[] = ['physics', 'chemistry', 'biology', 'math', 'history', 'english', 'other']

  return subjects.map(subject => {
    const subjectCards = flashcards.filter((f: any) =>
      detectSubjectFromText(f.tag || f.question || '') === subject
    )
    const subjectQuizzes = quizResults.filter((q: any) =>
      q.subject === subject || detectSubjectFromText(q.topic || '') === subject
    )

    const correct = subjectQuizzes.reduce((sum: number, q: any) => sum + (q.correctCount || 0), 0)
    const total = subjectQuizzes.reduce((sum: number, q: any) => sum + (q.totalCount || 0), 0)
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    return {
      subject,
      name: SUBJECT_NAMES[subject],
      color: SUBJECT_COLORS[subject],
      nodeCount: Math.max(1, Math.floor(subjectCards.length / 3)),
      flashcardCount: subjectCards.length,
      quizAccuracy: accuracy,
      studyTime: subjectCards.length * 10
    }
  }).filter(s => s.flashcardCount > 0 || s.quizAccuracy > 0)
}

export async function getRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const flashcards = (await db.get('flashcards')) || []
  const chats = (await db.get('chats')) || []
  const quizResults = (await db.get('quiz_results')) || []

  const activities: ActivityItem[] = []

  for (const card of flashcards.slice(-5)) {
    activities.push({
      id: `fc-${card.id}`,
      type: 'flashcard',
      title: card.tag || 'Flashcard',
      subject: detectSubjectFromText(card.tag || card.question || ''),
      timestamp: card.created || Date.now()
    })
  }

  for (const chat of chats.slice(-5)) {
    activities.push({
      id: `chat-${chat.id}`,
      type: 'chat',
      title: chat.title || 'Chat Session',
      timestamp: chat.createdAt || Date.now()
    })
  }

  for (const quiz of quizResults.slice(-5)) {
    activities.push({
      id: `quiz-${quiz.id}`,
      type: 'quiz',
      title: quiz.topic || 'Quiz',
      subject: quiz.subject || detectSubjectFromText(quiz.topic || ''),
      timestamp: quiz.completedAt || Date.now()
    })
  }

  activities.sort((a, b) => b.timestamp - a.timestamp)
  return activities.slice(0, limit)
}

export async function getLearningProfile(): Promise<LearningProfile> {
  const [stats, subjects, recentActivity] = await Promise.all([
    getLearningStats(),
    getSubjectStats(),
    getRecentActivity()
  ])

  return {
    stats,
    subjects,
    recentActivity
  }
}

export async function identifyWeakAreas(): Promise<Array<{ subject: Subject; topic: string; score: number }>> {
  const quizResults = (await db.get('quiz_results')) || []
  const weakAreas: Array<{ subject: Subject; topic: string; score: number }> = []

  for (const quiz of quizResults) {
    const accuracy = quiz.totalCount > 0 ? (quiz.correctCount / quiz.totalCount) : 0
    if (accuracy < 0.6) {
      weakAreas.push({
        subject: quiz.subject || detectSubjectFromText(quiz.topic || ''),
        topic: quiz.topic || 'Unknown',
        score: Math.round(accuracy * 100)
      })
    }
  }

  return weakAreas.sort((a, b) => a.score - b.score).slice(0, 5)
}

export async function calculateLearningTrend(days = 30): Promise<Array<{ date: string; studyTime: number; flashcardsReviewed: number; quizScore: number }>> {
  const [chats, flashcards, quizResults] = await Promise.all([
    db.get('chats') as Promise<any[]>,
    db.get('flashcards') as Promise<any[]>,
    db.get('quiz_results') as Promise<any[]>,
  ])

  const chatList = chats || []
  const flashcardList = flashcards || []
  const quizList = quizResults || []

  const now = Date.now()
  const trend: Array<{ date: string; studyTime: number; flashcardsReviewed: number; quizScore: number }> = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now - i * 24 * 60 * 60 * 1000)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const date = dayStart.toISOString().split('T')[0]

    const dayChats = chatList.filter((c: any) => c.createdAt >= dayStart.getTime() && c.createdAt < dayEnd.getTime())
    const dayFlashcards = flashcardList.filter((f: any) => f.lastReviewed >= dayStart.getTime() && f.lastReviewed < dayEnd.getTime())
    const dayQuizzes = quizList.filter((q: any) => q.completedAt >= dayStart.getTime() && q.completedAt < dayEnd.getTime())

    const correct = dayQuizzes.reduce((s: number, q: any) => s + (q.correctCount || 0), 0)
    const total = dayQuizzes.reduce((s: number, q: any) => s + (q.totalCount || 0), 0)

    trend.push({
      date,
      studyTime: dayChats.length * 15,
      flashcardsReviewed: dayFlashcards.length,
      quizScore: total > 0 ? Math.round((correct / total) * 100) : 0,
    })
  }

  return trend
}

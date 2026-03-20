import db from '../utils/database/keyv'
import crypto from 'crypto'

export type { Subject } from '../types/subject'
import type { Subject } from '../types/subject'

export interface WeeklyReport {
  week: string
  startDate: number
  endDate: number
  summary: {
    totalStudyTime: number
    studyDays: number
    newTopics: number
    flashcardsCreated: number
    notesCreated: number
    quizzesCompleted: number
    averageAccuracy: number
  }
  dailyStats: {
    date: string
    studyTime: number
    topics: number
  }[]
  subjectDistribution: {
    subject: string
    percentage: number
  }[]
  weakAreas: string[]
  suggestions: string[]
  comparison: {
    studyTimeChange: number
    accuracyChange: number
  }
}

export interface ShareToken {
  token: string
  userId: string
  week: string
  expiresAt: number
  createdAt: number
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

function getWeekRange(weekStr: string): { start: number; end: number } {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    return { start: startOfWeek.getTime(), end: endOfWeek.getTime() }
  }

  const year = parseInt(match[1])
  const week = parseInt(match[2])

  const jan4 = new Date(year, 0, 4)
  const week1Start = new Date(jan4)
  week1Start.setDate(jan4.getDate() - jan4.getDay())

  const start = new Date(week1Start)
  start.setDate(week1Start.getDate() + (week - 1) * 7)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return { start: start.getTime(), end: end.getTime() }
}

function getPreviousWeek(weekStr: string): string {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    const now = new Date()
    const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const year = prevWeek.getFullYear()
    const weekNum = Math.ceil(((prevWeek.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
    return `${year}-W${String(weekNum).padStart(2, '0')}`
  }

  const year = parseInt(match[1])
  const week = parseInt(match[2])

  if (week === 1) {
    const prevYear = year - 1
    const dec31 = new Date(prevYear, 11, 31)
    const lastWeek = Math.ceil(((dec31.getTime() - new Date(prevYear, 0, 1).getTime()) / 86400000 + 1) / 7)
    return `${prevYear}-W${String(lastWeek).padStart(2, '0')}`
  }

  return `${year}-W${String(week - 1).padStart(2, '0')}`
}

function formatWeekString(date: Date): string {
  const year = date.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000)
  const weekNum = Math.ceil((days + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

export async function generateWeeklyReport(
  userId: string,
  weekStr?: string
): Promise<WeeklyReport> {
  const week = weekStr || formatWeekString(new Date())
  const { start, end } = getWeekRange(week)
  const prevWeek = getPreviousWeek(week)
  const { start: prevStart, end: prevEnd } = getWeekRange(prevWeek)

  const flashcards = (await db.get('flashcards')) || []
  const chats = (await db.get('chats')) || []
  const quizResults = (await db.get('quiz_results')) || []
  const notes = (await db.get('smartnotes_results')) || []

  const weekFlashcards = flashcards.filter((f: any) => {
    const created = f.created || Date.now()
    return created >= start && created < end
  })

  const weekChats = chats.filter((c: any) => {
    const created = c.createdAt || Date.now()
    return created >= start && created < end
  })

  const weekQuizzes = quizResults.filter((q: any) => {
    const completed = q.completedAt || Date.now()
    return completed >= start && completed < end
  })

  const weekNotes = notes.filter((n: any) => {
    const created = n.createdAt || Date.now()
    return created >= start && created < end
  })

  const prevWeekFlashcards = flashcards.filter((f: any) => {
    const created = f.created || Date.now()
    return created >= prevStart && created < prevEnd
  })

  const prevWeekQuizzes = quizResults.filter((q: any) => {
    const completed = q.completedAt || Date.now()
    return completed >= prevStart && completed < prevEnd
  })

  const studyDays = new Set(weekChats.map((c: any) => {
    return new Date(c.createdAt || Date.now()).toISOString().split('T')[0]
  })).size

  const totalStudyTime = weekChats.length * 15
  const prevStudyTime = prevWeekFlashcards.length * 15
  const studyTimeChange = prevStudyTime > 0
    ? Math.round(((totalStudyTime - prevStudyTime) / prevStudyTime) * 100)
    : 0

  const newTopics = new Set(weekFlashcards.map((f: any) => f.tag).filter(Boolean)).size

  const correctAnswers = weekQuizzes.reduce((sum: number, q: any) => sum + (q.correctCount || 0), 0)
  const totalAnswers = weekQuizzes.reduce((sum: number, q: any) => sum + (q.totalCount || 0), 0)
  const averageAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

  const prevCorrect = prevWeekQuizzes.reduce((sum: number, q: any) => sum + (q.correctCount || 0), 0)
  const prevTotal = prevWeekQuizzes.reduce((sum: number, q: any) => sum + (q.totalCount || 0), 0)
  const prevAccuracy = prevTotal > 0 ? Math.round((prevCorrect / prevTotal) * 100) : 0
  const accuracyChange = averageAccuracy - prevAccuracy

  const dailyStats: { date: string; studyTime: number; topics: number }[] = []
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start + i * 24 * 60 * 60 * 1000)
    const dateStr = dayStart.toISOString().split('T')[0]
    const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000

    const dayChats = weekChats.filter((c: any) => {
      const created = c.createdAt || Date.now()
      return created >= dayStart.getTime() && created < dayEnd
    })

    const dayFlashcards = weekFlashcards.filter((f: any) => {
      const created = f.created || Date.now()
      return created >= dayStart.getTime() && created < dayEnd
    })

    dailyStats.push({
      date: dateStr,
      studyTime: dayChats.length * 15,
      topics: new Set(dayFlashcards.map((f: any) => f.tag).filter(Boolean)).size
    })
  }

  const subjectCounts: Record<string, number> = {}
  for (const card of weekFlashcards) {
    const subject = detectSubjectFromText(card.tag || card.question || '')
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
  }
  for (const quiz of weekQuizzes) {
    const subject = quiz.subject || detectSubjectFromText(quiz.topic || '')
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
  }

  const totalSubjectCount = Object.values(subjectCounts).reduce((a, b) => a + b, 0)
  const subjectDistribution = Object.entries(subjectCounts).map(([subject, count]) => ({
    subject: SUBJECT_NAMES[subject as Subject] || subject,
    percentage: totalSubjectCount > 0 ? Math.round((count / totalSubjectCount) * 100) : 0
  })).sort((a, b) => b.percentage - a.percentage)

  const weakAreas: string[] = []
  const weakAreaSet = new Set<string>()
  for (const quiz of weekQuizzes) {
    const accuracy = quiz.totalCount > 0 ? (quiz.correctCount / quiz.totalCount) : 1
    if (accuracy < 0.6 && quiz.topic) {
      weakAreaSet.add(quiz.topic)
    }
  }
  weakAreas.push(...Array.from(weakAreaSet).slice(0, 5))

  const suggestions = generateSuggestions({
    studyDays,
    totalStudyTime,
    averageAccuracy,
    weakAreas,
    flashcardsCreated: weekFlashcards.length,
    quizzesCompleted: weekQuizzes.length
  })

  return {
    week,
    startDate: start,
    endDate: end,
    summary: {
      totalStudyTime,
      studyDays,
      newTopics,
      flashcardsCreated: weekFlashcards.length,
      notesCreated: weekNotes.length,
      quizzesCompleted: weekQuizzes.length,
      averageAccuracy
    },
    dailyStats,
    subjectDistribution,
    weakAreas,
    suggestions,
    comparison: {
      studyTimeChange,
      accuracyChange
    }
  }
}

interface SuggestionData {
  studyDays: number
  totalStudyTime: number
  averageAccuracy: number
  weakAreas: string[]
  flashcardsCreated: number
  quizzesCompleted: number
}

function generateSuggestions(data: SuggestionData): string[] {
  const suggestions: string[] = []

  if (data.studyDays < 3) {
    suggestions.push('Try to study at least 3-4 days per week for better retention')
  } else if (data.studyDays >= 5) {
    suggestions.push('Great study consistency! Keep maintaining this routine')
  }

  if (data.totalStudyTime < 60) {
    suggestions.push('Consider increasing study time to at least 60 minutes per week')
  }

  if (data.averageAccuracy < 60) {
    suggestions.push('Focus on reviewing weak areas before attempting new topics')
  } else if (data.averageAccuracy > 85) {
    suggestions.push('Excellent quiz performance! Consider challenging yourself with harder questions')
  }

  if (data.weakAreas.length > 0) {
    suggestions.push(`Review these topics: ${data.weakAreas.slice(0, 3).join(', ')}`)
  }

  if (data.flashcardsCreated === 0) {
    suggestions.push('Create flashcards to improve long-term memory retention')
  }

  if (data.quizzesCompleted === 0) {
    suggestions.push('Take quizzes regularly to test your understanding')
  }

  if (suggestions.length === 0) {
    suggestions.push('Keep up the good work! Regular practice leads to mastery')
  }

  return suggestions
}

export async function createShareToken(userId: string, week: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

  const shareToken: ShareToken = {
    token,
    userId,
    week,
    expiresAt,
    createdAt: Date.now()
  }

  const existingTokens = (await db.get('report_share_tokens')) || []
  existingTokens.push(shareToken)
  await db.set('report_share_tokens', existingTokens)

  return token
}

export async function validateShareToken(token: string): Promise<{ valid: boolean; userId?: string; week?: string }> {
  const tokens = (await db.get('report_share_tokens')) || []
  const shareToken = tokens.find((t: ShareToken) => t.token === token)

  if (!shareToken) {
    return { valid: false }
  }

  if (Date.now() > shareToken.expiresAt) {
    return { valid: false }
  }

  return {
    valid: true,
    userId: shareToken.userId,
    week: shareToken.week
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  const tokens = (await db.get('report_share_tokens')) || []
  const validTokens = tokens.filter((t: ShareToken) => Date.now() <= t.expiresAt)

  if (validTokens.length !== tokens.length) {
    await db.set('report_share_tokens', validTokens)
  }
}

export async function getWeeklyReportByToken(token: string): Promise<WeeklyReport | null> {
  const validation = await validateShareToken(token)

  if (!validation.valid || !validation.userId || !validation.week) {
    return null
  }

  return generateWeeklyReport(validation.userId, validation.week)
}

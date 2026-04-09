export type TaskStatus = "todo" | "doing" | "done" | "blocked"

export type TaskType = "homework" | "project" | "lab" | "essay" | "exam"

export type { Subject } from '../../types/subject'
import type { Subject } from '../../types/subject'

export type Priority = "high" | "medium" | "low"

export type ReminderType = "browser" | "email"

export type Reminder = {
    type: ReminderType
    time: number  // timestamp when reminder should fire
    sent?: boolean
}

export type PlanPolicy = {
    pomodoroMins: number // 25 default
    breakMins: number // 5 default
    maxDailyMins?: number // 240 default
    cram?: boolean
}

export type SlotKind = "focus" | "review" | "buffer"

export type Slot = {
    id: string
    taskId: string
    start: string // ISO datetime
    end: string   // ISO datetime
    kind: SlotKind
    done?: boolean
}

export type TaskSource = { kind: "text" | "pdf" | "url" | "voice" | "upload"; ref?: string; page?: number }

export type TaskFile = {
    id: string
    taskId: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    uploadedAt: string
}

export type TaskMetrics = { sessions: number; minutesSpent: number; quizAvg?: number }

export type TaskPlan = { slots: Slot[]; policy: PlanPolicy; lastPlannedAt: string }

export type Task = {
    id: string
    userId: string           // Owner user ID for access control
    course?: string
    title: string
    type?: TaskType
    notes?: string
    dueAt: string
    estMins: number
    priority: 1 | 2 | 3 | 4 | 5
    status: TaskStatus
    createdAt: string
    updatedAt: string
    source?: TaskSource
    steps?: string[]
    plan?: TaskPlan
    metrics?: TaskMetrics
    tags?: string[]
    rubric?: string
    files?: TaskFile[]
    // Phase 6: Enhanced task fields
    subject?: Subject
    actualMins?: number      // Actual time spent on task
    relatedTopics?: string[] // Related knowledge topics
    reminders?: Reminder[]   // Scheduled reminders
}

export type Plan = {
    id: string
    tasks: Task[]
    slots: Slot[]
    policy: PlanPolicy
}

export type WeeklyPlan = { days: { date: string; slots: Slot[] }[] }

// API Request/Response types
export type CreateTaskRequest = {
    text?: string
    course?: string
    title?: string
    type?: TaskType
    notes?: string
    dueAt?: string
    estMins?: number
    priority?: 1 | 2 | 3 | 4 | 5
    files?: any[] // File objects from multer
    // Phase 6: Enhanced fields
    subject?: Subject
    actualMins?: number
    relatedTopics?: string[]
    reminders?: Reminder[]
}

export type UpdateTaskRequest = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>

export type PlannerGenerateRequest = {
    policy?: Partial<PlanPolicy>
}

export type MaterialsRequest = {
    type: "summary" | "studyGuide" | "flashcards" | "quiz"
}

// Phase 6: Homework parsing types
export type ParsedHomework = {
    title: string
    subject?: Subject
    type?: TaskType
    dueAt?: string
    estMins?: number
    priority?: Priority
    description?: string
    steps?: string[]
    relatedTopics?: string[]
}

export type HomeworkParseResult = {
    success: boolean
    homework: ParsedHomework
    schedule?: {
        date: string
        timeRange: string
        task: string
        estimatedMinutes: number
    }[]
    error?: string
}

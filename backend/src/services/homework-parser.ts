import { handleAsk } from "../lib/ai/ask"
import { ParsedHomework, Subject, TaskType, Priority, HomeworkParseResult } from "./planner/types"

const SUBJECT_KEYWORDS: Record<Subject, string[]> = {
    physics: ["物理", "physics", "力学", "电学", "光学", "热学", "牛顿", "能量", "力", "运动"],
    chemistry: ["化学", "chemistry", "元素", "反应", "分子", "原子", "化合", "分解", "溶液"],
    biology: ["生物", "biology", "细胞", "基因", "遗传", "生态", "植物", "动物", "人体"],
    math: ["数学", "math", "代数", "几何", "微积分", "方程", "函数", "概率", "统计", "计算"],
    english: ["英语", "english", "作文", "阅读", "听力", "语法", "单词", "词汇", "写作", "essay"],
    other: []
}

const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
    homework: ["作业", "homework", "练习", "习题", "题目", "做题"],
    project: ["项目", "project", "课题", "研究", "报告"],
    lab: ["实验", "lab", "laboratory", "试验", "实操"],
    essay: ["作文", "essay", "论文", "文章", "写作"],
    exam: ["考试", "exam", "测验", "quiz", "测试", "考核"]
}

function detectSubject(text: string): Subject | undefined {
    const lowerText = text.toLowerCase()
    for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
            return subject as Subject
        }
    }
    return undefined
}

function detectTaskType(text: string): TaskType | undefined {
    const lowerText = text.toLowerCase()
    for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
        if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
            return type as TaskType
        }
    }
    return undefined
}

function detectDueDate(text: string): string | undefined {
    // Match patterns like:
    // - 明天, 后天, 下周
    // - 周五, 星期五
    // - 2024-01-15, 1/15/2024
    // - in 3 days, next week

    const now = new Date()
    const lowerText = text.toLowerCase()

    // Chinese relative dates
    if (lowerText.includes("明天") || lowerText.includes("tomorrow")) {
        const d = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        return d.toISOString()
    }
    if (lowerText.includes("后天")) {
        const d = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
        return d.toISOString()
    }
    if (lowerText.includes("下周") || lowerText.includes("next week")) {
        const d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return d.toISOString()
    }

    // Day of week
    const daysOfWeek = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    const daysOfWeekEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

    for (let i = 0; i < 7; i++) {
        if (text.includes(daysOfWeek[i]) || lowerText.includes(daysOfWeekEn[i])) {
            const targetDay = i
            const currentDay = now.getDay()
            const daysUntil = (targetDay - currentDay + 7) % 7 || 7
            const d = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000)
            return d.toISOString()
        }
    }

    // ISO date format
    const isoMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (isoMatch) {
        const d = new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}T23:59:59`)
        if (!isNaN(d.getTime())) return d.toISOString()
    }

    return undefined
}

function detectEstimatedMinutes(text: string): number | undefined {
    // Match patterns like:
    // - ~2h, 约2小时, 大概2小时
    // - 30m, 30分钟
    // - 1.5 hours

    const hourMatch = text.match(/(?:~|约|大概)?\s*(\d+(?:\.\d+)?)\s*(?:小时|h|hours?)/i)
    if (hourMatch) {
        return Math.round(parseFloat(hourMatch[1]) * 60)
    }

    const minMatch = text.match(/(?:~|约|大概)?\s*(\d+)\s*(?:分钟|m|mins?)/i)
    if (minMatch) {
        return parseInt(minMatch[1])
    }

    return undefined
}

function detectPriority(text: string): Priority {
    const lowerText = text.toLowerCase()

    // High priority indicators
    const highIndicators = ["紧急", "urgent", "重要", "important", "明天交", "due tomorrow", "截止", "deadline"]
    if (highIndicators.some(ind => lowerText.includes(ind))) {
        return "high"
    }

    // Low priority indicators
    const lowIndicators = ["不急", "not urgent", "下周", "next week", "有时间", "later"]
    if (lowIndicators.some(ind => lowerText.includes(ind))) {
        return "low"
    }

    return "medium"
}

export async function parseHomework(text: string): Promise<HomeworkParseResult> {
    try {
        // First, do basic keyword extraction
        const subject = detectSubject(text)
        const type = detectTaskType(text)
        const dueAt = detectDueDate(text)
        const estMins = detectEstimatedMinutes(text)
        const priority = detectPriority(text)

        // Use AI to extract more detailed information
        const prompt = `Analyze this homework assignment and extract structured information:

"""${text}"""

Please provide:
1. A clear, concise title for this task (max 10 words)
2. The subject/course this belongs to
3. The type of assignment (homework, project, lab, essay, exam)
4. When it's due (if mentioned)
5. How long it should take (in minutes)
6. Priority level (high/medium/low)
7. A brief description of what needs to be done
8. Break this down into 3-5 specific steps to complete
9. What topics/knowledge points this covers

Return your response in this JSON format:
{
  "title": "string",
  "subject": "physics|chemistry|biology|math|english|other",
  "type": "homework|project|lab|essay|exam",
  "dueAt": "ISO date string or null",
  "estMins": number,
  "priority": "high|medium|low",
  "description": "string",
  "steps": ["step1", "step2", ...],
  "relatedTopics": ["topic1", "topic2", ...]
}`

        const response = await handleAsk(prompt)
        let aiResult: Partial<ParsedHomework> = {}

        try {
            // Try to parse JSON from the response
            const jsonMatch = response.answer.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0])
            }
        } catch (e) {
            console.warn("Failed to parse AI response as JSON, using fallback")
        }

        // Merge AI results with keyword detection (AI takes precedence)
        const homework: ParsedHomework = {
            title: aiResult.title || text.slice(0, 50).replace(/\n/g, " "),
            subject: aiResult.subject || subject,
            type: aiResult.type || type,
            dueAt: aiResult.dueAt || dueAt,
            estMins: aiResult.estMins || estMins || 60,
            priority: aiResult.priority || priority,
            description: aiResult.description || text.slice(0, 200),
            steps: aiResult.steps || ["Read and understand the assignment", "Complete the work", "Review before submitting"],
            relatedTopics: aiResult.relatedTopics || []
        }

        // Generate a study schedule based on the homework
        const schedule = await generateStudySchedule(homework)

        return {
            success: true,
            homework,
            schedule
        }
    } catch (error) {
        console.error("Homework parsing error:", error)
        return {
            success: false,
            homework: {
                title: text.slice(0, 50),
                description: text
            },
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

async function generateStudySchedule(homework: ParsedHomework): Promise<HomeworkParseResult["schedule"]> {
    const schedule: HomeworkParseResult["schedule"] = []
    const now = new Date()
    const dueAt = homework.dueAt ? new Date(homework.dueAt) : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const totalMinutes = homework.estMins || 60
    const daysUntilDue = Math.max(1, Math.ceil((dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

    // Distribute work across days
    const steps = homework.steps || ["Complete the assignment"]
    const minutesPerStep = Math.ceil(totalMinutes / steps.length)

    for (let i = 0; i < steps.length; i++) {
        const dayOffset = Math.min(i, daysUntilDue - 1)
        const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })

        // Assume study time starts at 19:00 (7 PM)
        const startHour = 19
        const endHour = startHour + Math.ceil(minutesPerStep / 60)
        const timeRange = `${startHour}:00-${endHour}:00`

        schedule.push({
            date: dateStr,
            timeRange,
            task: steps[i],
            estimatedMinutes: minutesPerStep
        })
    }

    return schedule
}

export function priorityToNumber(priority: Priority): 1 | 2 | 3 | 4 | 5 {
    switch (priority) {
        case "high": return 5
        case "medium": return 3
        case "low": return 1
        default: return 3
    }
}

export function numberToPriority(num: number): Priority {
    if (num >= 4) return "high"
    if (num >= 2) return "medium"
    return "low"
}

import { ingestText } from "../../services/planner/ingest"
import { plannerService } from "../../services/planner/service"
import { CreateTaskRequest, UpdateTaskRequest, PlannerGenerateRequest, MaterialsRequest, Subject } from "../../services/planner/types"
import { emitToAll } from "../../utils/chat/ws"
import { emitLarge } from "../../utils/chat/ws"
import { parseMultipart } from "../../lib/parser/upload"
import { parseHomework, priorityToNumber } from "../../services/homework-parser"
import { scheduleTaskReminders, cancelTaskNotifications, getUserNotifications, sendTaskCompletionNotification } from "../../services/notifications"
import { config } from "../../config/env"
import { createWebSocketAuth, createWebSocketRateLimiter } from "../middleware/websocket"
import { requireAuth } from "../middleware/auth"
import { getUserId } from "../middleware/auth-keyv"
import crypto from "crypto"

// Initialize WebSocket auth middleware if JWT secret is configured
const wsAuth = config.jwtSecret
  ? createWebSocketAuth({ secret: config.jwtSecret })
  : null;

const connectionLimiter = createWebSocketRateLimiter(5, 60000);

const rooms = new Map<string, Set<any>>()
const log = (...a: any[]) => console.log("[planner]", ...a)

export function plannerRoutes(app: any) {
    app.ws("/ws/planner", (ws: any, req: any) => {
        // Apply connection rate limiting
        if (!connectionLimiter(ws, req)) {
            return;
        }

        // Apply authentication if configured
        if (wsAuth && !wsAuth(ws, req)) {
            console.warn('[planner] WebSocket auth failed');
            return;
        }

        const u = new URL(req.url, "http://localhost")
        const sid = u.searchParams.get("sid") || "default"
        let set = rooms.get(sid)
        if (!set) { set = new Set(); rooms.set(sid, set) }
        set.add(ws)
        ws.send(JSON.stringify({ type: "ready", sid }))
        ws.on("close", () => { set!.delete(ws); if (set!.size === 0) rooms.delete(sid) })
    })

    app.post("/tasks", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const ct = req.headers['content-type'] || ''
            const isMultipart = ct.includes("multipart/form-data")

            if (isMultipart) {
                const { q: text, files } = await parseMultipart(req)
                const request: CreateTaskRequest = { text, files }
                const task = await plannerService.createTaskFromRequest(request, userId)
                res.send({ ok: true, task })
                emitToAll(rooms.get("default"), { type: "task.created", task })
            } else {
                const request: CreateTaskRequest = req.body
                const task = await plannerService.createTaskFromRequest(request, userId)
                res.send({ ok: true, task })
                emitToAll(rooms.get("default"), { type: "task.created", task })
            }
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/ingest", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const text = String(req.body?.text || "").trim()
            if (!text) return res.status(400).send({ ok: false, error: "text required" })
            const task = await plannerService.createTaskFromRequest({ text }, userId)
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "task.created", task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/tasks/:id", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const task = await plannerService.getTask(req.params.id, userId)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/replan", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const task = await plannerService.replanTask(req.params.id, userId)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "plan.update", taskId: task.id, slots: task.plan?.slots || [] })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/plan", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            console.log('Planning task:', req.params.id)
            const task = await plannerService.planSingleTask(req.params.id, userId)
            if (!task) {
                console.log('Task not found:', req.params.id)
                return res.status(404).send({ ok: false, error: "Task not found" })
            }

            console.log('Task planned successfully:', task.id, 'Steps:', task.steps?.length)
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "plan.update", taskId: task.id, slots: task.plan?.slots || [] })
        } catch (e: any) {
            console.error('Plan task error:', e)
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/planner/weekly", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const request: PlannerGenerateRequest = req.body
            const result = await plannerService.generateWeeklyPlan(request, userId)
            res.send({ ok: true, ...result })
            emitToAll(rooms.get("default"), { type: "weekly.update", plan: result.plan })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/today", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const sessions = await plannerService.getTodaySessions(userId)
            res.send({ ok: true, sessions })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/deadlines", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const deadlines = await plannerService.getUpcomingDeadlines(userId)
            res.send({ ok: true, ...deadlines })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/stats", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const stats = await plannerService.getUserStats(userId)
            res.send({ ok: true, stats })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/materials", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const id = req.params.id
            const request: MaterialsRequest = { type: req.body?.type || "summary" }
            emitToAll(rooms.get("default"), { type: "phase", value: "assist" })
            const materials = await plannerService.generateMaterials(id, request, userId)
            await emitLarge(rooms.get("default"), "materials", { taskId: id, type: request.type, data: materials }, { gzip: true })
            emitToAll(rooms.get("default"), { type: "done", taskId: id })
            res.send({ ok: true, materials })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.patch("/slots/:taskId/:slotId", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const { taskId, slotId } = req.params
            const { done, skip } = req.body
            const task = await plannerService.updateSlot(taskId, slotId, { done, skip }, userId)
            if (!task) return res.status(404).send({ ok: false, error: "Task or slot not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "slot.update", taskId, slotId, done, skip })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/tasks", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const { status, dueBefore, course } = req.query
            const filter: any = {}
            if (status) filter.status = status as string
            if (dueBefore) filter.dueBefore = dueBefore as string
            if (course) filter.course = course as string

            const tasks = await plannerService.listTasks(filter, userId)
            res.send({ ok: true, tasks })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.patch("/tasks/:id", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const updates: UpdateTaskRequest = req.body
            const task = await plannerService.updateTask(req.params.id, updates, userId)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "task.updated", task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.delete("/tasks/:id", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const success = await plannerService.deleteTask(req.params.id, userId)
            if (!success) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true })
            emitToAll(rooms.get("default"), { type: "task.deleted", taskId: req.params.id })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/files", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const ct = req.headers['content-type'] || ''
            if (!ct.includes("multipart/form-data")) {
                return res.status(400).send({ ok: false, error: "multipart/form-data required" })
            }

            const { files } = await parseMultipart(req)
            if (!files || files.length === 0) {
                return res.status(400).send({ ok: false, error: "no files uploaded" })
            }

            const taskId = req.params.id
            const uploadedFiles = await plannerService.addFilesToTask(taskId, files, userId)
            res.send({ ok: true, files: uploadedFiles })
            emitToAll(rooms.get("default"), { type: "task.files.added", taskId, files: uploadedFiles })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.delete("/tasks/:id/files/:fileId", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const success = await plannerService.removeFileFromTask(req.params.id, req.params.fileId, userId)
            if (!success) return res.status(404).send({ ok: false, error: "File not found" })
            res.send({ ok: true })
            emitToAll(rooms.get("default"), { type: "task.file.removed", taskId: req.params.id, fileId: req.params.fileId })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/sessions/start", requireAuth, async (req: any, res: any) => {
        try {
            const { taskId, slotId } = req.body
            if (!taskId) return res.status(400).send({ ok: false, error: "taskId required" })

            const session = {
                id: crypto.randomUUID(),
                taskId,
                slotId,
                startedAt: new Date().toISOString(),
                status: 'active'
            }

            res.send({ ok: true, session })
            emitToAll(rooms.get("default"), { type: "session.started", session })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/sessions/:id/stop", requireAuth, async (req: any, res: any) => {
        try {
            const sessionId = req.params.id
            const { minutesWorked, completed } = req.body

            const session = {
                id: sessionId,
                endedAt: new Date().toISOString(),
                minutesWorked: minutesWorked || 0,
                completed: completed || false,
                status: 'completed'
            }

            res.send({ ok: true, session })
            emitToAll(rooms.get("default"), { type: "session.ended", session })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/reminders/schedule", requireAuth, async (req: any, res: any) => {
        try {
            const { text, scheduledFor, taskId } = req.body
            if (!text || !scheduledFor) {
                return res.status(400).send({ ok: false, error: "text and scheduledFor required" })
            }

            const reminder = {
                id: crypto.randomUUID(),
                text,
                taskId,
                scheduledFor,
                createdAt: new Date().toISOString()
            }

            res.send({ ok: true, reminder })

            const delayMs = new Date(scheduledFor).getTime() - Date.now()
            if (delayMs > 0) {
                setTimeout(() => {
                    emitToAll(rooms.get("default"), {
                        type: "reminder",
                        id: reminder.id,
                        text: reminder.text,
                        taskId: reminder.taskId,
                        scheduledFor: reminder.scheduledFor
                    })
                }, delayMs)
            }
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/reminders/test", requireAuth, async (_req: any, res: any) => {
        emitToAll(rooms.get("default"), { type: "reminder", text: "Test reminder", at: Date.now() + 60000 })
        res.send({ ok: true })
    })

    // Phase 6: Homework parsing endpoint
    app.post("/planner/parse-homework", requireAuth, async (req: any, res: any) => {
        try {
            const { text, imageText } = req.body
            const content = text || imageText

            if (!content || typeof content !== "string") {
                return res.status(400).send({ ok: false, error: "text or imageText required" })
            }

            const result = await parseHomework(content)
            res.send({ ok: true, ...result })
        } catch (e: any) {
            console.error("Parse homework error:", e)
            res.status(500).send({ ok: false, error: e?.message || "Failed to parse homework" })
        }
    })

    // Phase 6: Task completion tracking
    app.post("/tasks/:id/complete", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const { actualMinutes, notes } = req.body
            const existingTask = await plannerService.getTask(req.params.id, userId)
            if (!existingTask) return res.status(404).send({ ok: false, error: "Task not found" })

            const updatedNotes = notes
                ? `${existingTask.notes || ""}\n\nCompletion notes: ${notes}`.trim()
                : existingTask.notes

            const task = await plannerService.updateTask(req.params.id, {
                status: "done",
                actualMins: actualMinutes,
                notes: updatedNotes
            }, userId)

            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })

            // Cancel any pending reminders for this task
            cancelTaskNotifications(req.params.id)

            // Send completion notification
            sendTaskCompletionNotification(userId, task.title, actualMinutes || task.estMins)

            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "task.completed", task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    // Phase 6: Get task statistics
    app.get("/planner/stats/detailed", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const tasks = await plannerService.listTasks(undefined, userId)
            const now = Date.now()
            const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

            // Single pass to compute all stats
            let totalTasks = 0
            let completedTasks = 0
            let thisWeekTasks = 0
            let thisWeekCompleted = 0
            let totalEstimateAccuracy = 0
            let estimateCount = 0
            let overdueTasks: any[] = []
            const subjectStats: Record<string, { total: number; completed: number; totalMinutes: number }> = {}
            const priorityStats = { high: 0, medium: 0, low: 0 }
            let totalEstimatedMinutes = 0
            let totalActualMinutes = 0

            for (const task of tasks) {
                totalTasks++
                totalEstimatedMinutes += task.estMins || 0

                const isDone = task.status === "done"
                const isThisWeek = task.createdAt && new Date(task.createdAt).getTime() > oneWeekAgo

                if (isDone) {
                    completedTasks++
                    totalActualMinutes += task.actualMins || 0
                }

                if (isThisWeek) {
                    thisWeekTasks++
                    if (isDone) thisWeekCompleted++
                }

                if (isDone && task.actualMins && task.estMins) {
                    totalEstimateAccuracy += Math.min(task.estMins / task.actualMins, 2)
                    estimateCount++
                }

                if (!isDone && new Date(task.dueAt).getTime() < now) {
                    overdueTasks.push(task)
                }

                const subject = task.subject || "other"
                if (!subjectStats[subject]) {
                    subjectStats[subject] = { total: 0, completed: 0, totalMinutes: 0 }
                }
                subjectStats[subject].total++
                if (isDone) subjectStats[subject].completed++
                subjectStats[subject].totalMinutes += task.actualMins || task.estMins || 0

                if (task.priority >= 4) priorityStats.high++
                else if (task.priority === 2 || task.priority === 3) priorityStats.medium++
                else priorityStats.low++
            }

            const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0
            const avgEstimateAccuracy = estimateCount > 0 ? totalEstimateAccuracy / estimateCount : 1

            res.send({
                ok: true,
                stats: {
                    overall: {
                        totalTasks,
                        completedTasks,
                        completionRate: Math.round(completionRate * 100),
                        overdueTasks: overdueTasks.length
                    },
                    weekly: {
                        total: thisWeekTasks,
                        completed: thisWeekCompleted,
                        completionRate: thisWeekTasks > 0
                            ? Math.round((thisWeekCompleted / thisWeekTasks) * 100)
                            : 0
                    },
                    timeEstimates: {
                        avgAccuracy: Math.round(avgEstimateAccuracy * 100),
                        totalEstimatedMinutes,
                        totalActualMinutes
                    },
                    subjects: subjectStats,
                    priorities: priorityStats,
                    procrastination: {
                        overdueCount: overdueTasks.length,
                        overdueTasks: overdueTasks.slice(0, 5).map(t => ({
                            id: t.id,
                            title: t.title,
                            dueAt: t.dueAt,
                            hoursOverdue: Math.round((now - new Date(t.dueAt).getTime()) / (60 * 60 * 1000))
                        }))
                    }
                }
            })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    // Phase 6: Schedule task reminders
    app.post("/tasks/:id/reminders", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const task = await plannerService.getTask(req.params.id, userId)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })

            const { reminderHoursBefore, includeBrowser, includeEmail } = req.body

            const notifications = await scheduleTaskReminders(
                userId,
                task.id,
                task.title,
                new Date(task.dueAt).getTime(),
                {
                    reminderHoursBefore: reminderHoursBefore || [24, 2],
                    includeBrowser: includeBrowser !== false,
                    includeEmail: includeEmail === true
                }
            )

            // Update task with reminder info
            await plannerService.updateTask(req.params.id, {
                reminders: notifications.map(n => ({
                    type: n.type as any,
                    time: n.scheduledTime
                }))
            }, userId)

            res.send({ ok: true, reminders: notifications })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    // Phase 6: Get user notifications
    app.get("/notifications", requireAuth, async (req: any, res: any) => {
        try {
            const userId = getUserId(req)
            const notifications = getUserNotifications(userId)
            res.send({ ok: true, notifications })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    // Phase 6: Cancel notification
    app.delete("/notifications/:id", requireAuth, async (req: any, res: any) => {
        try {
            const { cancelNotification } = await import("../../services/notifications")
            const success = cancelNotification(req.params.id)
            res.send({ ok: success })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })
}

let lastDigest = ""
let lastBreakReminder = 0

const plannerReminderInterval = setInterval(async () => {
    try {
        const now = new Date()
        const hh = now.getHours()
        const mm = now.getMinutes()
        const today = now.toISOString().slice(0, 10)

        if (hh === 8 && mm < 5 && lastDigest !== today) {
            lastDigest = today
            const tomorrow = new Date(today + "T23:59:59Z").toISOString()
            const tasks = await plannerService.listTasks({ dueBefore: tomorrow })
            const dueToday = tasks.filter(t => new Date(t.dueAt).toDateString() === new Date(today).toDateString())
            const todaySessions = await plannerService.getTodaySessions()

            emitToAll(rooms.get("default"), {
                type: "daily.digest",
                date: today,
                due: dueToday.map(t => ({ id: t.id, title: t.title, dueAt: t.dueAt })),
                sessions: todaySessions.length,
                message: `Good morning! You have ${dueToday.length} tasks due today and ${todaySessions.length} sessions planned.`
            })
        }

        if (hh >= 9 && hh <= 18 && mm < 5) {
            const currentHour = now.getTime()
            if (currentHour - lastBreakReminder > 2 * 60 * 60 * 1000) {
                lastBreakReminder = currentHour
                emitToAll(rooms.get("default"), {
                    type: "break.reminder",
                    text: "Time for a break! Consider taking 5-10 minutes to rest your eyes and stretch.",
                    at: now.toISOString()
                })
            }
        }

        // Evening review at 8 PM
        if (hh === 20 && mm < 5) {
            const stats = await plannerService.getUserStats()
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            const tomorrowTasks = await plannerService.listTasks({
                status: 'todo',
                dueBefore: new Date(tomorrow + "T23:59:59Z").toISOString()
            })

            emitToAll(rooms.get("default"), {
                type: "evening.review",
                date: today,
                stats,
                tomorrowTasks: tomorrowTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })),
                message: `Today's recap: ${stats.completedTasks} tasks completed. Tomorrow you have ${tomorrowTasks.length} tasks planned.`
            })
        }
    } catch { }
}, 60000)

// Cleanup interval on module unload (SIGTERM/SIGINT)
const cleanupPlannerInterval = () => {
    if (plannerReminderInterval) {
        clearInterval(plannerReminderInterval)
    }
}

process.on('SIGTERM', cleanupPlannerInterval)
process.on('SIGINT', cleanupPlannerInterval)

import { Reminder, ReminderType } from "./planner/types"
import { emitToAll } from "../utils/chat/ws"

// In-memory store for scheduled reminders (in production, use Redis or database)
const scheduledReminders = new Map<string, NodeJS.Timeout>()

// WebSocket rooms for notifications
const notificationRooms = new Map<string, Set<any>>()

export interface NotificationPayload {
    userId: string
    taskId?: string
    title: string
    message: string
    type: "reminder" | "deadline" | "achievement" | "break"
    data?: Record<string, any>
}

export interface ScheduledNotification {
    id: string
    userId: string
    taskId?: string
    type: ReminderType
    title: string
    message: string
    scheduledTime: number
    createdAt: number
}

const scheduledNotifications: ScheduledNotification[] = []

/**
 * Schedule a notification to be sent at a specific time
 */
export async function scheduleNotification(
    userId: string,
    payload: {
        taskId?: string
        type: ReminderType
        title: string
        message: string
        scheduledTime: number
    }
): Promise<ScheduledNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const notification: ScheduledNotification = {
        id,
        userId,
        taskId: payload.taskId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        scheduledTime: payload.scheduledTime,
        createdAt: Date.now()
    }

    scheduledNotifications.push(notification)

    // Schedule the actual notification
    const delayMs = payload.scheduledTime - Date.now()

    if (delayMs > 0) {
        const timeout = setTimeout(() => {
            sendNotification(notification)
        }, delayMs)

        scheduledReminders.set(id, timeout)
    } else {
        // If the time has already passed, send immediately
        sendNotification(notification)
    }

    console.log(`[notifications] Scheduled ${payload.type} notification for user ${userId} at ${new Date(payload.scheduledTime).toLocaleString()}`)

    return notification
}

/**
 * Send a notification immediately
 */
export function sendNotification(notification: ScheduledNotification): void {
    const { userId, type, title, message, taskId } = notification

    // Send via WebSocket
    const rooms = notificationRooms.get(userId)
    if (rooms) {
        emitToAll(rooms, {
            type: "notification",
            notificationType: type,
            title,
            message,
            taskId,
            timestamp: Date.now()
        })
    }

    // Send browser notification if applicable
    if (type === "browser") {
        sendBrowserNotification(userId, title, message)
    }

    // Mark as sent
    const index = scheduledNotifications.findIndex(n => n.id === notification.id)
    if (index !== -1) {
        scheduledNotifications[index] = { ...notification, type: "browser" }
    }

    console.log(`[notifications] Sent ${type} notification to user ${userId}: ${title}`)
}

/**
 * Send a browser push notification
 */
export function sendBrowserNotification(userId: string, title: string, message: string): void {
    // This is handled on the client side via WebSocket
    // The client will show a browser notification if permission is granted
    const rooms = notificationRooms.get(userId)
    if (rooms) {
        emitToAll(rooms, {
            type: "browser.notification",
            title,
            message,
            timestamp: Date.now()
        })
    }
}

/**
 * Cancel a scheduled notification
 */
export function cancelNotification(notificationId: string): boolean {
    const timeout = scheduledReminders.get(notificationId)
    if (timeout) {
        clearTimeout(timeout)
        scheduledReminders.delete(notificationId)
    }

    const index = scheduledNotifications.findIndex(n => n.id === notificationId)
    if (index !== -1) {
        scheduledNotifications.splice(index, 1)
        return true
    }

    return false
}

/**
 * Cancel all notifications for a specific task
 */
export function cancelTaskNotifications(taskId: string): number {
    const toCancel = scheduledNotifications.filter(n => n.taskId === taskId)
    let cancelled = 0

    for (const notification of toCancel) {
        if (cancelNotification(notification.id)) {
            cancelled++
        }
    }

    return cancelled
}

/**
 * Get all scheduled notifications for a user
 */
export function getUserNotifications(userId: string): ScheduledNotification[] {
    return scheduledNotifications
        .filter(n => n.userId === userId)
        .sort((a, b) => a.scheduledTime - b.scheduledTime)
}

/**
 * Get upcoming notifications for a user
 */
export function getUpcomingNotifications(userId: string, limit: number = 10): ScheduledNotification[] {
    const now = Date.now()
    return scheduledNotifications
        .filter(n => n.userId === userId && n.scheduledTime > now)
        .sort((a, b) => a.scheduledTime - b.scheduledTime)
        .slice(0, limit)
}

/**
 * Register a WebSocket connection for a user
 */
export function registerUserConnection(userId: string, ws: any): void {
    let rooms = notificationRooms.get(userId)
    if (!rooms) {
        rooms = new Set()
        notificationRooms.set(userId, rooms)
    }
    rooms.add(ws)

    ws.on("close", () => {
        rooms?.delete(ws)
        if (rooms?.size === 0) {
            notificationRooms.delete(userId)
        }
    })
}

/**
 * Schedule automatic reminders for a task
 */
export async function scheduleTaskReminders(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueAt: number,
    options: {
        reminderHoursBefore?: number[]
        includeBrowser?: boolean
        includeEmail?: boolean
    } = {}
): Promise<ScheduledNotification[]> {
    const {
        reminderHoursBefore = [24, 2],
        includeBrowser = true,
        includeEmail = false
    } = options

    const notifications: ScheduledNotification[] = []

    for (const hours of reminderHoursBefore) {
        const reminderTime = dueAt - hours * 60 * 60 * 1000

        if (reminderTime > Date.now()) {
            if (includeBrowser) {
                const notif = await scheduleNotification(userId, {
                    taskId,
                    type: "browser",
                    title: "作业提醒",
                    message: `"${taskTitle}" 将在 ${hours} 小时后到期`,
                    scheduledTime: reminderTime
                })
                notifications.push(notif)
            }

            if (includeEmail) {
                const notif = await scheduleNotification(userId, {
                    taskId,
                    type: "email",
                    title: "作业截止提醒",
                    message: `您的作业 "${taskTitle}" 将在 ${hours} 小时后到期，请尽快完成。`,
                    scheduledTime: reminderTime
                })
                notifications.push(notif)
            }
        }
    }

    return notifications
}

/**
 * Send immediate notification for task completion
 */
export function sendTaskCompletionNotification(
    userId: string,
    taskTitle: string,
    actualMinutes: number
): void {
    const rooms = notificationRooms.get(userId)
    if (rooms) {
        emitToAll(rooms, {
            type: "task.completed",
            title: "作业完成！",
            message: `恭喜！您已完成 "${taskTitle}"，用时 ${Math.round(actualMinutes)} 分钟`,
            timestamp: Date.now()
        })
    }
}

/**
 * Send procrastination warning
 */
export function sendProcrastinationWarning(
    userId: string,
    taskTitle: string,
    hoursOverdue: number
): void {
    const rooms = notificationRooms.get(userId)
    if (rooms) {
        emitToAll(rooms, {
            type: "procrastination.warning",
            title: "作业逾期提醒",
            message: `"${taskTitle}" 已逾期 ${Math.round(hoursOverdue)} 小时，请尽快完成！`,
            timestamp: Date.now()
        })
    }
}

// Cleanup function for expired notifications
setInterval(() => {
    const now = Date.now()
    const expiredThreshold = now - 24 * 60 * 60 * 1000 // 24 hours ago

    for (let i = scheduledNotifications.length - 1; i >= 0; i--) {
        const notification = scheduledNotifications[i]
        if (notification.scheduledTime < expiredThreshold) {
            scheduledNotifications.splice(i, 1)
            scheduledReminders.delete(notification.id)
        }
    }
}, 60 * 60 * 1000) // Run every hour

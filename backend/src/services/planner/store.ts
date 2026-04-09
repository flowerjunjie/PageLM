import db from "../../utils/database/keyv"
import crypto from "crypto"
import { Task, TaskFile } from "./types"

const LIST_KEY = "planner:tasks"
const FILES_LIST_KEY = "planner:task_files"

export async function createTask(t: Omit<Task, "id" | "createdAt" | "updatedAt">, userId: string): Promise<Task> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const task: Task = { ...t, id, userId, createdAt: now, updatedAt: now }
    const list = (await db.get(LIST_KEY)) || []
    list.push({ id, userId })
    await db.set(LIST_KEY, list)
    await db.set(`planner:task:${id}`, task)
    return task
}

export async function getTask(id: string, userId?: string): Promise<Task | null> {
    const task = (await db.get(`planner:task:${id}`)) || null
    if (!task) return null
    // IDOR protection: verify ownership if userId provided
    if (userId && task.userId !== userId) {
        console.warn(`[planner] IDOR attempt: user ${userId} tried to access task ${id} owned by ${task.userId}`)
        return null
    }
    task.files = await getTaskFiles(id)
    return task
}

export async function updateTask(id: string, patch: Partial<Task>, userId?: string): Promise<Task | null> {
    const cur = (await getTask(id, userId))
    if (!cur) return null
    const next: Task = { ...cur, ...patch, id: cur.id, userId: cur.userId, updatedAt: new Date().toISOString() }
    await db.set(`planner:task:${id}`, next)
    return next
}

export async function deleteTask(id: string, userId?: string): Promise<boolean> {
    const task = await getTask(id)
    if (!task) return false
    // IDOR protection: verify ownership
    if (userId && task.userId !== userId) {
        console.warn(`[planner] IDOR attempt: user ${userId} tried to delete task ${id} owned by ${task.userId}`)
        return false
    }
    const list = ((await db.get(LIST_KEY)) || []).filter((x: any) => x.id !== id)
    await db.set(LIST_KEY, list)
    await db.delete(`planner:task:${id}`)
    return true
}

export async function listTasks(filter?: { status?: string; dueBefore?: string; course?: string }, userId?: string): Promise<Task[]> {
    const list = (await db.get(LIST_KEY)) || []

    // Fetch all task records and the shared files index in parallel
    const [taskRecords, allFilesList] = await Promise.all([
        Promise.all(list.map((it: any) => db.get(`planner:task:${it.id}`) as Promise<Task | undefined>)),
        db.get(FILES_LIST_KEY) as Promise<Array<{ id: string; taskId: string }> | undefined>,
    ])

    const filesList = allFilesList || []

    // Group file index entries by taskId to avoid re-reading the list per task
    const fileIndexByTask = new Map<string, Array<{ id: string; taskId: string }>>()
    for (const item of filesList) {
        const existing = fileIndexByTask.get(item.taskId)
        if (existing) {
            existing.push(item)
        } else {
            fileIndexByTask.set(item.taskId, [item])
        }
    }

    // Collect all file IDs that are needed for the tasks we have
    const allFileIds = filesList.map((item) => item.id)
    const fileRecords = await Promise.all(
        allFileIds.map((id) => db.get(`planner:task_file:${id}`) as Promise<TaskFile | undefined>)
    )
    const fileById = new Map<string, TaskFile>()
    allFileIds.forEach((id, idx) => {
        const f = fileRecords[idx]
        if (f) fileById.set(id, f)
    })

    const tasks: Task[] = []
    for (const raw of taskRecords) {
        if (!raw) continue
        const t = raw as Task

        // IDOR protection: filter by userId if provided
        if (userId && t.userId !== userId) continue

        // Apply filters before attaching files (avoids unnecessary file lookups)
        if (filter?.status && t.status !== filter.status) continue
        if (filter?.dueBefore && new Date(t.dueAt) > new Date(filter.dueBefore)) continue
        if (filter?.course && t.course !== filter.course) continue

        // Attach files from the pre-fetched map
        const fileEntries = fileIndexByTask.get(t.id) || []
        t.files = fileEntries
            .map((entry) => fileById.get(entry.id))
            .filter((f): f is TaskFile => f !== undefined)

        tasks.push(t)
    }

    return tasks.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export async function saveTaskFile(file: TaskFile): Promise<void> {
    const list = (await db.get(FILES_LIST_KEY)) || []
    list.push({ id: file.id, taskId: file.taskId })
    await db.set(FILES_LIST_KEY, list)
    await db.set(`planner:task_file:${file.id}`, file)
}

export async function getTaskFiles(taskId: string): Promise<TaskFile[]> {
    const list = (await db.get(FILES_LIST_KEY)) || []
    const matchingItems = list.filter((item: any) => item.taskId === taskId)

    // Batch-fetch all matching files in parallel instead of one-by-one
    const files = await Promise.all(
        matchingItems.map((item: any) => db.get(`planner:task_file:${item.id}`) as Promise<TaskFile | undefined>)
    )
    return files.filter((f): f is TaskFile => f !== undefined && f !== null)
}

export async function deleteTaskFile(id: string): Promise<void> {
    const list = ((await db.get(FILES_LIST_KEY)) || []).filter((x: any) => x.id !== id)
    await db.set(FILES_LIST_KEY, list)
    await db.delete(`planner:task_file:${id}`)
}

export async function deleteTaskFiles(taskId: string): Promise<void> {
    const list = (await db.get(FILES_LIST_KEY)) || []
    const filesToDelete = list.filter((x: any) => x.taskId === taskId)
    const remainingFiles = list.filter((x: any) => x.taskId !== taskId)

    await db.set(FILES_LIST_KEY, remainingFiles)
    for (const file of filesToDelete) {
        await db.delete(`planner:task_file:${file.id}`)
    }
}
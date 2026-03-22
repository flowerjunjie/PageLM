/**
 * Planner Store Unit Tests
 *
 * Tests for createTask, getTask, updateTask, deleteTask, listTasks,
 * saveTaskFile, getTaskFiles, deleteTaskFile, deleteTaskFiles.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock crypto and database
vi.mock('crypto', () => ({
  default: { randomUUID: vi.fn(() => 'mock-uuid-store') },
  randomUUID: vi.fn(() => 'mock-uuid-store'),
}))

vi.mock('../../../src/utils/database/keyv', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

import db from '../../../src/utils/database/keyv'
import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  listTasks,
  saveTaskFile,
  getTaskFiles,
  deleteTaskFile,
  deleteTaskFiles,
} from '../../../src/services/planner/store'
import type { Task, TaskFile } from '../../../src/services/planner/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  return {
    id: 'task-store-1',
    title: 'Test Task',
    dueAt,
    estMins: 60,
    priority: 3,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeTaskFile(overrides: Partial<TaskFile> = {}): TaskFile {
  return {
    id: 'file-1',
    taskId: 'task-store-1',
    filename: 'test.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    uploadedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.mocked(db.get).mockResolvedValue(undefined)
  vi.mocked(db.set).mockResolvedValue(undefined)
  vi.mocked(db.delete).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('createTask', () => {
  it('should return a task with auto-generated id', async () => {
    vi.mocked(db.get).mockResolvedValue([]) // existing tasks list

    const taskData = {
      title: 'New Task',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estMins: 60,
      priority: 3 as const,
      status: 'todo' as const,
    }

    const task = await createTask(taskData)

    expect(task).toHaveProperty('id')
    expect(task.title).toBe('New Task')
  })

  it('should set createdAt and updatedAt timestamps', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const task = await createTask({
      title: 'Timestamped Task',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estMins: 30,
      priority: 2 as const,
      status: 'todo' as const,
    })

    expect(task.createdAt).toBeDefined()
    expect(task.updatedAt).toBeDefined()
    expect(typeof task.createdAt).toBe('string')
  })

  it('should save task to database', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    await createTask({
      title: 'Save Test',
      dueAt: new Date().toISOString(),
      estMins: 60,
      priority: 3 as const,
      status: 'todo' as const,
    })

    expect(db.set).toHaveBeenCalled()
  })

  it('should append task id to the list', async () => {
    const existingList = [{ id: 'existing-task' }]
    vi.mocked(db.get).mockResolvedValue(existingList)

    await createTask({
      title: 'Another Task',
      dueAt: new Date().toISOString(),
      estMins: 60,
      priority: 3 as const,
      status: 'todo' as const,
    })

    const setCall = vi.mocked(db.set).mock.calls.find(
      call => call[0] === 'planner:tasks'
    )
    expect(setCall).toBeDefined()
    const list = setCall![1] as any[]
    expect(list.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getTask
// ---------------------------------------------------------------------------

describe('getTask', () => {
  it('should return null for non-existent task', async () => {
    vi.mocked(db.get).mockResolvedValue(null)

    const result = await getTask('nonexistent')

    expect(result).toBeNull()
  })

  it('should return task with attached file records', async () => {
    const task = makeTask()
    const attachedFile = makeTaskFile({ id: 'file-attached', taskId: 'task-store-1' })
    vi.mocked(db.get).mockImplementation(async (key: string) => {
      switch (key) {
        case 'planner:task:task-store-1':
          return task
        case 'planner:task_files':
          return [{ id: 'file-attached', taskId: 'task-store-1' }]
        case 'planner:task_file:file-attached':
          return attachedFile
        default:
          return undefined
      }
    })

    const result = await getTask('task-store-1')

    expect(result).toBeDefined()
    expect(result!.id).toBe('task-store-1')
    expect(result!.files).toEqual([attachedFile])
  })
})

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('updateTask', () => {
  it('should return null when task does not exist', async () => {
    vi.mocked(db.get).mockResolvedValue(null)

    const result = await updateTask('nonexistent', { title: 'Updated' })

    expect(result).toBeNull()
  })

  it('should apply patch and preserve id', async () => {
    const task = makeTask({ id: 'task-update' })
    vi.mocked(db.get)
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce([]) // files for getTask

    const result = await updateTask('task-update', { title: 'Updated Title' })

    expect(result!.title).toBe('Updated Title')
    expect(result!.id).toBe('task-update') // id should not be overwritten
  })

  it('should update updatedAt timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T06:00:00.000Z'))

    const task = makeTask({
      updatedAt: '2026-03-21T06:00:00.000Z',
      createdAt: '2026-03-20T06:00:00.000Z',
    })

    vi.mocked(db.get)
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce([])

    const result = await updateTask('task-store-1', { estMins: 90 })

    expect(result!.updatedAt).toBe('2026-03-22T06:00:00.000Z')
    expect(result!.updatedAt).not.toBe(task.updatedAt)
  })

  it('should save updated task to database', async () => {
    const task = makeTask()
    vi.mocked(db.get)
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce([])

    await updateTask('task-store-1', { status: 'done' })

    expect(db.set).toHaveBeenCalledWith(
      'planner:task:task-store-1',
      expect.objectContaining({ status: 'done' })
    )
  })
})

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('deleteTask', () => {
  it('should return true after deletion', async () => {
    vi.mocked(db.get).mockResolvedValue([{ id: 'task-to-delete' }])

    const result = await deleteTask('task-to-delete')

    expect(result).toBe(true)
  })

  it('should remove task from list', async () => {
    const list = [{ id: 'task-del' }, { id: 'other' }]
    vi.mocked(db.get).mockResolvedValue(list)

    await deleteTask('task-del')

    const listSetCall = vi.mocked(db.set).mock.calls.find(
      call => call[0] === 'planner:tasks'
    )
    const savedList = listSetCall![1] as any[]
    expect(savedList.some((x: any) => x.id === 'task-del')).toBe(false)
    expect(savedList.some((x: any) => x.id === 'other')).toBe(true)
  })

  it('should delete the task record from database', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    await deleteTask('task-del-record')

    expect(db.delete).toHaveBeenCalledWith('planner:task:task-del-record')
  })
})

// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------

describe('listTasks', () => {
  function mockDbGetByKey(values: Record<string, unknown>) {
    vi.mocked(db.get).mockImplementation(async (key: string) => values[key])
  }

  it('should return empty array when no tasks exist', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const result = await listTasks()

    expect(result).toEqual([])
  })

  it('should return all tasks without filters', async () => {
    const task1 = makeTask({ id: 'lt-1', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    const task2 = makeTask({ id: 'lt-2', dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-1' }, { id: 'lt-2' }],
      'planner:task:lt-1': task1,
      'planner:task:lt-2': task2,
      'planner:task_files': [],
    })

    const result = await listTasks()

    expect(result.length).toBe(2)
  })

  it('should filter by status', async () => {
    const todoTask = makeTask({ id: 'lt-todo', status: 'todo', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    const doneTask = makeTask({ id: 'lt-done', status: 'done', dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-todo' }, { id: 'lt-done' }],
      'planner:task:lt-todo': todoTask,
      'planner:task:lt-done': doneTask,
      'planner:task_files': [],
    })

    const result = await listTasks({ status: 'todo' })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('lt-todo')
  })

  it('should filter by course', async () => {
    const mathTask = makeTask({ id: 'lt-math', course: 'math', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    const physicsTask = makeTask({ id: 'lt-physics', course: 'physics', dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-math' }, { id: 'lt-physics' }],
      'planner:task:lt-math': mathTask,
      'planner:task:lt-physics': physicsTask,
      'planner:task_files': [],
    })

    const result = await listTasks({ course: 'math' })

    expect(result.length).toBe(1)
    expect(result[0].course).toBe('math')
  })

  it('should filter by dueBefore', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const earlyTask = makeTask({ id: 'lt-early', dueAt: tomorrow.toISOString() })
    const lateTask = makeTask({ id: 'lt-late', dueAt: nextWeek.toISOString() })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-early' }, { id: 'lt-late' }],
      'planner:task:lt-early': earlyTask,
      'planner:task:lt-late': lateTask,
      'planner:task_files': [],
    })

    const result = await listTasks({ dueBefore: in3Days.toISOString() })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('lt-early')
  })

  it('should sort tasks by dueAt ascending', async () => {
    const task1 = makeTask({ id: 'lt-sort-1', dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() })
    const task2 = makeTask({ id: 'lt-sort-2', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-sort-1' }, { id: 'lt-sort-2' }],
      'planner:task:lt-sort-1': task1,
      'planner:task:lt-sort-2': task2,
      'planner:task_files': [],
    })

    const result = await listTasks()

    expect(result[0].id).toBe('lt-sort-2') // earlier due date first
    expect(result[1].id).toBe('lt-sort-1')
  })

  it('should attach multiple files to a task when multiple file index entries exist', async () => {
    const task = makeTask({ id: 'lt-files' })
    const file1 = makeTaskFile({ id: 'file-a', taskId: 'lt-files' })
    const file2 = makeTaskFile({ id: 'file-b', taskId: 'lt-files', filename: 'second.pdf', originalName: 'Second.pdf' })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-files' }],
      'planner:task:lt-files': task,
      'planner:task_files': [
        { id: 'file-a', taskId: 'lt-files' },
        { id: 'file-b', taskId: 'lt-files' },
      ],
      'planner:task_file:file-a': file1,
      'planner:task_file:file-b': file2,
    })

    const result = await listTasks()

    expect(result).toHaveLength(1)
    expect(result[0].files).toEqual([file1, file2])
  })

  it('should skip missing task records when listing tasks', async () => {
    const task = makeTask({ id: 'lt-present' })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-missing' }, { id: 'lt-present' }],
      'planner:task:lt-present': task,
      'planner:task_files': [],
    })

    const result = await listTasks()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lt-present')
  })

  it('should ignore missing file records when attaching files in listTasks', async () => {
    const task = makeTask({ id: 'lt-missing-file' })

    mockDbGetByKey({
      'planner:tasks': [{ id: 'lt-missing-file' }],
      'planner:task:lt-missing-file': task,
      'planner:task_files': [{ id: 'file-missing', taskId: 'lt-missing-file' }],
    })

    const result = await listTasks()

    expect(result).toHaveLength(1)
    expect(result[0].files).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// saveTaskFile
// ---------------------------------------------------------------------------

describe('saveTaskFile', () => {
  it('should save file to database', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const file = makeTaskFile()
    await saveTaskFile(file)

    expect(db.set).toHaveBeenCalledWith(
      'planner:task_file:file-1',
      file
    )
  })

  it('should append file entry to files list', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const file = makeTaskFile({ id: 'new-file', taskId: 'task-id' })
    await saveTaskFile(file)

    const listSetCall = vi.mocked(db.set).mock.calls.find(
      call => call[0] === 'planner:task_files'
    )
    expect(listSetCall).toBeDefined()
    const list = listSetCall![1] as any[]
    expect(list).toContainEqual({ id: 'new-file', taskId: 'task-id' })
  })
})

// ---------------------------------------------------------------------------
// getTaskFiles
// ---------------------------------------------------------------------------

describe('getTaskFiles', () => {
  it('should return empty array when no files exist', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    const result = await getTaskFiles('task-1')

    expect(result).toEqual([])
  })

  it('should return files for the specified task', async () => {
    const fileEntry = { id: 'file-get', taskId: 'task-get' }
    const fileRecord = makeTaskFile({ id: 'file-get', taskId: 'task-get' })

    vi.mocked(db.get)
      .mockResolvedValueOnce([fileEntry]) // files list
      .mockResolvedValueOnce(fileRecord)  // file record

    const result = await getTaskFiles('task-get')

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('file-get')
  })

  it('should only return files for the specified taskId', async () => {
    const list = [
      { id: 'f1', taskId: 'task-a' },
      { id: 'f2', taskId: 'task-b' }, // different task
    ]
    const fileRecord = makeTaskFile({ id: 'f1', taskId: 'task-a' })

    vi.mocked(db.get)
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce(fileRecord)

    const result = await getTaskFiles('task-a')

    expect(result).toEqual([fileRecord])
  })

  it('should filter out null file records', async () => {
    vi.mocked(db.get)
      .mockResolvedValueOnce([{ id: 'null-file', taskId: 'task-null' }])
      .mockResolvedValueOnce(null)

    const result = await getTaskFiles('task-null')

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// deleteTaskFile
// ---------------------------------------------------------------------------

describe('deleteTaskFile', () => {
  it('should remove file from list and delete record', async () => {
    const list = [{ id: 'file-del', taskId: 'task-1' }, { id: 'other-file', taskId: 'task-2' }]
    vi.mocked(db.get).mockResolvedValue(list)

    await deleteTaskFile('file-del')

    const listSetCall = vi.mocked(db.set).mock.calls.find(
      call => call[0] === 'planner:task_files'
    )
    const savedList = listSetCall![1] as any[]
    expect(savedList.some((x: any) => x.id === 'file-del')).toBe(false)
    expect(savedList.some((x: any) => x.id === 'other-file')).toBe(true)

    expect(db.delete).toHaveBeenCalledWith('planner:task_file:file-del')
  })
})

// ---------------------------------------------------------------------------
// deleteTaskFiles
// ---------------------------------------------------------------------------

describe('deleteTaskFiles', () => {
  it('should delete all files for a task', async () => {
    const list = [
      { id: 'f1', taskId: 'task-del-all' },
      { id: 'f2', taskId: 'task-del-all' },
      { id: 'f3', taskId: 'other-task' },
    ]
    vi.mocked(db.get).mockResolvedValue(list)

    await deleteTaskFiles('task-del-all')

    // Should save remaining files (only f3)
    const listSetCall = vi.mocked(db.set).mock.calls.find(
      call => call[0] === 'planner:task_files'
    )
    const savedList = listSetCall![1] as any[]
    expect(savedList.length).toBe(1)
    expect(savedList[0].id).toBe('f3')

    // Should delete both task files
    expect(db.delete).toHaveBeenCalledWith('planner:task_file:f1')
    expect(db.delete).toHaveBeenCalledWith('planner:task_file:f2')
  })

  it('should handle case with no files for task', async () => {
    vi.mocked(db.get).mockResolvedValue([])

    await expect(deleteTaskFiles('no-files-task')).resolves.not.toThrow()
  })
})

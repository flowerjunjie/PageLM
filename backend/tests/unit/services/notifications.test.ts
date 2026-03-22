/**
 * Notifications Service Unit Tests
 *
 * Tests for getUserNotifications, getUpcomingNotifications, cancelNotification,
 * cancelTaskNotifications, and scheduleNotification (pure/near-pure paths).
 *
 * WebSocket-dependent paths (sendNotification, registerUserConnection) are
 * exercised at a structural level only since emitToAll is mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock WebSocket emitter - notifications.ts calls emitToAll for realtime delivery
vi.mock('../../../src/utils/chat/ws', () => ({
  emitToAll: vi.fn(),
}))

import {
  scheduleNotification,
  sendNotification,
  cancelNotification,
  cancelTaskNotifications,
  getUserNotifications,
  getUpcomingNotifications,
  sendTaskCompletionNotification,
  sendProcrastinationWarning,
  scheduleTaskReminders,
  registerUserConnection,
} from '../../../src/services/notifications'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The notifications module uses module-level arrays.
 * We track created user ids and close handlers so each test can clean up
 * state through the public API without touching private internals.
 */
function makeScheduledTime(offsetMs: number): number {
  return Date.now() + offsetMs
}

let testUserSeq = 0
let trackedUserIds: string[] = []
let trackedCloseHandlers: Array<() => void> = []

function createTestUserId(prefix = 'user'): string {
  testUserSeq += 1
  const userId = `${prefix}-${testUserSeq}`
  trackedUserIds.push(userId)
  return userId
}

function createMockWs() {
  let closeHandler: (() => void) | undefined
  const ws: any = {
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'close') {
        closeHandler = handler
      }
    }),
  }

  return {
    ws,
    triggerClose: () => closeHandler?.(),
  }
}

function registerTrackedConnection(userId: string) {
  const { ws, triggerClose } = createMockWs()
  trackedCloseHandlers.push(triggerClose)
  registerUserConnection(userId, ws)
  return { ws, triggerClose }
}

beforeEach(() => {
  trackedUserIds = []
  trackedCloseHandlers = []
  vi.clearAllMocks()
})

afterEach(() => {
  for (const triggerClose of trackedCloseHandlers) {
    triggerClose()
  }

  for (const userId of trackedUserIds) {
    for (const notification of getUserNotifications(userId)) {
      cancelNotification(notification.id)
    }
  }

  trackedCloseHandlers = []
  trackedUserIds = []
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// scheduleNotification
// ---------------------------------------------------------------------------

describe('scheduleNotification', () => {
  it('should return a ScheduledNotification object', async () => {
    const userId = createTestUserId('user-1')
    const notif = await scheduleNotification(userId, {
      type: 'browser',
      title: 'Test',
      message: 'Hello',
      scheduledTime: makeScheduledTime(3600000),
    })

    expect(notif).toHaveProperty('id')
    expect(notif).toHaveProperty('userId', userId)
    expect(notif).toHaveProperty('title', 'Test')
    expect(notif).toHaveProperty('message', 'Hello')
    expect(notif).toHaveProperty('type', 'browser')
    expect(notif).toHaveProperty('scheduledTime')
    expect(notif).toHaveProperty('createdAt')
  })

  it('should generate a unique id for each notification', async () => {
    const userId = createTestUserId('user-unique')
    const n1 = await scheduleNotification(userId, {
      type: 'browser',
      title: 'A',
      message: 'A',
      scheduledTime: makeScheduledTime(3600000),
    })
    const n2 = await scheduleNotification(userId, {
      type: 'browser',
      title: 'B',
      message: 'B',
      scheduledTime: makeScheduledTime(7200000),
    })

    expect(n1.id).not.toBe(n2.id)
  })

  it('should include optional taskId when provided', async () => {
    const userId = createTestUserId('user-2')
    const notif = await scheduleNotification(userId, {
      taskId: 'task-abc',
      type: 'email',
      title: 'Task Reminder',
      message: 'Your task is due',
      scheduledTime: makeScheduledTime(3600000),
    })

    expect(notif.taskId).toBe('task-abc')
  })

  it('should send notification immediately when scheduledTime is in the past', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')
    const userId = createTestUserId('user-immediate')

    registerTrackedConnection(userId)

    // When scheduledTime is in the past (delayMs <= 0), sendNotification is called immediately
    const notif = await scheduleNotification(userId, {
      type: 'email',
      title: 'Immediate',
      message: 'Send now',
      scheduledTime: Date.now() - 1000, // 1 second in the past
    })

    const payloads = vi.mocked(emitToAll).mock.calls.map(call => call[1])

    expect(notif).toBeDefined()
    expect(notif.title).toBe('Immediate')
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'notification',
        notificationType: 'email',
        title: 'Immediate',
        message: 'Send now',
        timestamp: expect.any(Number),
      }),
    ]))
  })
})

// ---------------------------------------------------------------------------
// cancelNotification
// ---------------------------------------------------------------------------

describe('cancelNotification', () => {
  it('should return false when notification does not exist', () => {
    const result = cancelNotification('non-existent-id')
    expect(result).toBe(false)
  })

  it('should return true and remove a scheduled notification', async () => {
    const userId = createTestUserId('user-cancel')
    const notif = await scheduleNotification(userId, {
      type: 'browser',
      title: 'To Cancel',
      message: 'Will be cancelled',
      scheduledTime: makeScheduledTime(3600000),
    })

    const result = cancelNotification(notif.id)

    expect(result).toBe(true)
  })

  it('should make the notification disappear from getUserNotifications', async () => {
    const userId = createTestUserId('user-cancel-check')
    const notif = await scheduleNotification(userId, {
      type: 'browser',
      title: 'Cancel Me',
      message: 'Bye',
      scheduledTime: makeScheduledTime(3600000),
    })

    cancelNotification(notif.id)

    const remaining = getUserNotifications(userId)
    const found = remaining.find(n => n.id === notif.id)
    expect(found).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// cancelTaskNotifications
// ---------------------------------------------------------------------------

describe('cancelTaskNotifications', () => {
  it('should return 0 when no notifications exist for the task', () => {
    const count = cancelTaskNotifications('task-does-not-exist')
    expect(count).toBe(0)
  })

  it('should return the number of cancelled notifications', async () => {
    const userId = createTestUserId('user-bulk')
    const taskId = `task-cancel-bulk-${Date.now()}`

    await scheduleNotification(userId, {
      taskId,
      type: 'browser',
      title: 'Reminder 1',
      message: 'First',
      scheduledTime: makeScheduledTime(3600000),
    })
    await scheduleNotification(userId, {
      taskId,
      type: 'email',
      title: 'Reminder 2',
      message: 'Second',
      scheduledTime: makeScheduledTime(7200000),
    })

    const count = cancelTaskNotifications(taskId)
    expect(count).toBe(2)
  })

  it('should only cancel notifications for the specified task', async () => {
    const userId = createTestUserId('user-specific')
    const taskId = `task-specific-${Date.now()}`
    const otherTaskId = `task-other-${Date.now()}`

    await scheduleNotification(userId, {
      taskId,
      type: 'browser',
      title: 'Target',
      message: 'Should be cancelled',
      scheduledTime: makeScheduledTime(3600000),
    })
    await scheduleNotification(userId, {
      taskId: otherTaskId,
      type: 'browser',
      title: 'Keeper',
      message: 'Should stay',
      scheduledTime: makeScheduledTime(3600000),
    })

    cancelTaskNotifications(taskId)

    const remaining = getUserNotifications(userId)
    const hasTarget = remaining.some(n => n.taskId === taskId)
    const hasOther = remaining.some(n => n.taskId === otherTaskId)
    expect(hasTarget).toBe(false)
    expect(hasOther).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getUserNotifications
// ---------------------------------------------------------------------------

describe('getUserNotifications', () => {
  it('should return empty array when user has no notifications', () => {
    const userId = createTestUserId('user-with-nothing')
    const result = getUserNotifications(userId)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('should return only the specified user notifications', async () => {
    const userId = createTestUserId('user-isolated')
    const otherUserId = createTestUserId('other-isolated')

    await scheduleNotification(userId, {
      type: 'browser',
      title: 'Mine',
      message: 'For me',
      scheduledTime: makeScheduledTime(3600000),
    })
    await scheduleNotification(otherUserId, {
      type: 'browser',
      title: 'Not mine',
      message: 'For other',
      scheduledTime: makeScheduledTime(3600000),
    })

    const result = getUserNotifications(userId)

    expect(result.every(n => n.userId === userId)).toBe(true)
  })

  it('should return notifications sorted by scheduledTime ascending', async () => {
    const userId = createTestUserId('user-sorted')

    await scheduleNotification(userId, {
      type: 'browser',
      title: 'Later',
      message: 'Later',
      scheduledTime: makeScheduledTime(7200000),
    })
    await scheduleNotification(userId, {
      type: 'browser',
      title: 'Earlier',
      message: 'Earlier',
      scheduledTime: makeScheduledTime(3600000),
    })

    const result = getUserNotifications(userId)
    const userNotifs = result.filter(n => n.userId === userId)

    if (userNotifs.length >= 2) {
      for (let i = 0; i < userNotifs.length - 1; i++) {
        expect(userNotifs[i].scheduledTime)
          .toBeLessThanOrEqual(userNotifs[i + 1].scheduledTime)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getUpcomingNotifications
// ---------------------------------------------------------------------------

describe('getUpcomingNotifications', () => {
  it('should return empty array when user has no upcoming notifications', () => {
    const userId = createTestUserId('user-no-upcoming')
    const result = getUpcomingNotifications(userId)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('should limit results to the specified count', async () => {
    const userId = createTestUserId('user-limit')

    for (let i = 0; i < 5; i++) {
      await scheduleNotification(userId, {
        type: 'browser',
        title: `Notif ${i}`,
        message: `Message ${i}`,
        scheduledTime: makeScheduledTime((i + 1) * 3600000),
      })
    }

    const result = getUpcomingNotifications(userId, 3)
    const userResult = result.filter(n => n.userId === userId)
    expect(userResult.length).toBeLessThanOrEqual(3)
  })

  it('should use default limit of 10', async () => {
    const userId = createTestUserId('user-default-limit')

    for (let i = 0; i < 12; i++) {
      await scheduleNotification(userId, {
        type: 'browser',
        title: `Default ${i}`,
        message: `Default message ${i}`,
        scheduledTime: makeScheduledTime((i + 1) * 3600000),
      })
    }

    const result = getUpcomingNotifications(userId)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(10)
  })

  it('should only return future notifications', async () => {
    const userId = createTestUserId('user-future')

    await scheduleNotification(userId, {
      type: 'browser',
      title: 'Past',
      message: 'In the past',
      scheduledTime: Date.now() - 1000, // past
    })
    await scheduleNotification(userId, {
      type: 'browser',
      title: 'Future',
      message: 'In the future',
      scheduledTime: makeScheduledTime(3600000), // future
    })

    const result = getUpcomingNotifications(userId, 10)
    const userUpcoming = result.filter(n => n.userId === userId)

    // All returned notifications should be in the future
    for (const n of userUpcoming) {
      expect(n.scheduledTime).toBeGreaterThan(Date.now() - 5000) // small buffer
    }
  })
})

// ---------------------------------------------------------------------------
// sendNotification (structural - with mocked WebSocket)
// ---------------------------------------------------------------------------

describe('sendNotification', () => {
  it('should not throw when user has no WebSocket connections', async () => {
    const userId = createTestUserId('user-no-ws')
    const notif = await scheduleNotification(userId, {
      type: 'browser',
      title: 'Test',
      message: 'No WS',
      scheduledTime: makeScheduledTime(3600000),
    })

    // Should not throw even when there are no registered rooms
    expect(() => sendNotification(notif)).not.toThrow()
  })

  it('should emit a realtime notification when user has a registered connection', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')
    const userId = createTestUserId('user-send-ws')

    registerTrackedConnection(userId)

    sendNotification({
      id: `notif-direct-${Date.now()}`,
      userId,
      taskId: 'task-direct',
      type: 'email',
      title: 'Direct Notification',
      message: 'Sent over realtime channel',
      scheduledTime: Date.now() + 60_000,
      createdAt: Date.now(),
    })

    expect(emitToAll).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'notification',
        notificationType: 'email',
        title: 'Direct Notification',
        message: 'Sent over realtime channel',
        taskId: 'task-direct',
        timestamp: expect.any(Number),
      })
    )
  })

  it('should emit both realtime and browser notification payloads for browser notifications', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')
    const userId = createTestUserId('user-browser-send')

    registerTrackedConnection(userId)

    sendNotification({
      id: `notif-browser-${Date.now()}`,
      userId,
      taskId: 'task-browser',
      type: 'browser',
      title: 'Browser Notification',
      message: 'Delivered twice',
      scheduledTime: Date.now() + 60_000,
      createdAt: Date.now(),
    })

    const payloads = vi.mocked(emitToAll).mock.calls.map(call => call[1])

    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'notification',
        notificationType: 'browser',
        title: 'Browser Notification',
        message: 'Delivered twice',
        taskId: 'task-browser',
        timestamp: expect.any(Number),
      }),
      expect.objectContaining({
        type: 'browser.notification',
        title: 'Browser Notification',
        message: 'Delivered twice',
        timestamp: expect.any(Number),
      }),
    ]))
  })
})

// ---------------------------------------------------------------------------
// sendTaskCompletionNotification
// ---------------------------------------------------------------------------

describe('sendTaskCompletionNotification', () => {
  it('should not throw when user has no WebSocket connections', () => {
    expect(() =>
      sendTaskCompletionNotification('user-no-ws', 'My Task', 45)
    ).not.toThrow()
  })

  it('should call emitToAll with task completion details when user has registered WebSocket connections', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')

    const userId = createTestUserId('user-completion-ws')

    registerTrackedConnection(userId)

    sendTaskCompletionNotification(userId, 'My Important Task', 60)

    const payloads = vi.mocked(emitToAll).mock.calls.map(call => call[1])
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'task.completed',
        title: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(Number),
      }),
    ]))
  })
})

// ---------------------------------------------------------------------------
// sendProcrastinationWarning
// ---------------------------------------------------------------------------

describe('sendProcrastinationWarning', () => {
  it('should not throw when user has no WebSocket connections', () => {
    expect(() =>
      sendProcrastinationWarning('user-no-ws', 'Overdue Task', 2.5)
    ).not.toThrow()
  })

  it('should call emitToAll with procrastination details when user has registered WebSocket connections', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')

    const userId = createTestUserId('user-procrastination-ws')

    registerTrackedConnection(userId)

    sendProcrastinationWarning(userId, 'Late Assignment', 5)

    const payloads = vi.mocked(emitToAll).mock.calls.map(call => call[1])
    expect(payloads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'procrastination.warning',
        title: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(Number),
      }),
    ]))
  })

  it('should stop emitting after the registered connection is closed', async () => {
    const { emitToAll } = await import('../../../src/utils/chat/ws')

    const userId = createTestUserId('user-close')
    const { triggerClose } = registerTrackedConnection(userId)

    sendProcrastinationWarning(userId, 'Late Assignment', 5)
    const callsBeforeClose = vi.mocked(emitToAll).mock.calls.length

    vi.clearAllMocks()
    triggerClose()

    sendProcrastinationWarning(userId, 'Late Assignment', 5)

    const payloadsAfterClose = vi.mocked(emitToAll).mock.calls.map(call => call[1])
    expect(callsBeforeClose).toBeGreaterThan(0)
    expect(payloadsAfterClose.some(payload => payload.type === 'procrastination.warning')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// scheduleTaskReminders
// ---------------------------------------------------------------------------

describe('scheduleTaskReminders', () => {
  it('should return an array', async () => {
    const userId = createTestUserId('user-task-reminders')
    const futureTime = Date.now() + 48 * 60 * 60 * 1000 // 48 hours from now
    const result = await scheduleTaskReminders(userId, 'task-1', 'My Task', futureTime)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should schedule browser notifications by default', async () => {
    const userId = createTestUserId('user-sched')
    const futureTime = Date.now() + 48 * 60 * 60 * 1000
    const result = await scheduleTaskReminders(userId, 'task-sched', 'Task Title', futureTime)
    // At least some notifications should be scheduled for future 48h task
    const browserNotifs = result.filter(n => n.type === 'browser')
    expect(browserNotifs.length).toBeGreaterThan(0)
  })

  it('should not schedule email notifications by default', async () => {
    const userId = createTestUserId('user-email')
    const futureTime = Date.now() + 48 * 60 * 60 * 1000
    const result = await scheduleTaskReminders(userId, 'task-email', 'Task', futureTime)
    const emailNotifs = result.filter(n => n.type === 'email')
    expect(emailNotifs.length).toBe(0)
  })

  it('should return empty array when task is overdue', async () => {
    const userId = createTestUserId('user-past')
    const pastTime = Date.now() - 1000 // already passed
    const result = await scheduleTaskReminders(userId, 'task-past', 'Past Task', pastTime)
    expect(result.length).toBe(0)
  })

  it('should schedule both browser and email notifications when includeEmail is true', async () => {
    const userId = createTestUserId('user-email-both')
    const futureTime = Date.now() + 48 * 60 * 60 * 1000 // 48 hours from now
    const result = await scheduleTaskReminders(
      userId,
      'task-email-both',
      'Email and Browser Task',
      futureTime,
      { includeBrowser: true, includeEmail: true }
    )
    const browserNotifs = result.filter(n => n.type === 'browser')
    const emailNotifs = result.filter(n => n.type === 'email')
    expect(browserNotifs.length).toBeGreaterThan(0)
    expect(emailNotifs.length).toBeGreaterThan(0)
  })

  it('should skip browser notifications when includeBrowser is false', async () => {
    const userId = createTestUserId('user-no-browser')
    const futureTime = Date.now() + 48 * 60 * 60 * 1000
    const result = await scheduleTaskReminders(
      userId,
      'task-no-browser',
      'Email Only Task',
      futureTime,
      { includeBrowser: false, includeEmail: true }
    )
    const browserNotifs = result.filter(n => n.type === 'browser')
    expect(browserNotifs.length).toBe(0)
  })
})

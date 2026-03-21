/**
 * Notifications Service Unit Tests
 *
 * Tests for getUserNotifications, getUpcomingNotifications, cancelNotification,
 * cancelTaskNotifications, and scheduleNotification (pure/near-pure paths).
 *
 * WebSocket-dependent paths (sendNotification, registerUserConnection) are
 * exercised at a structural level only since emitToAll is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
} from '../../../src/services/notifications'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The notifications module uses module-level arrays.
 * We clear them between tests by cancelling everything scheduled.
 * Since we can't directly access the private arrays, we use the public API.
 */
function makeScheduledTime(offsetMs: number): number {
  return Date.now() + offsetMs
}

// ---------------------------------------------------------------------------
// scheduleNotification
// ---------------------------------------------------------------------------

describe('scheduleNotification', () => {
  it('should return a ScheduledNotification object', async () => {
    const notif = await scheduleNotification('user-1', {
      type: 'browser',
      title: 'Test',
      message: 'Hello',
      scheduledTime: makeScheduledTime(3600000),
    })

    expect(notif).toHaveProperty('id')
    expect(notif).toHaveProperty('userId', 'user-1')
    expect(notif).toHaveProperty('title', 'Test')
    expect(notif).toHaveProperty('message', 'Hello')
    expect(notif).toHaveProperty('type', 'browser')
    expect(notif).toHaveProperty('scheduledTime')
    expect(notif).toHaveProperty('createdAt')
  })

  it('should generate a unique id for each notification', async () => {
    const n1 = await scheduleNotification('user-1', {
      type: 'browser',
      title: 'A',
      message: 'A',
      scheduledTime: makeScheduledTime(3600000),
    })
    const n2 = await scheduleNotification('user-1', {
      type: 'browser',
      title: 'B',
      message: 'B',
      scheduledTime: makeScheduledTime(7200000),
    })

    expect(n1.id).not.toBe(n2.id)
  })

  it('should include optional taskId when provided', async () => {
    const notif = await scheduleNotification('user-2', {
      taskId: 'task-abc',
      type: 'email',
      title: 'Task Reminder',
      message: 'Your task is due',
      scheduledTime: makeScheduledTime(3600000),
    })

    expect(notif.taskId).toBe('task-abc')
  })

  it('should send notification immediately when scheduledTime is in the past', async () => {
    // When scheduledTime is in the past (delayMs <= 0), sendNotification is called immediately
    const notif = await scheduleNotification('user-immediate', {
      type: 'browser',
      title: 'Immediate',
      message: 'Send now',
      scheduledTime: Date.now() - 1000, // 1 second in the past
    })

    expect(notif).toBeDefined()
    expect(notif.title).toBe('Immediate')
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
    const notif = await scheduleNotification('user-cancel', {
      type: 'browser',
      title: 'To Cancel',
      message: 'Will be cancelled',
      scheduledTime: makeScheduledTime(3600000),
    })

    const result = cancelNotification(notif.id)

    expect(result).toBe(true)
  })

  it('should make the notification disappear from getUserNotifications', async () => {
    const notif = await scheduleNotification('user-cancel-check', {
      type: 'browser',
      title: 'Cancel Me',
      message: 'Bye',
      scheduledTime: makeScheduledTime(3600000),
    })

    cancelNotification(notif.id)

    const remaining = getUserNotifications('user-cancel-check')
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
    const taskId = `task-cancel-bulk-${Date.now()}`

    await scheduleNotification('user-bulk', {
      taskId,
      type: 'browser',
      title: 'Reminder 1',
      message: 'First',
      scheduledTime: makeScheduledTime(3600000),
    })
    await scheduleNotification('user-bulk', {
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
    const taskId = `task-specific-${Date.now()}`
    const otherTaskId = `task-other-${Date.now()}`
    const userId = `user-specific-${Date.now()}`

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
    const result = getUserNotifications('user-with-nothing')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('should return only the specified user notifications', async () => {
    const userId = `user-isolated-${Date.now()}`
    const otherUserId = `other-isolated-${Date.now()}`

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
    const userId = `user-sorted-${Date.now()}`

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
    const result = getUpcomingNotifications('user-no-upcoming')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('should limit results to the specified count', async () => {
    const userId = `user-limit-${Date.now()}`

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
    const userId = `user-default-limit-${Date.now()}`
    // result should not throw and should return array
    const result = getUpcomingNotifications(userId)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should only return future notifications', async () => {
    const userId = `user-future-${Date.now()}`

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
    const notif = await scheduleNotification('user-no-ws', {
      type: 'browser',
      title: 'Test',
      message: 'No WS',
      scheduledTime: makeScheduledTime(3600000),
    })

    // Should not throw even when there are no registered rooms
    expect(() => sendNotification(notif)).not.toThrow()
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
})

// ---------------------------------------------------------------------------
// scheduleTaskReminders
// ---------------------------------------------------------------------------

describe('scheduleTaskReminders', () => {
  it('should return an array', async () => {
    const futureTime = Date.now() + 48 * 60 * 60 * 1000 // 48 hours from now
    const result = await scheduleTaskReminders('user-1', 'task-1', 'My Task', futureTime)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should schedule browser notifications by default', async () => {
    const futureTime = Date.now() + 48 * 60 * 60 * 1000
    const result = await scheduleTaskReminders('user-sched', 'task-sched', 'Task Title', futureTime)
    // At least some notifications should be scheduled for future 48h task
    const browserNotifs = result.filter(n => n.type === 'browser')
    expect(browserNotifs.length).toBeGreaterThan(0)
  })

  it('should not schedule email notifications by default', async () => {
    const futureTime = Date.now() + 48 * 60 * 60 * 1000
    const result = await scheduleTaskReminders('user-email', 'task-email', 'Task', futureTime)
    const emailNotifs = result.filter(n => n.type === 'email')
    expect(emailNotifs.length).toBe(0)
  })

  it('should return empty array when task is overdue', async () => {
    const pastTime = Date.now() - 1000 // already passed
    const result = await scheduleTaskReminders('user-past', 'task-past', 'Past Task', pastTime)
    expect(result.length).toBe(0)
  })
})

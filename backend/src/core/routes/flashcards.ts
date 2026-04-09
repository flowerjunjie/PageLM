import crypto from 'crypto'
import db from '../../utils/database/keyv'
import { scheduleReview, deleteReviewSchedule } from '../../services/spaced-repetition'
import { requireAuth } from '../middleware/auth'
import { userKey, userKeyPrefix, getUserId } from '../middleware/auth-keyv'

export function flashcardRoutes(app: any) {
  // Input validation constants
  const MAX_QUESTION_LENGTH = 5000
  const MAX_ANSWER_LENGTH = 10000
  const MAX_TAG_LENGTH = 100

  app.post('/flashcards', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)

      // Check if req.body exists (JSON parsing might fail)
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).send({ ok: false, error: 'Invalid request body' })
      }

      const { question, answer, tag } = req.body
      if (!question || !answer || !tag) {
        return res.status(400).send({ ok: false, error: 'question, answer, tag required' })
      }

      // Validate input types
      if (typeof question !== 'string' || typeof answer !== 'string' || typeof tag !== 'string') {
        return res.status(400).send({ ok: false, error: 'question, answer, tag must be strings' })
      }

      // Validate input length
      if (question.trim().length === 0 || answer.trim().length === 0 || tag.trim().length === 0) {
        return res.status(400).send({ ok: false, error: 'question, answer, tag cannot be empty' })
      }

      // Validate input length limits to prevent DoS
      if (question.length > MAX_QUESTION_LENGTH) {
        return res.status(400).send({ ok: false, error: `question too long (max ${MAX_QUESTION_LENGTH} chars)` })
      }
      if (answer.length > MAX_ANSWER_LENGTH) {
        return res.status(400).send({ ok: false, error: `answer too long (max ${MAX_ANSWER_LENGTH} chars)` })
      }
      if (tag.length > MAX_TAG_LENGTH) {
        return res.status(400).send({ ok: false, error: `tag too long (max ${MAX_TAG_LENGTH} chars)` })
      }

      const id = crypto.randomUUID()
      const card = {
        id,
        question: question.trim(),
        answer: answer.trim(),
        tag: tag.trim(),
        created: Date.now(),
        userId  // Associate card with user
      }

      // User-isolated storage
      const cardsKey = userKey(userId, 'flashcards')
      const cardKey = userKey(userId, 'flashcard', id)

      let cards = await db.get(cardsKey) || []
      cards.push(card)
      await db.set(cardKey, card)
      await db.set(cardsKey, cards)

      // Automatically create review schedule for the new flashcard
      await scheduleReview(id, userId)

      res.send({ ok: true, flashcard: card })
    } catch (e: any) {
      console.error('Flashcard creation error:', e)
      res.status(500).send({ ok: false, error: 'Failed to create flashcard' })
    }
  })

  app.get('/flashcards', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const cardsKey = userKey(userId, 'flashcards')
      res.send({ ok: true, flashcards: await db.get(cardsKey) || [] })
    } catch (e: any) {
      console.error('Flashcard list error:', e)
      res.status(500).send({ ok: false, error: 'Failed to retrieve flashcards' })
    }
  })

  app.delete('/flashcards/:id', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const id = req.params.id
      if (!id) {
        return res.status(400).send({ ok: false, error: 'id required' })
      }

      const cardsKey = userKey(userId, 'flashcards')
      const cardKey = userKey(userId, 'flashcard', id)

      // Check if flashcard exists and belongs to user before deleting
      const existing = await db.get(cardKey)
      if (!existing) {
        return res.status(404).send({ ok: false, error: 'Flashcard not found' })
      }

      // Verify ownership
      if ((existing as any).userId && (existing as any).userId !== userId) {
        return res.status(403).send({ ok: false, error: 'Access denied' })
      }

      await db.delete(cardKey)
      let cards = await db.get(cardsKey) || []
      cards = cards.filter((c: any) => c.id !== id)
      await db.set(cardsKey, cards)

      // Delete associated review schedule
      await deleteReviewSchedule(id)

      res.send({ ok: true })
    } catch (e: any) {
      console.error('Flashcard delete error:', e)
      res.status(500).send({ ok: false, error: 'Failed to delete flashcard' })
    }
  })
}

import crypto from 'crypto'
import db from '../../utils/database/keyv'
import { scheduleReview, deleteReviewSchedule } from '../../services/spaced-repetition'

export function flashcardRoutes(app: any) {
  app.post('/flashcards', async (req: any, res: any) => {
    try {
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
      
      const id = crypto.randomUUID()
      const card = { id, question: question.trim(), answer: answer.trim(), tag: tag.trim(), created: Date.now() }
      let cards = await db.get('flashcards') || []
      cards.push(card)
      await db.set(`flashcard:${id}`, card)
      await db.set('flashcards', cards)

      // Automatically create review schedule for the new flashcard
      await scheduleReview(id)

      res.send({ ok: true, flashcard: card })
    } catch (e: any) {
      console.error('Flashcard creation error:', e)
      res.status(500).send({ ok: false, error: 'Failed to create flashcard' })
    }
  })

  app.get('/flashcards', async (_: any, res: any) => {
    try {
      res.send({ ok: true, flashcards: await db.get('flashcards') || [] })
    } catch (e: any) {
      console.error('Flashcard list error:', e)
      res.status(500).send({ ok: false, error: 'Failed to retrieve flashcards' })
    }
  })

  app.delete('/flashcards/:id', async (req: any, res: any) => {
    try {
      const id = req.params.id
      if (!id) {
        return res.status(400).send({ ok: false, error: 'id required' })
      }
      
      // Check if flashcard exists before deleting
      const existing = await db.get(`flashcard:${id}`)
      if (!existing) {
        return res.status(404).send({ ok: false, error: 'Flashcard not found' })
      }
      
      await db.delete(`flashcard:${id}`)
      let cards = await db.get('flashcards') || []
      cards = cards.filter((c: any) => c.id !== id)
      await db.set('flashcards', cards)

      // Delete associated review schedule
      await deleteReviewSchedule(id)

      res.send({ ok: true })
    } catch (e: any) {
      console.error('Flashcard delete error:', e)
      res.status(500).send({ ok: false, error: 'Failed to delete flashcard' })
    }
  })
}

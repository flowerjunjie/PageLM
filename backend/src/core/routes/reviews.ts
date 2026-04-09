import {
  getDueReviews,
  getAllReviews,
  updateReviewResult,
  getReviewStats,
  deleteReviewSchedule,
  ReviewSchedule,
} from '../../services/spaced-repetition'
import { requireAuth } from '../middleware/auth'
import { getUserId } from '../middleware/auth-keyv'

export function reviewRoutes(app: any) {
  /**
   * GET /api/reviews/due
   * Get today's due reviews
   */
  app.get('/api/reviews/due', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const dueReviews = await getDueReviews(userId)

      res.send({
        success: true,
        data: dueReviews,
        meta: {
          total: dueReviews.length,
        },
      })
    } catch (error: any) {
      console.error('[reviews] Error getting due reviews:', error)
      res.status(500).send({
        success: false,
        error: 'Failed to get due reviews',
      })
    }
  })

  /**
   * GET /api/reviews/all
   * Get all review schedules for user
   */
  app.get('/api/reviews/all', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const reviews = await getAllReviews(userId)

      res.send({
        success: true,
        data: reviews,
        meta: {
          total: reviews.length,
        },
      })
    } catch (error: any) {
      console.error('[reviews] Error getting all reviews:', error)
      res.status(500).send({
        success: false,
        error: 'Failed to get reviews',
      })
    }
  })

  /**
   * POST /api/reviews/:id/result
   * Submit review result
   * Body: { quality: number } // 0-5
   */
  app.post('/api/reviews/:id/result', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const { id } = req.params
      const { quality } = req.body

      // Validate input
      if (typeof quality !== 'number' || quality < 0 || quality > 5) {
        return res.status(400).send({
          success: false,
          error: 'Quality must be a number between 0 and 5',
        })
      }

      const updatedSchedule = await updateReviewResult(id, quality, userId)

      if (!updatedSchedule) {
        return res.status(404).send({
          success: false,
          error: 'Review schedule not found',
        })
      }

      res.send({
        success: true,
        data: updatedSchedule,
      })
    } catch (error: any) {
      console.error('[reviews] Error updating review result:', error)
      res.status(500).send({
        success: false,
        error: 'Failed to update review result',
      })
    }
  })

  /**
   * GET /api/reviews/stats
   * Get review statistics
   */
  app.get('/api/reviews/stats', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const stats = await getReviewStats(userId)

      res.send({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      console.error('[reviews] Error getting review stats:', error)
      res.status(500).send({
        success: false,
        error: 'Failed to get review statistics',
      })
    }
  })

  /**
   * DELETE /api/reviews/:id
   * Delete a review schedule
   */
  app.delete('/api/reviews/:id', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const { id } = req.params

      await deleteReviewSchedule(id, userId)

      res.send({
        success: true,
        message: 'Review schedule deleted',
      })
    } catch (error: any) {
      console.error('[reviews] Error deleting review schedule:', error)
      res.status(500).send({
        success: false,
        error: 'Failed to delete review schedule',
      })
    }
  })
}

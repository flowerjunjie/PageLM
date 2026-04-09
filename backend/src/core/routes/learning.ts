import {
  getLearningProfile,
  getLearningStats,
  getKnowledgeMapData,
  getSubjectStats,
  getRecentActivity,
  identifyWeakAreas,
  calculateLearningTrend
} from '../../services/analytics'
import { requireAuth } from '../middleware/auth'
import { getUserId } from '../middleware/auth-keyv'

export function learningRoutes(app: any) {
  app.get('/api/learning/profile', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const profile = await getLearningProfile(userId)
      res.send({ ok: true, profile })
    } catch (e: any) {
      console.error('[learning] profile error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load learning profile' })
    }
  })

  app.get('/api/learning/stats', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const stats = await getLearningStats(userId)
      res.send({ ok: true, stats })
    } catch (e: any) {
      console.error('[learning] stats error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load learning stats' })
    }
  })

  app.get('/api/learning/knowledge-map', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const data = await getKnowledgeMapData(userId)
      res.send({ ok: true, ...data })
    } catch (e: any) {
      console.error('[learning] knowledge-map error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load knowledge map' })
    }
  })

  app.get('/api/learning/subjects', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const subjects = await getSubjectStats(userId)
      res.send({ ok: true, subjects })
    } catch (e: any) {
      console.error('[learning] subjects error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load subject stats' })
    }
  })

  app.get('/api/learning/activity', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const limit = parseInt(req.query.limit) || 10
      const activity = await getRecentActivity(userId, limit)
      res.send({ ok: true, activity })
    } catch (e: any) {
      console.error('[learning] activity error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load activity' })
    }
  })

  app.get('/api/learning/weak-areas', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const weakAreas = await identifyWeakAreas(userId)
      res.send({ ok: true, weakAreas })
    } catch (e: any) {
      console.error('[learning] weak-areas error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to identify weak areas' })
    }
  })

  app.get('/api/learning/trend', requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const days = parseInt(req.query.days) || 30
      const trend = await calculateLearningTrend(userId, days)
      res.send({ ok: true, trend })
    } catch (e: any) {
      console.error('[learning] trend error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to calculate trend' })
    }
  })
}
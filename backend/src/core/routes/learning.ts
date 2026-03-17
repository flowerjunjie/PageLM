import {
  getLearningProfile,
  getLearningStats,
  getKnowledgeMapData,
  getSubjectStats,
  getRecentActivity,
  identifyWeakAreas,
  calculateLearningTrend
} from '../../services/analytics'

export function learningRoutes(app: any) {
  app.get('/api/learning/profile', async (_req: any, res: any) => {
    try {
      const profile = await getLearningProfile()
      res.send({ ok: true, profile })
    } catch (e: any) {
      console.error('[learning] profile error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load learning profile' })
    }
  })

  app.get('/api/learning/stats', async (_req: any, res: any) => {
    try {
      const stats = await getLearningStats()
      res.send({ ok: true, stats })
    } catch (e: any) {
      console.error('[learning] stats error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load learning stats' })
    }
  })

  app.get('/api/learning/knowledge-map', async (_req: any, res: any) => {
    try {
      const data = await getKnowledgeMapData()
      res.send({ ok: true, ...data })
    } catch (e: any) {
      console.error('[learning] knowledge-map error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load knowledge map' })
    }
  })

  app.get('/api/learning/subjects', async (_req: any, res: any) => {
    try {
      const subjects = await getSubjectStats()
      res.send({ ok: true, subjects })
    } catch (e: any) {
      console.error('[learning] subjects error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load subject stats' })
    }
  })

  app.get('/api/learning/activity', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit) || 10
      const activity = await getRecentActivity(limit)
      res.send({ ok: true, activity })
    } catch (e: any) {
      console.error('[learning] activity error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to load activity' })
    }
  })

  app.get('/api/learning/weak-areas', async (_req: any, res: any) => {
    try {
      const weakAreas = await identifyWeakAreas()
      res.send({ ok: true, weakAreas })
    } catch (e: any) {
      console.error('[learning] weak-areas error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to identify weak areas' })
    }
  })

  app.get('/api/learning/trend', async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days) || 30
      const trend = await calculateLearningTrend(days)
      res.send({ ok: true, trend })
    } catch (e: any) {
      console.error('[learning] trend error:', e?.message || e)
      res.status(500).send({ ok: false, error: 'Failed to calculate trend' })
    }
  })
}

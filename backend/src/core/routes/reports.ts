import {
  generateWeeklyReport,
  createShareToken,
  getWeeklyReportByToken,
  cleanupExpiredTokens
} from '../../services/reports'
import { requireAuth } from '../middleware/auth'
import { getUserId } from '../middleware/auth-keyv'

export function reportRoutes(app: any) {
  // GET /api/reports/weekly - Generate weekly report data
  app.get('/api/reports/weekly', requireAuth, async (req: any, res: any) => {
    try {
      const week = req.query.week as string | undefined
      const userId = getUserId(req)

      const report = await generateWeeklyReport(userId, week)

      res.send({
        ok: true,
        report
      })
    } catch (e: any) {
      console.error('[reports] weekly error:', e)
      res.status(500).send({
        ok: false,
        error: e?.message || 'Failed to generate weekly report'
      })
    }
  })

  // POST /api/reports/share - Create share link
  app.post('/api/reports/share', requireAuth, async (req: any, res: any) => {
    try {
      const { week } = req.body || {}

      if (!week) {
        return res.status(400).send({
          ok: false,
          error: 'week is required'
        })
      }

      // Validate week format (YYYY-WXX)
      const weekRegex = /^\d{4}-W\d{2}$/
      if (!weekRegex.test(week)) {
        return res.status(400).send({
          ok: false,
          error: 'Invalid week format. Use YYYY-WXX (e.g., 2026-W11)'
        })
      }

      const userId = getUserId(req)

      // Clean up expired tokens periodically
      await cleanupExpiredTokens()

      const token = await createShareToken(userId, week)

      // Construct share URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      const shareUrl = `${baseUrl}/report/share/${token}`

      res.send({
        ok: true,
        token,
        shareUrl,
        expiresIn: '7 days'
      })
    } catch (e: any) {
      console.error('[reports] share create error:', e)
      res.status(500).send({
        ok: false,
        error: e?.message || 'Failed to create share link'
      })
    }
  })

  // GET /api/reports/share/:token - Parent view endpoint (read-only)
  app.get('/api/reports/share/:token', async (req: any, res: any) => {
    try {
      const { token } = req.params

      if (!token) {
        return res.status(400).send({
          ok: false,
          error: 'Token is required'
        })
      }

      const report = await getWeeklyReportByToken(token)

      if (!report) {
        return res.status(404).send({
          ok: false,
          error: 'Invalid or expired share link'
        })
      }

      // Return report without sensitive data (no chat history, no personal info)
      res.send({
        ok: true,
        report: {
          week: report.week,
          startDate: report.startDate,
          endDate: report.endDate,
          summary: report.summary,
          dailyStats: report.dailyStats,
          subjectDistribution: report.subjectDistribution,
          weakAreas: report.weakAreas,
          suggestions: report.suggestions,
          comparison: report.comparison
        }
      })
    } catch (e: any) {
      console.error('[reports] share view error:', e)
      res.status(500).send({
        ok: false,
        error: e?.message || 'Failed to retrieve shared report'
      })
    }
  })

  // GET /api/reports/available-weeks - Get list of weeks with data
  app.get('/api/reports/available-weeks', requireAuth, async (req: any, res: any) => {
    try {
      // For now, return current week and previous 3 weeks
      const weeks: string[] = []
      const now = new Date()

      for (let i = 0; i < 4; i++) {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const year = date.getFullYear()
        const jan1 = new Date(year, 0, 1)
        const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000)
        const weekNum = Math.ceil((days + 1) / 7)
        weeks.push(`${year}-W${String(weekNum).padStart(2, '0')}`)
      }

      res.send({
        ok: true,
        weeks
      })
    } catch (e: any) {
      console.error('[reports] available-weeks error:', e)
      res.status(500).send({
        ok: false,
        error: e?.message || 'Failed to retrieve available weeks'
      })
    }
  })
}

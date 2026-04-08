import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getSharedReport, type WeeklyReport } from '../lib/api'

echarts.use([
  BarChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, GraphicComponent,
  CanvasRenderer
])

interface StatCardProps {
  label: string
  value: number | string
  unit?: string
  icon: string
  color: 'blue' | 'green' | 'orange' | 'purple'
}

function StatCard({ label, value, unit, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-60">{unit}</span>}
      </div>
    </div>
  )
}

export default function ParentView() {
  const { t } = useTranslation('reports')
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const studyTimeChartRef = useRef<echarts.ECharts | null>(null)
  const subjectChartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (token) {
      loadReport()
    }
  }, [token])

  useEffect(() => {
    return () => {
      studyTimeChartRef.current?.dispose()
      subjectChartRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (report) {
      initCharts()
    }
  }, [report])

  const loadReport = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await getSharedReport(token)
      setReport(data)
    } catch (e: any) {
      setError(e?.message || t('errors.expiredLink'))
    } finally {
      setLoading(false)
    }
  }

  const initCharts = () => {
    if (!report) return

    // Study time trend chart
    const studyTimeDom = document.getElementById('parentStudyTimeChart')
    if (studyTimeDom) {
      studyTimeChartRef.current?.dispose()
      studyTimeChartRef.current = echarts.init(studyTimeDom)
      studyTimeChartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#1c1917',
          borderColor: '#44403c',
          textStyle: { color: '#e7e5e4' }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: report.dailyStats.map(d => {
            const date = new Date(d.date)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }),
          axisLine: { lineStyle: { color: '#44403c' } },
          axisLabel: { color: '#a8a29e' }
        },
        yAxis: {
          type: 'value',
          name: t('charts.minutes'),
          nameTextStyle: { color: '#a8a29e' },
          axisLine: { lineStyle: { color: '#44403c' } },
          axisLabel: { color: '#a8a29e' },
          splitLine: { lineStyle: { color: '#292524' } }
        },
        series: [{
          data: report.dailyStats.map(d => d.studyTime),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }]
      })
    }

    // Subject distribution chart
    const subjectDom = document.getElementById('parentSubjectChart')
    if (subjectDom) {
      subjectChartRef.current?.dispose()
      subjectChartRef.current = echarts.init(subjectDom)
      subjectChartRef.current.setOption({
        tooltip: {
          trigger: 'item',
          backgroundColor: '#1c1917',
          borderColor: '#44403c',
          textStyle: { color: '#e7e5e4' },
          formatter: '{b}: {c}%'
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          textStyle: { color: '#a8a29e' }
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#1c1917',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#e7e5e4'
            }
          },
          data: report.subjectDistribution.map(s => ({
            name: s.subject,
            value: s.percentage
          }))
        }]
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full mx-auto mb-4" />
          <p className="text-stone-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <span className="text-5xl mb-4 block">🔒</span>
          <h1 className="text-xl font-bold text-stone-200 mb-2">{t('errors.expiredLink')}</h1>
          <p className="text-stone-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center">
        <p className="text-stone-500">{t('noData')}</p>
      </div>
    )
  }

  const weekStart = new Date(report.startDate).toLocaleDateString()
  const weekEnd = new Date(report.endDate).toLocaleDateString()

  return (
    <div className="min-h-screen bg-black text-stone-300">
      {/* Header */}
      <div className="bg-stone-900/50 border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📊</span>
            <div>
              <h1 className="text-2xl font-bold text-stone-100">{t('parentView.title')}</h1>
              <p className="text-stone-500">{t('parentView.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-stone-500">
            <span className="flex items-center gap-2">
              <span>👤</span>
              {t('parentView.studentLabel')}: <span className="text-stone-300">Student</span>
            </span>
            <span className="flex items-center gap-2">
              <span>📅</span>
              {t('parentView.weekLabel')}: <span className="text-stone-300">{report.week}</span>
              <span className="text-stone-600">({weekStart} - {weekEnd})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-blue-500/10 border-b border-blue-500/20">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <p className="text-sm text-blue-400 flex items-center gap-2">
            <span>ℹ️</span>
            {t('parentView.disclaimer')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={t('summary.studyTime')}
            value={report.summary.totalStudyTime}
            unit={t('summary.minutes')}
            icon="⏱️"
            color="blue"
          />
          <StatCard
            label={t('summary.studyDays')}
            value={report.summary.studyDays}
            unit={t('summary.days')}
            icon="📅"
            color="green"
          />
          <StatCard
            label={t('summary.flashcards')}
            value={report.summary.flashcardsCreated}
            unit={t('summary.cards')}
            icon="🎴"
            color="orange"
          />
          <StatCard
            label={t('summary.accuracy')}
            value={`${report.summary.averageAccuracy}%`}
            icon="🎯"
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5">
            <h3 className="text-stone-200 font-medium mb-4">{t('charts.studyTimeTrend')}</h3>
            <div id="parentStudyTimeChart" className="w-full h-64" />
          </div>
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5">
            <h3 className="text-stone-200 font-medium mb-4">{t('charts.subjectDistribution')}</h3>
            <div id="parentSubjectChart" className="w-full h-64" />
          </div>
        </div>

        {/* Weak Areas & Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weak Areas */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5">
            <h3 className="text-stone-200 font-medium mb-2">{t('weakAreas.title')}</h3>
            <p className="text-stone-500 text-sm mb-4">{t('weakAreas.description')}</p>
            {report.weakAreas.length > 0 ? (
              <ul className="space-y-2">
                {report.weakAreas.map((area, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 bg-stone-800/50 rounded-lg"
                  >
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <span className="text-stone-300">{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-stone-500">
                <span className="text-3xl mb-2 block">🎉</span>
                <p>{t('weakAreas.empty')}</p>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5">
            <h3 className="text-stone-200 font-medium mb-2">{t('suggestions.title')}</h3>
            <p className="text-stone-500 text-sm mb-4">{t('suggestions.description')}</p>
            <ul className="space-y-3">
              {report.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 px-3 py-2 bg-stone-800/50 rounded-lg"
                >
                  <span className="text-green-400 mt-0.5">💡</span>
                  <span className="text-stone-300 text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-stone-800 text-center text-stone-600 text-sm">
          <p>{t('parentView.disclaimer')}</p>
          <p className="mt-2">Generated by 灵犀AI学习系统</p>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as echarts from 'echarts'
import { getWeeklyReport, getAvailableWeeks, createShareLink, type WeeklyReport } from '../lib/api'
import ShareReportModal from '../components/ShareReportModal'

interface ChartContainerProps {
  title: string
  chartId: string
  className?: string
}

function ChartContainer({ title, chartId, className = '' }: ChartContainerProps) {
  return (
    <div className={`bg-stone-900/50 border border-stone-800 rounded-xl p-4 ${className}`}>
      <h3 className="text-stone-200 font-medium mb-4 text-sm">{title}</h3>
      <div id={chartId} className="w-full h-64" />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  unit,
  change,
  icon
}: {
  label: string
  value: number | string
  unit?: string
  change?: number
  icon: string
}) {
  return (
    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-stone-400 text-xs">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-stone-100">{value}</span>
          {unit && <span className="text-stone-500 text-sm">{unit}</span>}
        </div>
        {change !== undefined && (
          <span className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function WeeklyReport() {
  const { t } = useTranslation('reports')
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  const studyTimeChartRef = useRef<echarts.ECharts | null>(null)
  const subjectChartRef = useRef<echarts.ECharts | null>(null)
  const accuracyChartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    loadAvailableWeeks()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      loadReport(selectedWeek)
    }
  }, [selectedWeek])

  useEffect(() => {
    return () => {
      studyTimeChartRef.current?.dispose()
      subjectChartRef.current?.dispose()
      accuracyChartRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (report) {
      initCharts()
    }
  }, [report])

  const loadAvailableWeeks = async () => {
    try {
      const weeks = await getAvailableWeeks()
      setAvailableWeeks(weeks)
      if (weeks.length > 0 && !selectedWeek) {
        setSelectedWeek(weeks[0])
      }
    } catch (e) {
      console.error('Failed to load available weeks:', e)
    }
  }

  const loadReport = async (week: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getWeeklyReport(week)
      setReport(data)
    } catch (e: any) {
      setError(e?.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const initCharts = () => {
    if (!report) return

    // Study time trend chart (bar)
    const studyTimeDom = document.getElementById('studyTimeChart')
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

    // Subject distribution chart (pie)
    const subjectDom = document.getElementById('subjectChart')
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

    // Accuracy trend chart (line)
    const accuracyDom = document.getElementById('accuracyChart')
    if (accuracyDom) {
      accuracyChartRef.current?.dispose()
      accuracyChartRef.current = echarts.init(accuracyDom)
      accuracyChartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#1c1917',
          borderColor: '#44403c',
          textStyle: { color: '#e7e5e4' },
          formatter: '{b}: {c}%'
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisLine: { lineStyle: { color: '#44403c' } },
          axisLabel: { color: '#a8a29e' }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          name: t('charts.correctRate'),
          nameTextStyle: { color: '#a8a29e' },
          axisLine: { lineStyle: { color: '#44403c' } },
          axisLabel: {
            color: '#a8a29e',
            formatter: '{value}%'
          },
          splitLine: { lineStyle: { color: '#292524' } }
        },
        series: [{
          data: [65, 72, 68, 80, 85, 78, report.summary.averageAccuracy],
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#3b82f6', width: 3 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ])
          }
        }]
      })
    }
  }

  const handleShare = async () => {
    if (!report) return
    try {
      const url = await createShareLink(report.week)
      setShareUrl(url)
      setIsShareModalOpen(true)
    } catch (e: any) {
      alert(t('errors.shareFailed'))
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
      <div className="min-h-screen bg-black text-stone-300 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => loadReport(selectedWeek)}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm"
          >
            {t('common:retry')}
          </button>
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

  return (
    <div className="min-h-screen bg-black text-stone-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">{t('title')}</h1>
            <p className="text-stone-500 text-sm mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-stone-500"
            >
              {availableWeeks.map((week) => (
                <option key={week} value={week}>
                  {week === availableWeeks[0] ? t('weekSelector.thisWeek') :
                   week === availableWeeks[1] ? t('weekSelector.lastWeek') : week}
                </option>
              ))}
            </select>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-stone-100 text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors flex items-center gap-2"
            >
              <span>🔗</span>
              {t('share.button')}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label={t('summary.studyTime')}
            value={report.summary.totalStudyTime}
            unit={t('summary.minutes')}
            change={report.comparison.studyTimeChange}
            icon="⏱️"
          />
          <SummaryCard
            label={t('summary.studyDays')}
            value={report.summary.studyDays}
            unit={t('summary.days')}
            icon="📅"
          />
          <SummaryCard
            label={t('summary.flashcards')}
            value={report.summary.flashcardsCreated}
            unit={t('summary.cards')}
            icon="🎴"
          />
          <SummaryCard
            label={t('summary.accuracy')}
            value={`${report.summary.averageAccuracy}%`}
            change={report.comparison.accuracyChange}
            icon="🎯"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartContainer
            title={t('charts.studyTimeTrend')}
            chartId="studyTimeChart"
          />
          <ChartContainer
            title={t('charts.subjectDistribution')}
            chartId="subjectChart"
          />
        </div>

        {/* Accuracy Chart - Full Width */}
        <div className="mb-8">
          <ChartContainer
            title={t('charts.accuracyTrend')}
            chartId="accuracyChart"
            className="w-full"
          />
        </div>

        {/* Weak Areas & Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weak Areas */}
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
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
          <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6">
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
      </div>

      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  )
}

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface TaskStats {
    overall: {
        totalTasks: number
        completedTasks: number
        completionRate: number
        overdueTasks: number
    }
    weekly: {
        total: number
        completed: number
        completionRate: number
    }
    timeEstimates: {
        avgAccuracy: number
        totalEstimatedMinutes: number
        totalActualMinutes: number
    }
    subjects: Record<string, {
        total: number
        completed: number
        totalMinutes: number
    }>
    priorities: {
        high: number
        medium: number
        low: number
    }
    procrastination: {
        overdueCount: number
        overdueTasks: Array<{
            id: string
            title: string
            dueAt: string
            hoursOverdue: number
        }>
    }
}

export default function PlannerStats() {
    const { t } = useTranslation('planner')
    const [stats, setStats] = useState<TaskStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/planner/stats/detailed')
            if (!response.ok) {
                throw new Error('Failed to load stats')
            }
            const data = await response.json()
            if (data.ok) {
                setStats(data.stats)
            }
        } catch (err) {
            setError(t('stats.error', { defaultValue: '加载统计失败' }))
        } finally {
            setLoading(false)
        }
    }

    const formatMinutes = (mins: number) => {
        const hours = Math.floor(mins / 60)
        const minutes = mins % 60
        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-400">{t('stats.loading', { defaultValue: '加载中...' })}</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200">
                {error}
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title={t('stats.totalTasks', { defaultValue: '总任务' })}
                    value={stats.overall.totalTasks}
                    icon="📋"
                />
                <StatCard
                    title={t('stats.completed', { defaultValue: '已完成' })}
                    value={`${stats.overall.completionRate}%`}
                    icon="✅"
                    color="green"
                />
                <StatCard
                    title={t('stats.weeklyCompleted', { defaultValue: '本周完成' })}
                    value={`${stats.weekly.completionRate}%`}
                    icon="📅"
                    color="blue"
                />
                <StatCard
                    title={t('stats.overdue', { defaultValue: '已逾期' })}
                    value={stats.procrastination.overdueCount}
                    icon="⚠️"
                    color={stats.procrastination.overdueCount > 0 ? 'red' : 'gray'}
                />
            </div>

            {/* Time Estimates */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <h3 className="text-zinc-200 font-medium mb-4">
                    {t('stats.timeEstimates', { defaultValue: '时间预估准确度' })}
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-400">{t('stats.accuracy', { defaultValue: '预估准确度' })}</span>
                        <span className={`font-medium ${
                            stats.timeEstimates.avgAccuracy >= 80 ? 'text-green-400' :
                            stats.timeEstimates.avgAccuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                            {stats.timeEstimates.avgAccuracy}%
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${
                                stats.timeEstimates.avgAccuracy >= 80 ? 'bg-green-500' :
                                stats.timeEstimates.avgAccuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(stats.timeEstimates.avgAccuracy, 100)}%` }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-zinc-800 rounded-lg p-3">
                            <div className="text-zinc-500 text-xs">{t('stats.totalEstimated', { defaultValue: '总预估时间' })}</div>
                            <div className="text-zinc-200 font-medium">{formatMinutes(stats.timeEstimates.totalEstimatedMinutes)}</div>
                        </div>
                        <div className="bg-zinc-800 rounded-lg p-3">
                            <div className="text-zinc-500 text-xs">{t('stats.totalActual', { defaultValue: '总实际时间' })}</div>
                            <div className={`font-medium ${
                                stats.timeEstimates.totalActualMinutes > stats.timeEstimates.totalEstimatedMinutes
                                    ? 'text-red-400' : 'text-green-400'
                            }`}>
                                {formatMinutes(stats.timeEstimates.totalActualMinutes)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject Distribution */}
            {Object.keys(stats.subjects).length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-zinc-200 font-medium mb-4">
                        {t('stats.subjectDistribution', { defaultValue: '科目分布' })}
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(stats.subjects)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([subject, data]) => {
                                const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0
                                return (
                                    <div key={subject} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-300 capitalize">{subject}</span>
                                            <span className="text-zinc-400">
                                                {data.completed}/{data.total} ({Math.round(completionRate)}%)
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${completionRate}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}

            {/* Priority Distribution */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <h3 className="text-zinc-200 font-medium mb-4">
                    {t('stats.priorityDistribution', { defaultValue: '优先级分布' })}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{stats.priorities.high}</div>
                        <div className="text-zinc-500 text-xs">{t('priority.high', { defaultValue: '高' })}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{stats.priorities.medium}</div>
                        <div className="text-zinc-500 text-xs">{t('priority.medium', { defaultValue: '中' })}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{stats.priorities.low}</div>
                        <div className="text-zinc-500 text-xs">{t('priority.low', { defaultValue: '低' })}</div>
                    </div>
                </div>
            </div>

            {/* Procrastination Analysis */}
            {stats.procrastination.overdueTasks.length > 0 && (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-zinc-200 font-medium mb-4">
                        {t('stats.procrastination', { defaultValue: '拖延分析' })}
                    </h3>
                    <div className="space-y-2">
                        {stats.procrastination.overdueTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                                <div className="min-w-0">
                                    <div className="text-zinc-200 text-sm truncate">{task.title}</div>
                                    <div className="text-zinc-500 text-xs">
                                        {t('stats.dueAt', { defaultValue: '截止' })}: {new Date(task.dueAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-red-400 text-sm font-medium">
                                    +{task.hoursOverdue}h
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color = 'blue' }: {
    title: string
    value: string | number
    icon: string
    color?: 'blue' | 'green' | 'red' | 'gray'
}) {
    const colorClasses = {
        blue: 'bg-blue-900/30 text-blue-300',
        green: 'bg-green-900/30 text-green-300',
        red: 'bg-red-900/30 text-red-300',
        gray: 'bg-zinc-800 text-zinc-300'
    }

    return (
        <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs opacity-80">{title}</div>
        </div>
    )
}

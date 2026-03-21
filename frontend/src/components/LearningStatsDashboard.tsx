/**
 * LearningStatsDashboard Component
 * Enhanced learning statistics dashboard with comprehensive analytics
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from './Card';
import { Badge } from './Badge';
import { ProgressBar, CircularProgress } from './Progress';

// ============================================
// Type Definitions
// ============================================

export type TimeRange = 'day' | 'week' | 'month' | 'year';
export type StatsView = 'overview' | 'detailed' | 'heatmap';

export interface LearningActivity {
  date: string;
  duration: number; // in minutes
  lessonsCompleted: number;
  quizScore?: number;
  subject?: string;
}

export interface SubjectMastery {
  subject: string;
  level: number; // 0-100
  topicsLearned: number;
  totalTopics: number;
  timeSpent: number; // in minutes
}

export interface StreakData {
  current: number;
  longest: number;
  lastStudyDate: string;
}

export interface LearningStatsData {
  totalStudyTime: number; // in minutes
  lessonsCompleted: number;
  averageQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  activities: LearningActivity[];
  subjectMastery: SubjectMastery[];
  weeklyGoals: {
    target: number;
    achieved: number;
  };
}

interface LearningStatsDashboardProps {
  data: LearningStatsData | null;
  loading?: boolean;
  className?: string;
  onExport?: (format: 'csv' | 'json') => void;
}

interface HeatmapCellProps {
  level: 0 | 1 | 2 | 3 | 4;
  date: string;
  activities?: number;
}

// ============================================
// Helper Components
// ============================================

function HeatmapCell({ level, date, activities = 0 }: HeatmapCellProps) {
  const { t } = useTranslation('common');

  const levelColors: Record<HeatmapCellProps['level'], string> = {
    0: 'bg-stone-800',
    1: 'bg-emerald-900',
    2: 'bg-emerald-700',
    3: 'bg-emerald-500',
    4: 'bg-emerald-400'
  };

  return (
    <div
      className={`w-3 h-3 rounded-sm ${levelColors[level]} hover:ring-2 hover:ring-emerald-400 transition-all duration-200 cursor-pointer`}
      title={`${date}: ${activities} ${t('activities', { defaultValue: 'activities' })}`}
      role="gridcell"
      aria-label={`${activities} activities on ${date}`}
    />
  );
}

function TimeRangeSelector({
  value,
  onChange
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  const { t } = useTranslation('common');

  const ranges: { key: TimeRange; label: string }[] = [
    { key: 'day', label: t('timeRange.day', { defaultValue: 'Day' }) },
    { key: 'week', label: t('timeRange.week', { defaultValue: 'Week' }) },
    { key: 'month', label: t('timeRange.month', { defaultValue: 'Month' }) },
    { key: 'year', label: t('timeRange.year', { defaultValue: 'Year' }) }
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-stone-800/50 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range.key}
          onClick={() => onChange(range.key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
            value === range.key
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
          }`}
          aria-pressed={value === range.key}
          aria-label={`Select ${range.label} view`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  trend,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  color: string;
}) {
  const { t } = useTranslation('common');

  return (
    <Card variant="glass" hoverable className="h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <div className={color.replace('bg-', 'text-')}>{icon}</div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <Badge
            variant={trend > 0 ? 'success' : 'error'}
            size="sm"
            className="flex items-center gap-1"
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          {unit && <span className="text-stone-400 text-sm">{unit}</span>}
        </div>
        <p className="text-stone-400 text-sm mt-1">{label}</p>
      </div>
    </Card>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function LearningStatsDashboard({
  data,
  loading = false,
  className = '',
  onExport
}: LearningStatsDashboardProps) {
  const { t } = useTranslation('common');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [view, setView] = useState<StatsView>('overview');

  // Memoized calculations
  const stats = useMemo(() => {
    if (!data) return null;

    const totalHours = Math.round(data.totalStudyTime / 60);
    const avgSessionLength = data.activities.length > 0
      ? Math.round(data.totalStudyTime / data.activities.length)
      : 0;

    return {
      totalHours,
      avgSessionLength,
      lessonsCompleted: data.lessonsCompleted,
      avgScore: data.averageQuizScore,
      currentStreak: data.currentStreak,
      longestStreak: data.longestStreak
    };
  }, [data]);

  const heatmapData = useMemo(() => {
    if (!data) return [];

    const today = new Date();
    const daysToShow = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const heatmap: Array<{ date: string; level: number; activities: number }> = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayActivities = data.activities.filter(
        a => a.date.startsWith(dateStr)
      );

      const activityCount = dayActivities.length;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (activityCount > 0) level = 1;
      if (activityCount >= 2) level = 2;
      if (activityCount >= 4) level = 3;
      if (activityCount >= 6) level = 4;

      heatmap.push({ date: dateStr, level, activities: activityCount });
    }

    return heatmap;
  }, [data, timeRange]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 animate-pulse">
              <div className="h-12 w-12 bg-stone-800 rounded-xl mb-4" />
              <div className="h-8 w-20 bg-stone-800 rounded mb-2" />
              <div className="h-4 w-32 bg-stone-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !stats) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-stone-400">{t('noStatsData', { defaultValue: 'No statistics data available' })}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {t('learningStats', { defaultValue: 'Learning Statistics' })}
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            {t('trackYourProgress', { defaultValue: 'Track your learning progress and achievements' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          {onExport && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExport('csv')}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium rounded-lg transition-colors"
                aria-label="Export as CSV"
              >
                {t('exportCSV', { defaultValue: 'Export CSV' })}
              </button>
              <button
                onClick={() => onExport('json')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
                aria-label="Export as JSON"
              >
                {t('exportJSON', { defaultValue: 'Export JSON' })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label={t('totalStudyTime', { defaultValue: 'Total Study Time' })}
          value={stats.totalHours}
          unit={t('hours', { defaultValue: 'hrs' })}
          trend={12}
          color="bg-sky-500"
        />
        <StatCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label={t('lessonsCompleted', { defaultValue: 'Lessons Completed' })}
          value={stats.lessonsCompleted}
          trend={8}
          color="bg-emerald-500"
        />
        <StatCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          label={t('avgQuizScore', { defaultValue: 'Average Quiz Score' })}
          value={`${stats.avgScore}%`}
          trend={5}
          color="bg-purple-500"
        />
        <StatCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          }
          label={t('currentStreak', { defaultValue: 'Current Streak' })}
          value={stats.currentStreak}
          unit={t('days', { defaultValue: 'days' })}
          color="bg-orange-500"
        />
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader
          title={t('activityHeatmap', { defaultValue: 'Activity Heatmap' })}
          subtitle={t('activityHeatmapDesc', { defaultValue: 'Your learning activity over time' })}
        />
        <CardBody>
          <div className="flex flex-wrap gap-1">
            {heatmapData.map((cell, index) => (
              <HeatmapCell
                key={`${cell.date}-${index}`}
                level={cell.level as HeatmapCellProps['level']}
                date={cell.date}
                activities={cell.activities}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-stone-500">
            <span>{t('less', { defaultValue: 'Less' })}</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm ${
                    level === 0
                      ? 'bg-stone-800'
                      : level === 1
                      ? 'bg-emerald-900'
                      : level === 2
                      ? 'bg-emerald-700'
                      : level === 3
                      ? 'bg-emerald-500'
                      : 'bg-emerald-400'
                  }`}
                />
              ))}
            </div>
            <span>{t('more', { defaultValue: 'More' })}</span>
          </div>
        </CardBody>
      </Card>

      {/* Subject Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title={t('subjectMastery', { defaultValue: 'Subject Mastery' })}
            subtitle={t('subjectMasteryDesc', { defaultValue: 'Your progress in each subject' })}
          />
          <CardBody className="space-y-4">
            {data.subjectMastery.map((subject) => (
              <div key={subject.subject}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-stone-200 font-medium">{subject.subject}</span>
                  <Badge
                    variant={subject.level >= 80 ? 'success' : subject.level >= 50 ? 'primary' : 'warning'}
                    size="sm"
                  >
                    {subject.level}%
                  </Badge>
                </div>
                <ProgressBar value={subject.level} variant="primary" size="sm" />
                <div className="flex items-center justify-between mt-1 text-xs text-stone-500">
                  <span>{subject.topicsLearned}/{subject.totalTopics} {t('topics', { defaultValue: 'topics' })}</span>
                  <span>{Math.round(subject.timeSpent / 60)}h</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Weekly Goal Progress */}
        <Card>
          <CardHeader
            title={t('weeklyGoal', { defaultValue: 'Weekly Goal' })}
            subtitle={t('weeklyGoalDesc', { defaultValue: 'Your weekly study goal progress' })}
          />
          <CardBody>
            <div className="flex items-center justify-center mb-6">
              <CircularProgress
                value={data.weeklyGoals.achieved}
                max={data.weeklyGoals.target}
                size={180}
                strokeWidth={12}
                variant="success"
                showLabel
              />
            </div>
            <div className="text-center">
              <p className="text-stone-400 text-sm">
                {t('weeklyProgress', { defaultValue: '{{achieved}} of {{target}} hours this week',
                  achieved: Math.round(data.weeklyGoals.achieved / 60),
                  target: Math.round(data.weeklyGoals.target / 60)
                })}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Learning Streak Visualization */}
      <Card>
        <CardHeader
          title={t('learningStreak', { defaultValue: 'Learning Streak' })}
          subtitle={t('learningStreakDesc', { defaultValue: 'Keep the momentum going!' })}
        />
        <CardBody>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500 mb-2">{stats.currentStreak}</div>
              <p className="text-stone-400 text-sm">{t('currentStreak', { defaultValue: 'Current Streak' })}</p>
            </div>
            <div className="w-px h-16 bg-stone-800" />
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500 mb-2">{stats.longestStreak}</div>
              <p className="text-stone-400 text-sm">{t('longestStreak', { defaultValue: 'Longest Streak' })}</p>
            </div>
            <div className="w-px h-16 bg-stone-800" />
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-500 mb-2">
                {data.activities.length > 0
                  ? Math.round(data.totalStudyTime / data.activities.length)
                  : 0}
              </div>
              <p className="text-stone-400 text-sm">{t('avgSession', { defaultValue: 'Avg Session (min)' })}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default LearningStatsDashboard;

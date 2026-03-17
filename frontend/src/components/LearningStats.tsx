import { useTranslation } from 'react-i18next';
import { LearningStats as LearningStatsType } from '../lib/api';

interface LearningStatsProps {
  stats: LearningStatsType | null;
  loading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  color: string;
}

function StatCard({ icon, label, value, unit, trend, color }: StatCardProps) {
  const { t } = useTranslation('learning');

  return (
    <div className="bg-stone-900/50 backdrop-blur-xl border border-stone-800 rounded-2xl p-6 hover:border-stone-700 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <div className={color.replace('bg-', 'text-')}>
            {icon}
          </div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm ${
            trend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {trend > 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              )}
            </svg>
            <span>
              {trend > 0
                ? t('trend.up', { value: Math.abs(trend) })
                : t('trend.down', { value: Math.abs(trend) })}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          {unit && <span className="text-stone-400 text-sm">{unit}</span>}
        </div>
        <p className="text-stone-400 text-sm mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function LearningStats({ stats, loading }: LearningStatsProps) {
  const { t } = useTranslation('learning');

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 animate-pulse">
            <div className="h-12 w-12 bg-stone-800 rounded-xl mb-4" />
            <div className="h-8 w-20 bg-stone-800 rounded mb-2" />
            <div className="h-4 w-32 bg-stone-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: t('stats.weeklyStudyTime'),
      value: stats.weeklyStudyTime,
      unit: t('stats.hours'),
      trend: Math.round((stats.weeklyStudyTime / Math.max(stats.totalStudyTime - stats.weeklyStudyTime, 1)) * 100 - 100),
      color: 'bg-blue-500'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      label: t('stats.masteredTopics'),
      value: stats.masteredTopics,
      unit: t('stats.topics'),
      color: 'bg-purple-500'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: t('stats.totalFlashcards'),
      value: stats.totalFlashcards,
      unit: t('stats.cards'),
      color: 'bg-green-500'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      label: t('stats.dueFlashcards'),
      value: stats.dueFlashcards,
      unit: t('stats.cards'),
      color: 'bg-orange-500'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: t('stats.quizAccuracy'),
      value: `${stats.quizAccuracy}%`,
      unit: t('stats.accuracy'),
      trend: stats.quizAccuracyTrend,
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {statCards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}

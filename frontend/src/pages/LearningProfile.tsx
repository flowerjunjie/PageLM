import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LearningStats from '../components/LearningStats';
import KnowledgeMap from '../components/KnowledgeMap';
import {
  getLearningProfile,
  getKnowledgeMap,
  LearningProfile as LearningProfileType,
  KnowledgeNode,
  KnowledgeEdge,
  SubjectStats,
  ActivityItem
} from '../lib/api';

export default function LearningProfile() {
  const { t } = useTranslation(['learning', 'navigation']);
  const [profile, setProfile] = useState<LearningProfileType | null>(null);
  const [knowledgeMap, setKnowledgeMap] = useState<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [profileRes, mapRes] = await Promise.all([
          getLearningProfile(),
          getKnowledgeMap()
        ]);

        if (profileRes.ok) {
          setProfile(profileRes.profile);
        }
        if (mapRes.ok) {
          setKnowledgeMap({ nodes: mapRes.nodes, edges: mapRes.edges });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNodeClick = (node: KnowledgeNode) => {
    console.log('Selected node:', node);
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'quiz':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'flashcard':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'chat':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'podcast':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-stone-300 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-800 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Profile</h2>
            <p className="text-stone-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-stone-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
            <Link to="/" className="hover:text-stone-300 transition-colors">
              {t('navigation:home')}
            </Link>
            <span>/</span>
            <span className="text-stone-300">{t('title')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-stone-400">{t('subtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <LearningStats stats={profile?.stats || null} loading={loading} />
        </div>

        {/* Knowledge Map */}
        <div className="mb-8">
          <KnowledgeMap
            nodes={knowledgeMap?.nodes || []}
            edges={knowledgeMap?.edges || []}
            loading={loading}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Subject Stats & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subject Statistics */}
          <div className="bg-stone-900/50 backdrop-blur-xl border border-stone-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-2">{t('subjects.title')}</h2>
            <p className="text-stone-400 text-sm mb-6">{t('subjects.subtitle')}</p>

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-stone-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : profile?.subjects && profile.subjects.length > 0 ? (
              <div className="space-y-4">
                {profile.subjects.map((subject: SubjectStats) => (
                  <div
                    key={subject.subject}
                    className="flex items-center gap-4 p-4 bg-stone-800/50 rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{subject.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-stone-400 mt-1">
                        <span>{subject.nodeCount} {t('subjects.nodes')}</span>
                        <span>{subject.flashcardCount} {t('subjects.flashcards')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {subject.quizAccuracy}%
                      </div>
                      <div className="text-xs text-stone-500">{t('subjects.accuracy')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500">
                {t('empty.description')}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-stone-900/50 backdrop-blur-xl border border-stone-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-2">{t('activity.title')}</h2>
            <p className="text-stone-400 text-sm mb-6">{t('activity.subtitle')}</p>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-stone-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : profile?.recentActivity && profile.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {profile.recentActivity.map((activity: ActivityItem) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center text-stone-400">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{activity.title}</h4>
                      <p className="text-xs text-stone-500">
                        {t(`activity.types.${activity.type}`)} • {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500">
                {t('empty.description')}
              </div>
            )}
          </div>
        </div>

        {/* Learning Streak */}
        {profile?.stats && (
          <div className="mt-8 bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-800/30 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t('streak.title')}</h3>
                <p className="text-orange-400">
                  {t('streak.days', { count: profile.stats.streakDays })} • {t('streak.keepItUp')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

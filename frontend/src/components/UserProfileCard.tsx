/**
 * User Profile Card Component
 * 用户资料卡片组件
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  level?: number;
  xp?: number;
  streak?: number;
  bio?: string;
  joinedAt?: string;
}

interface UserProfileCardProps {
  user: User;
  onEdit?: () => void;
  onMessage?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

// ============================================
// Level Badge Component
// ============================================

interface LevelBadgeProps {
  level: number;
  xp?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function LevelBadge({ level, xp = 0, showProgress = false, size = 'md' }: LevelBadgeProps) {
  // 计算当前等级进度
  const xpForCurrentLevel = level * 100; // 简化计算
  const xpForNextLevel = (level + 1) * 100;
  const progress = xpForNextLevel > 0 ? ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100 : 0;

  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const colors = {
    1: 'bg-stone-700 text-stone-300',
    2: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50',
    3: 'bg-sky-900/50 text-sky-400 border border-sky-700/50',
    4: 'bg-purple-900/50 text-purple-400 border border-purple-700/50',
    5: 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
  };

  const currentColor = colors[level as keyof typeof colors] || colors[1];

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg ${currentColor} ${sizeStyles[size]}`}>
      <span className="font-semibold">Lv.{level}</span>
      {showProgress && (
        <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-current rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Streak Display Component
// ============================================

interface StreakDisplayProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function StreakDisplay({ streak, size = 'md', showLabel = false }: StreakDisplayProps) {
  const sizeStyles = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  if (streak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`${sizeStyles[size]} text-orange-500`}>🔥</span>
      {showLabel && (
        <span className="text-sm text-stone-400">{streak} 天</span>
      )}
    </div>
  );
}

// ============================================
// Main User Profile Card
// ============================================

export function UserProfileCard({
  user,
  onEdit,
  onMessage,
  variant = 'default',
  className = ''
}: UserProfileCardProps) {
  const { t } = useTranslation('common');

  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
  }, []);

  // 紧凑变体
  if (variant === 'compact') {
    return (
    <div className={`flex items-center gap-3 p-4 bg-stone-900/50 border border-stone-800 rounded-xl ${className}`}>
      <div className="relative">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-stone-700"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-200 truncate">{user.name}</p>
        <p className="text-sm text-stone-500 truncate">{user.role || '用户'}</p>
      </div>
      {onMessage && (
        <button
          onClick={onMessage}
          className="p-2 text-stone-500 hover:text-sky-500 transition-colors"
          aria-label="发送消息"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 10c0 3-2.5 5.5-5.5 0 .828-.672 1.5-1.5 1.5H5.5a2 2 0 01-1.5-.68c-.263 0-.492.106-.69.216.368l5.5-5.5z" />
          </svg>
        </button>
      )}
    </div>
  );
  }

  // 详细变体
  if (variant === 'detailed') {
    return (
    <div className={`p-6 bg-stone-900/50 border border-stone-800 rounded-xl ${className}`}>
      <div className="flex items-start gap-4">
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-stone-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 001.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-100">{user.name}</h3>
              <p className="text-sm text-stone-500">{user.email}</p>
            </div>
            <button
              onClick={handleFollow}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${isFollowing
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
                }
              `}
            >
              {isFollowing ? '已关注' : '关注'}
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-200">{user.level || 1}</p>
              <p className="text-xs text-stone-500">等级</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-200">{user.xp || 0}</p>
              <p className="text-xs text-stone-500">经验</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-200">{user.streak || 0}</p>
              <p className="text-xs text-stone-500">连续天数</p>
            </div>
          </div>

          {/* 经验条 */}
          <div className="mb-4">
            <LevelBadge level={user.level || 1} xp={user.xp || 0} showProgress />
          </div>

          {/* 简介 */}
          {user.bio && (
            <p className="text-sm text-stone-400 mb-4 line-clamp-2">
              {user.bio}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors"
              >
                编辑资料
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                发送消息
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  }

  // 默认变体
  return (
    <div className={`p-5 bg-stone-900/50 border border-stone-800 rounded-xl hover:border-stone-700 transition-colors ${className}`}>
      <div className="flex items-start gap-4">
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-stone-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {user.streak && user.streak > 0 && (
            <div className="absolute -bottom-1 -right-1">
              <StreakDisplay streak={user.streak} size="sm" />
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-stone-200 truncate">{user.name}</h3>
              <p className="text-sm text-stone-500 truncate">{user.email || '用户'}</p>
            </div>
            <LevelBadge level={user.level || 1} size="sm" />
          </div>

          {user.bio && (
            <p className="text-sm text-stone-400 line-clamp-2 mb-3">
              {user.bio}
            </p>
          )}

          {/* 操作 */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-sm bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
              >
                编辑
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
              >
                私信
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// User Stats Card
// ============================================

interface UserStats {
  totalStudyTime: number; // 分钟
  cardsLearned: number;
  quizzesCompleted: number;
  notesCreated: number;
  streakDays: number;
}

interface UserStatsCardProps {
  stats: UserStats;
  className?: string;
}

export function UserStatsCard({ stats, className = '' }: UserStatsCardProps) {
  const { t } = useTranslation('common');

  const statItems = [
    {
      label: '学习时长',
      value: `${Math.floor(stats.totalStudyTime / 60)}h`,
      icon: '⏱️',
      color: 'text-sky-500'
    },
    {
      label: '记忆卡',
      value: stats.cardsLearned.toString(),
      icon: '📚',
      color: 'text-emerald-500'
    },
    {
      label: '完成测验',
      value: stats.quizzesCompleted.toString(),
      icon: '✅',
      color: 'text-amber-500'
    },
    {
      label: '创建笔记',
      value: stats.notesCreated.toString(),
      icon: '📝',
      color: 'text-purple-500'
    }
  ];

  return (
    <div className={`p-5 bg-stone-900/50 border border-stone-800 rounded-xl ${className}`}>
      <h3 className="text-base font-semibold text-stone-200 mb-4">学习统计</h3>
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-lg font-bold text-stone-200">{stat.value}</p>
              <p className="text-xs text-stone-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
      {stats.streakDays > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-800">
          <StreakDisplay streak={stats.streakDays} showLabel />
        </div>
      )}
    </div>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * function ProfilePage() {
 *   const user = {
 *     id: '1',
 *     name: '张三',
 *     email: 'zhangsan@example.com',
 *     role: '高级学员',
 *     level: 5,
 *     xp: 450,
 *     streak: 7
 *   };
 *
 *   return (
 *     <UserProfileCard
 *       user={user}
 *       onEdit={() => console.log('edit')}
 *       onMessage={() => console.log('message')}
 *     />
 *   );
 * }
 *
 * // 带统计信息
 * function ProfileWithStats() {
 *   const user = { ... };
 *   const stats = {
 *     totalStudyTime: 7200, // 120小时
 *     cardsLearned: 150,
 *     quizzesCompleted: 25,
 *     notesCreated: 45,
 *     streakDays: 7
 *   };
 *
 *   return (
 *     <div className="space-y-4">
 *       <UserProfileCard user={user} variant="compact" />
 *       <UserStatsCard stats={stats} />
 *     </div>
 *   );
 * }
 *
 * // 详细变体
 * function DetailedProfile() {
 *   return (
 *     <UserProfileCard
 *       user={user}
 *       variant="detailed"
 *       onEdit={handleEdit}
 *       onMessage={handleMessage}
 *     />
 *   );
 * }
 */

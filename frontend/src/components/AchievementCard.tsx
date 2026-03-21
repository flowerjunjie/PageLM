/**
 * AchievementCard Component
 * 成就/徽章组件 - 游戏化学习成就展示
 */

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Badge } from './Badge';
import { ProgressBar } from './Progress';

// ============================================
// 类型定义
// ============================================

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementStatus = 'locked' | 'in-progress' | 'unlocked';

export interface AchievementCardProps {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  rarity?: AchievementRarity;
  status?: AchievementStatus;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: Date;
  onClick?: () => void;
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const RARITY_CONFIG = {
  common: {
    label: '普通',
    borderColor: 'border-stone-700',
    bgColor: 'from-stone-600 to-stone-700',
    textColor: 'text-stone-400',
    glowEffect: '',
    badgeVariant: 'default' as const
  },
  rare: {
    label: '稀有',
    borderColor: 'border-sky-500',
    bgColor: 'from-sky-500 to-blue-600',
    textColor: 'text-sky-400',
    glowEffect: 'shadow-lg shadow-sky-500/20',
    badgeVariant: 'primary' as const
  },
  epic: {
    label: '史诗',
    borderColor: 'border-purple-500',
    bgColor: 'from-purple-500 to-pink-600',
    textColor: 'text-purple-400',
    glowEffect: 'shadow-lg shadow-purple-500/30',
    badgeVariant: 'info' as const
  },
  legendary: {
    label: '传说',
    borderColor: 'border-amber-500',
    bgColor: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-400',
    glowEffect: 'shadow-xl shadow-amber-500/40 animate-pulse-glow',
    badgeVariant: 'warning' as const
  }
};

// ============================================
// 子组件
// ============================================

interface AchievementIconProps {
  icon: ReactNode;
  rarity: AchievementRarity;
  status: AchievementStatus;
  size?: 'sm' | 'md' | 'lg';
}

function AchievementIcon({ icon, rarity, status, size = 'md' }: AchievementIconProps) {
  const config = RARITY_CONFIG[rarity];
  const isLocked = status === 'locked';
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };

  return (
    <div
      className={`
        relative rounded-xl flex items-center justify-center
        ${sizeClasses[size]}
        ${isLocked ? 'bg-stone-900' : `bg-gradient-to-br ${config.bgColor}`}
        ${config.glowEffect}
        transition-all duration-300
      `}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 rounded-xl bg-stone-900/60 backdrop-blur-sm flex items-center justify-center">
          <svg className="w-5 h-5 text-stone-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Glow effect for legendary rarity */}
      {rarity === 'legendary' && !isLocked && (
        <div className="absolute inset-0 rounded-xl bg-amber-400/20 animate-ping" />
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function AchievementCard({
  id,
  title,
  description,
  icon = '🏆',
  rarity = 'common',
  status = 'locked',
  progress = 0,
  maxProgress = 100,
  unlockedAt,
  onClick,
  className = ''
}: AchievementCardProps) {
  const { t } = useTranslation('common');
  const config = RARITY_CONFIG[rarity];
  const isUnlocked = status === 'unlocked';
  const inProgress = status === 'in-progress';
  const isLocked = status === 'locked';

  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <Card
      variant={isUnlocked ? 'gradient' : 'default'}
      hoverable={!isLocked}
      clickable={!isLocked && onClick !== undefined}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Rarity border glow */}
      {!isLocked && rarity !== 'common' && (
        <div className={`absolute inset-0 rounded-xl border-2 ${config.borderColor} opacity-30 pointer-events-none`} />
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <AchievementIcon icon={icon} rarity={rarity} status={status} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-stone-300'}`}>
                  {title}
                </h3>
                {/* Rarity badge */}
                {!isLocked && (
                  <Badge size="xs" variant={config.badgeVariant}>
                    {config.label}
                  </Badge>
                )}
              </div>
              <p className={`text-sm mt-1 ${isUnlocked ? 'text-stone-400' : 'text-stone-500'}`}>
                {description}
              </p>
            </div>
          </div>

          {/* Progress bar for in-progress achievements */}
          {inProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span>进度</span>
                <span>{progress}/{maxProgress}</span>
              </div>
              <ProgressBar
                value={progress}
                max={maxProgress}
                size="sm"
                variant={rarity === 'legendary' ? 'warning' : rarity === 'epic' ? 'primary' : 'default'}
                showLabel={false}
              />
            </div>
          )}

          {/* Unlocked date */}
          {isUnlocked && unlockedAt && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                  clipRule="evenodd"
                />
              </svg>
              <span>解锁于 {unlockedAt.toLocaleDateString()}</span>
            </div>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-600">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>尚未解锁</span>
            </div>
          )}
        </div>
      </div>

      {/* Shimmer effect for unlocked legendary achievements */}
      {isUnlocked && rarity === 'legendary' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-shimmer pointer-events-none" />
      )}
    </Card>
  );
}

// ============================================
// 预设组件
// ============================================

interface AchievementGridProps {
  achievements: AchievementCardProps[];
  onAchievementClick?: (achievement: AchievementCardProps) => void;
  className?: string;
}

export function AchievementGrid({
  achievements,
  onAchievementClick,
  className = ''
}: AchievementGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          {...achievement}
          onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
        />
      ))}
    </div>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * <AchievementCard
 *   id="first-lesson"
 *   title="第一课"
 *   description="完成你的第一堂课"
 *   icon="📚"
 *   rarity="common"
 *   status="unlocked"
 *   unlockedAt={new Date()}
 * />
 *
 * // 进行中的成就
 * <AchievementCard
 *   id="streak-7"
 *   title="连续学习7天"
 *   description="保持连续学习7天"
 *   icon="🔥"
 *   rarity="rare"
 *   status="in-progress"
 *   progress={5}
 *   maxProgress={7}
 * />
 *
 * // 未解锁的传说成就
 * <AchievementCard
 *   id="master"
 *   title="学习大师"
 *   description="完成100个学习会话"
 *   icon="👑"
 *   rarity="legendary"
 *   status="locked"
 * />
 *
 * // 成就网格
 * const achievements = [
 *   {
 *     id: '1',
 *     title: '初学者',
 *     description: '完成第一课',
 *     icon: '🎓',
 *     rarity: 'common' as const,
 *     status: 'unlocked' as const,
 *     unlockedAt: new Date()
 *   },
 *   {
 *     id: '2',
 *     title: '快速学习者',
 *     description: '一天完成5节课',
 *     icon: '⚡',
 *     rarity: 'rare' as const,
 *     status: 'in-progress' as const,
 *     progress: 3,
 *     maxProgress: 5
 *   }
 * ];
 * <AchievementGrid
 *   achievements={achievements}
 *   onAchievementClick={(a) => console.log('Clicked:', a.title)}
 * />
 */

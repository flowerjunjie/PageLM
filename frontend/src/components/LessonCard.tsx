/**
 * LessonCard Component
 * 课程卡片组件 - 显示课程信息和学习进度
 */

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody, CardFooter } from './Card';
import { Badge } from './Badge';
import { ProgressBar } from './Progress';

// ============================================
// 类型定义
// ============================================

export type LessonCardVariant = 'compact' | 'default' | 'detailed';
export type LessonStatus = 'new' | 'in-progress' | 'completed';
export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LessonCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number; // 分钟
  difficulty?: LessonDifficulty;
  status?: LessonStatus;
  progress?: number; // 0-100
  totalLessons?: number;
  completedLessons?: number;
  tags?: string[];
  instructor?: string;
  variant?: LessonCardVariant;
  onClick?: () => void;
  onResume?: () => void;
  onStart?: () => void;
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const STATUS_CONFIG = {
  new: {
    label: '新课程',
    variant: 'success' as const,
    bgColor: 'bg-emerald-900/20',
    textColor: 'text-emerald-500'
  },
  'in-progress': {
    label: '学习中',
    variant: 'primary' as const,
    bgColor: 'bg-sky-900/20',
    textColor: 'text-sky-500'
  },
  completed: {
    label: '已完成',
    variant: 'default' as const,
    bgColor: 'bg-stone-800',
    textColor: 'text-stone-400'
  }
};

const DIFFICULTY_CONFIG = {
  beginner: {
    label: '入门',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-900/20'
  },
  intermediate: {
    label: '中级',
    color: 'text-amber-500',
    bgColor: 'bg-amber-900/20'
  },
  advanced: {
    label: '高级',
    color: 'text-red-500',
    bgColor: 'bg-red-900/20'
  }
};

// ============================================
// 工具函数
// ============================================

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

// ============================================
// 子组件
// ============================================

interface ThumbnailProps {
  src?: string;
  alt: string;
  status: LessonStatus;
  progress?: number;
}

function Thumbnail({ src, alt, status, progress = 0 }: ThumbnailProps) {
  const defaultThumbnail = (
    <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
      <svg className="w-12 h-12 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-stone-900">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        defaultThumbnail
      )}

      {/* Progress overlay */}
      {status === 'in-progress' && progress > 0 && (
        <div className="absolute inset-0 bg-black/40">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed badge */}
      {status === 'completed' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* New badge */}
      {status === 'new' && (
        <div className="absolute top-2 right-2">
          <Badge variant="success" size="xs">新</Badge>
        </div>
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function LessonCard({
  id,
  title,
  description,
  thumbnail,
  duration,
  difficulty = 'beginner',
  status = 'new',
  progress = 0,
  totalLessons,
  completedLessons,
  tags = [],
  instructor,
  variant = 'default',
  onClick,
  onResume,
  onStart,
  className = ''
}: LessonCardProps) {
  const { t } = useTranslation('common');
  const statusConfig = STATUS_CONFIG[status];
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  const handleAction = () => {
    if (status === 'new' && onStart) {
      onStart();
    } else if (status === 'in-progress' && onResume) {
      onResume();
    } else if (onClick) {
      onClick();
    }
  };

  const actionLabel = status === 'new' ? '开始学习' : status === 'in-progress' ? '继续学习' : '复习';

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card
        clickable
        hoverable
        onClick={handleAction}
        className={`flex gap-3 ${className}`}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-24">
          <Thumbnail
            src={thumbnail}
            alt={title}
            status={status}
            progress={progress}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">{title}</h3>
            {description && (
              <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-2">
            {duration && (
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                {formatDuration(duration)}
              </span>
            )}
            {status === 'in-progress' && progress > 0 && (
              <span className="text-xs text-sky-500">{progress}%</span>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0">
          {status === 'completed' && (
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <Card hoverable clickable onClick={onClick} className={className}>
        {/* Thumbnail */}
        <div className="relative -mx-6 -mt-6 mb-4">
          <Thumbnail
            src={thumbnail}
            alt={title}
            status={status}
            progress={progress}
          />
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white">{title}</h3>
              <Badge size="xs" variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            </div>

            {description && (
              <p className="text-sm text-stone-400 mt-1 line-clamp-2">{description}</p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {duration && (
              <span className="flex items-center gap-1.5 text-stone-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                {formatDuration(duration)}
              </span>
            )}

            <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyConfig.bgColor} ${difficultyConfig.color}`}>
              {difficultyConfig.label}
            </span>

            {instructor && (
              <span className="flex items-center gap-1.5 text-stone-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                {instructor}
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Progress bar for in-progress */}
          {status === 'in-progress' && (
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span>学习进度</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} size="sm" showLabel={false} />
            </div>
          )}

          {/* Lesson count */}
          {totalLessons && (
            <div className="text-sm text-stone-500">
              {completedLessons || 0} / {totalLessons} 课时
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction();
          }}
          className="w-full mt-4 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 bg-sky-600 hover:bg-sky-700 text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-stone-900"
        >
          {status === 'completed' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status === 'in-progress' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {status === 'new' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 1zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {actionLabel}
        </button>
      </Card>
    );
  }

  // Default variant
  return (
    <Card hoverable clickable onClick={onClick} className={className}>
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-32">
          <Thumbnail
            src={thumbnail}
            alt={title}
            status={status}
            progress={progress}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{title}</h3>
              {description && (
                <p className="text-sm text-stone-400 mt-0.5 line-clamp-2">{description}</p>
              )}
            </div>
            <Badge size="xs" variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            {duration && (
              <span className="flex items-center gap-1 text-stone-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                {formatDuration(duration)}
              </span>
            )}

            <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyConfig.bgColor} ${difficultyConfig.color}`}>
              {difficultyConfig.label}
            </span>

            {totalLessons && (
              <span className="text-stone-500">
                {completedLessons || 0}/{totalLessons}
              </span>
            )}
          </div>

          {/* Progress bar for in-progress */}
          {status === 'in-progress' && progress > 0 && (
            <div className="mt-3">
              <ProgressBar value={progress} size="sm" showLabel={false} />
            </div>
          )}

          {/* Spacer for action button alignment */}
          <div className="flex-1" />

          {/* Action */}
          <div className="mt-3 flex items-center justify-between">
            {tags.length > 0 && (
              <div className="flex gap-1.5">
                {tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-stone-800 text-stone-500 text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-500 text-xs">
                    +{tags.length - 2}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction();
              }}
              className="min-h-[36px] px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// 预设组件
// ============================================

interface LessonGridProps {
  lessons: LessonCardProps[];
  variant?: LessonCardVariant;
  onLessonClick?: (lesson: LessonCardProps) => void;
  className?: string;
}

export function LessonGrid({
  lessons,
  variant = 'default',
  onLessonClick,
  className = ''
}: LessonGridProps) {
  return (
    <div className={`grid grid-cols-1 ${variant === 'compact' ? 'md:grid-cols-2 lg:grid-cols-3' : 'gap-4'} ${className}`}>
      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          {...lesson}
          variant={variant}
          onClick={onLessonClick ? () => onLessonClick(lesson) : undefined}
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
 * <LessonCard
 *   id="1"
 *   title="Introduction to React"
 *   description="Learn the basics of React"
 *   thumbnail="/images/react-intro.jpg"
 *   duration={45}
 *   difficulty="beginner"
 *   status="new"
 * />
 *
 * // 进行中的课程
 * <LessonCard
 *   id="2"
 *   title="Advanced Hooks"
 *   description="Deep dive into React Hooks"
 *   duration={60}
 *   difficulty="advanced"
 *   status="in-progress"
 *   progress={65}
 *   totalLessons={10}
 *   completedLessons={6}
 *   tags={['React', 'Hooks', 'Advanced']}
 *   instructor="Jane Doe"
 * />
 *
 * // 紧凑变体
 * <LessonCard
 *   id="3"
 *   title="TypeScript Basics"
 *   duration={30}
 *   status="completed"
 *   variant="compact"
 * />
 *
 * // 课程网格
 * const lessons = [
 *   {
 *     id: '1',
 *     title: 'React 基础',
 *     description: '学习 React 的核心概念',
 *     duration: 45,
 *     difficulty: 'beginner' as const,
 *     status: 'completed' as const,
 *     progress: 100
 *   },
 *   {
 *     id: '2',
 *     title: 'React Hooks',
 *     description: '深入理解 Hooks',
 *     duration: 60,
 *     difficulty: 'intermediate' as const,
 *     status: 'in-progress' as const,
 *     progress: 35
 *   }
 * ];
 * <LessonGrid
 *   lessons={lessons}
 *   onLessonClick={(lesson) => console.log('Clicked:', lesson.title)}
 * />
 */

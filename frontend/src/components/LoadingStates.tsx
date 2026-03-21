/**
 * Optimized Loading States
 * 优化的加载状态组件，提供更好的用户体验
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 主加载屏幕
// ============================================

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  variant?: 'default' | 'gradient' | 'pulse';
}

export function LoadingScreen({
  message,
  progress,
  variant = 'default'
}: LoadingScreenProps) {
  const { t } = useTranslation('common');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Spinner */}
        {variant === 'default' && (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-stone-800 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
        )}

        {variant === 'gradient' && (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full animate-pulse opacity-75" />
            <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {variant === 'pulse' && (
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Loading Message */}
        <div className="text-center">
          <p className="text-stone-300 text-sm">
            {message || t('loading', 'Loading')}
            {dots}
          </p>

          {/* Progress Bar */}
          {progress !== undefined && (
            <div className="mt-4 w-64">
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2 text-right">{progress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 内联加载指示器
// ============================================

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'sky' | 'indigo' | 'emerald' | 'rose';
  className?: string;
}

export function InlineLoader({
  size = 'md',
  color = 'sky',
  className = ''
}: InlineLoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  const colorClasses = {
    sky: 'border-t-sky-500',
    indigo: 'border-t-indigo-500',
    emerald: 'border-t-emerald-500',
    rose: 'border-t-rose-500'
  };

  return (
    <div
      className={`border-stone-800 rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================
// 骨架屏加载器
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-stone-800';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`.trim()}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}

// ============================================
// 骨架屏组件集合
// ============================================

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={16} />
        <Skeleton width="80%" height={16} />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
      <Skeleton width="100%" height={60} variant="rectangular" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// 加载按钮包装器
// ============================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const { t } = useTranslation('common');

  return (
    <button
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center gap-2 px-4 py-2
        bg-sky-600 hover:bg-sky-700 disabled:bg-stone-700
        text-white font-medium rounded-lg
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-stone-950
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {loading && (
        <InlineLoader size="sm" />
      )}
      <span>{loading ? loadingText || t('processing', 'Processing...') : children}</span>
    </button>
  );
}

// ============================================
// 延迟加载包装器
// ============================================

interface DelayedLoaderProps {
  delay?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DelayedLoader({
  delay = 200,
  children,
  fallback
}: DelayedLoaderProps) {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!showLoader) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// ============================================
// 使用示例
// ============================================

/**
 * import {
 *   LoadingScreen,
 *   InlineLoader,
 *   Skeleton,
 *   ChatMessageSkeleton,
 *   CardSkeleton,
 *   ListSkeleton,
 *   LoadingButton,
 *   DelayedLoader
 * } from './components/LoadingStates';
 *
 * // 使用加载屏幕
 * <LoadingScreen message="正在加载..." progress={50} variant="gradient" />
 *
 * // 使用内联加载器
 * <InlineLoader size="lg" color="indigo" />
 *
 * // 使用骨架屏
 * <Skeleton width={200} height={20} variant="text" />
 *
 * // 使用预定义的骨架屏
 * <ChatMessageSkeleton />
 * <CardSkeleton />
 * <ListSkeleton count={5} />
 *
 * // 使用加载按钮
 * <LoadingButton loading={isLoading} loadingText="提交中...">
 *   提交
 * </LoadingButton>
 *
 * // 使用延迟加载
 * <DelayedLoader delay={300}>
 *   <InlineLoader />
 * </DelayedLoader>
 */

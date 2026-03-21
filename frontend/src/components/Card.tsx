/**
 * Card Component
 * 通用卡片组件，提供多种样式和变体
 */

import { ReactNode, HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'space-between';
}

// ============================================
// Card 组件
// ============================================

export function Card({
  children,
  variant = 'default',
  size = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  ...props
}: CardProps) {
  const { t } = useTranslation('common');

  // 基础样式类
  const baseClasses = 'rounded-xl transition-all duration-200';

  // 变体样式
  const variantClasses = {
    default: 'bg-stone-900/50 border border-stone-800',
    bordered: 'bg-stone-950 border-2 border-stone-800',
    elevated: 'bg-stone-900/80 border border-stone-700 shadow-lg shadow-black/20',
    glass: 'bg-stone-900/60 backdrop-blur-sm border border-stone-700/50',
    gradient: 'bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-800/30'
  };

  // 尺寸样式
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  // 交互样式
  const interactiveClasses = clickable || hoverable
    ? 'cursor-pointer hover:border-stone-600 hover:bg-stone-800/60 active:scale-[0.98]'
    : '';

  // 禁用样式
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : '';

  // 加载样式
  const loadingClasses = loading
    ? 'animate-pulse'
    : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${interactiveClasses} ${disabledClasses} ${loadingClasses} ${className}`.trim();

  return (
    <div
      className={classes}
      onClick={clickable && !disabled ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable && !disabled ? 0 : undefined}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-stone-800 rounded w-3/4" />
          <div className="h-3 bg-stone-800 rounded w-1/2" />
          <div className="h-20 bg-stone-800 rounded" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ============================================
// Card Header
// ============================================

export function CardHeader({
  title,
  subtitle,
  action,
  className = ''
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-stone-100">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-stone-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="ml-4 flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// ============================================
// Card Body
// ============================================

export function CardBody({
  children,
  className = ''
}: CardBodyProps) {
  return (
    <div className={`flex-1 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Card Footer
// ============================================

export function CardFooter({
  children,
  align = 'right',
  className = ''
}: CardFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between'
  };

  return (
    <div className={`flex items-center ${alignClasses[align]} mt-4 pt-4 border-t border-stone-800 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// 预设 Card 组件
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({
  title,
  value,
  change,
  icon,
  trend
}: StatCardProps) {
  const trendIcon = {
    up: <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>,
    down: <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  };

  return (
    <Card variant="glass" hoverable>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trend === 'up' && trendIcon.up}
              {trend === 'down' && trendIcon.down}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-stone-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

export function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <Card variant="gradient" clickable onClick={onClick} hoverable>
      <div className="flex flex-col items-center text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-stone-100 font-semibold mb-2">{title}</h3>
        <p className="text-stone-400 text-sm">{description}</p>
      </div>
    </Card>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: ReactNode;
}

export function ActionCard({ title, description, actionLabel, onAction, icon }: ActionCardProps) {
  return (
    <Card variant="elevated">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 text-stone-600">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-stone-100 font-semibold mb-1">{title}</h3>
          <p className="text-stone-400 text-sm mb-3">{description}</p>
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础卡片
 * <Card>
 *   <CardHeader title="标题" subtitle="副标题" />
 *   <CardBody>
 *     内容区域
 *   </CardBody>
 *   <CardFooter>
 *     <button>操作</button>
 *   </CardFooter>
 * </Card>
 *
 * // 可点击卡片
 * <Card clickable onClick={handleClick} hoverable>
 *   内容
 * </Card>
 *
 * // 不同变体
 * <Card variant="bordered">...</Card>
 * <Card variant="elevated">...</Card>
 * <Card variant="glass">...</Card>
 * <Card variant="gradient">...</Card>
 *
 * // 预设卡片
 * <StatCard
 *   title="总用户"
 *   value="1,234"
 *   change={12}
 *   trend="up"
 *   icon={<UserIcon />}
 * />
 *
 * <FeatureCard
 *   icon="📚"
 *   title="智能笔记"
 *   description="AI驱动的笔记整理"
 *   onClick={handleClick}
 * />
 *
 * <ActionCard
 *   title="创建新笔记"
 *   description="开始整理你的学习内容"
 *   actionLabel="创建"
 *   onAction={handleCreate}
 * />
 */

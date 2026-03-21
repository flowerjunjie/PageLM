/**
 * Badge Component
 * 徽章组件，用于显示状态、标签和计数
 */

import { ReactNode, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  count?: number;
  max?: number;
  showZero?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

// ============================================
// 样式配置
// ============================================

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-stone-700 text-stone-200',
  primary: 'bg-sky-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-cyan-600 text-white',
  outline: 'bg-transparent border border-stone-600 text-stone-300'
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

const dotSizes: Record<BadgeSize, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
};

// ============================================
// Badge 组件
// ============================================

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  count,
  max = 99,
  showZero = false,
  className = '',
  style,
  onClick
}: BadgeProps) {
  const { t } = useTranslation('common');

  // 处理计数显示
  let displayCount: ReactNode = children;
  if (count !== undefined) {
    if (count === 0 && !showZero) {
      return null;
    }
    displayCount = count > max ? `${max}+` : count;
  }

  const baseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200';
  const variantClass = variantStyles[variant];
  const sizeClass = sizeStyles[size];
  const clickClass = onClick ? 'cursor-pointer hover:opacity-80' : '';

  return (
    <span
      className={`${baseClasses} ${variantClass} ${sizeClass} ${clickClass} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {dot && <span className={`${dotSizes[size]} rounded-full bg-current mr-1.5`} />}
      {displayCount}
    </span>
  );
}

// ============================================
// Status Badge
// ============================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'dnd';
  showText?: boolean;
  className?: string;
}

export function StatusBadge({ status, showText = true, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<StatusBadgeProps['status'], { color: string; label: string; dot: string }> = {
    online: { color: 'bg-emerald-500', label: '在线', dot: 'bg-emerald-500' },
    offline: { color: 'bg-stone-500', label: '离线', dot: 'bg-stone-500' },
    busy: { color: 'bg-red-500', label: '忙碌', dot: 'bg-red-500' },
    away: { color: 'bg-amber-500', label: '离开', dot: 'bg-amber-500' },
    dnd: { color: 'bg-rose-500', label: '请勿打扰', dot: 'bg-rose-500' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-3 w-3 ${config.color}`} />
      </span>
      {showText && <span className="text-sm text-stone-300">{config.label}</span>}
    </span>
  );
}

// ============================================
// Tag 组件
// ============================================

interface TagProps {
  children: ReactNode;
  onRemove?: () => void;
  removable?: boolean;
  className?: string;
}

export function Tag({ children, onRemove, removable = false, className = '' }: TagProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm ${className}`}>
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="text-stone-500 hover:text-stone-300 transition-colors"
          aria-label="Remove tag"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ============================================
// Progress Badge
// ============================================

interface ProgressBadgeProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  size?: BadgeSize;
  className?: string;
}

export function ProgressBadge({
  value,
  max = 100,
  showPercentage = true,
  size = 'sm',
  className = ''
}: ProgressBadgeProps) {
  const percentage = Math.round((value / max) * 100);
  const color = percentage >= 100 ? 'success' : percentage >= 75 ? 'primary' : percentage >= 50 ? 'info' : 'warning';

  return (
    <Badge variant={color} size={size} className={className}>
      {showPercentage ? `${percentage}%` : value}
    </Badge>
  );
}

// ============================================
// Notification Badge (for icons)
// ============================================

interface NotificationBadgeProps {
  count: number;
  max?: number;
  children: ReactNode;
  offset?: number;
  className?: string;
}

export function NotificationBadge({
  count,
  max = 99,
  children,
  offset = 0,
  className = ''
}: NotificationBadgeProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          style={{ transform: `translate(${offset}px, ${offset}px)` }}
        >
          {count > max ? `${max}+` : count}
        </span>
      )}
    </span>
  );
}

// ============================================
// 预设 Badge 组件
// ============================================

export function NewBadge({ className = '' }: { className?: string }) {
  return <Badge variant="success" size="xs" className={className}>新</Badge>;
}

export function BetaBadge({ className = '' }: { className?: string }) {
  return <Badge variant="warning" size="xs" className={className}>Beta</Badge>;
}

export function ProBadge({ className = '' }: { className?: string }) {
  return <Badge variant="primary" size="xs" className={className}>Pro</Badge>;
}

export function HotBadge({ className = '' }: { className?: string }) {
  return (
    <Badge variant="error" size="sm" className={className}>
      🔥 热门
    </Badge>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础 Badge
 * <Badge>默认</Badge>
 * <Badge variant="primary">主要</Badge>
 * <Badge variant="success">成功</Badge>
 * <Badge variant="warning">警告</Badge>
 * <Badge variant="error">错误</Badge>
 *
 * // 不同尺寸
 * <Badge size="xs">Extra Small</Badge>
 * <Badge size="sm">Small</Badge>
 * <Badge size="md">Medium</Badge>
 * <Badge size="lg">Large</Badge>
 *
 * // 点状 Badge
 * <Badge dot>新消息</Badge>
 *
 * // 计数 Badge
 * <Badge count={5} max={99} />
 * <Badge count={123} max={99} />
 * <Badge count={0} showZero />
 *
 * // 状态 Badge
 * <StatusBadge status="online" />
 * <StatusBadge status="busy" showText={false} />
 *
 * // 标签
 * <Tag>JavaScript</Tag>
 * <Tag removable onRemove={handleRemove}>React</Tag>
 *
 * // 进度 Badge
 * <ProgressBadge value={75} />
 * <ProgressBadge value={30} showPercentage={false} />
 *
 * // 通知 Badge
 * <NotificationBadge count={5}>
 *   <BellIcon />
 * </NotificationBadge>
 *
 * // 预设 Badge
 * <NewBadge />
 * <BetaBadge />
 * <ProBadge />
 * <HotBadge />
 */

/**
 * Empty State Component
 * 空状态组件，用于显示空数据状态
 */

import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

interface EmptyStateProps {
  type?: 'noData' | 'noSearchResults' | 'noFavorites' | 'noNetwork' | 'error' | 'custom';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

// 预设图标
const Icons: Record<string, React.ReactNode> = {
  noData: (
    <svg className="w-16 h-16 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  noSearchResults: (
    <svg className="w-16 h-16 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  noFavorites: (
    <svg className="w-16 h-16 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  noNetwork: (
    <svg className="w-16 h-16 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
    </svg>
  ),
  error: (
    <svg className="w-16 h-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
};

// ============================================
// 预设内容
// ============================================

const PresetContent: Record<string, { title: string; description: string }> = {
  noData: {
    title: 'common.noData',
    description: 'common.noDataDescription'
  },
  noSearchResults: {
    title: 'common.noSearchResults',
    description: 'common.noSearchResultsDescription'
  },
  noFavorites: {
    title: 'common.noFavorites',
    description: 'common.noFavoritesDescription'
  },
  noNetwork: {
    title: 'common.noNetwork',
    description: 'common.noNetworkDescription'
  },
  error: {
    title: 'common.error',
    description: 'common.errorDescription'
  }
};

// ============================================
// 组件
// ============================================

export default function EmptyState({
  type = 'noData',
  title,
  description,
  icon,
  action,
  className = ''
}: EmptyStateProps) {
  const { t } = useTranslation('common');

  // 获取预设内容
  const preset = PresetContent[type];
  const defaultTitle = title ? title : t(preset.title as any, getDefaultTitle(type));
  const defaultDescription = description ? description : t(preset.description as any, getDefaultDescription(type));
  const defaultIcon = icon || Icons[type] || Icons.noData;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Icon */}
      <div className="mb-4">
        {defaultIcon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-stone-200 mb-2">
        {defaultTitle}
      </h3>

      {/* Description */}
      <p className="text-stone-400 text-sm max-w-md mb-6">
        {defaultDescription}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`
            px-6 py-2.5 rounded-lg font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-950
            ${
              action.variant === 'primary'
                ? 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 focus:ring-stone-500'
            }
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================
// 辅助函数
// ============================================

function getDefaultTitle(type: string): string {
  const titles: Record<string, string> = {
    noData: '暂无数据',
    noSearchResults: '未找到结果',
    noFavorites: '暂无收藏',
    noNetwork: '网络连接失败',
    error: '出错了'
  };
  return titles[type] || '暂无数据';
}

function getDefaultDescription(type: string): string {
  const descriptions: Record<string, string> = {
    noData: '还没有任何数据，开始创建吧！',
    noSearchResults: '尝试调整搜索关键词',
    noFavorites: '收藏你喜欢的内容',
    noNetwork: '检查网络连接后重试',
    error: '刷新页面或稍后再试'
  };
  return descriptions[type] || '';
}

// ============================================
// 预设组件
// ============================================

export function NoData({ action }: { action?: EmptyStateProps['action'] }) {
  return <EmptyState type="noData" action={action} />;
}

export function NoSearchResults({ action }: { action?: EmptyStateProps['action'] }) {
  return <EmptyState type="noSearchResults" action={action} />;
}

export function NoFavorites({ action }: { action?: EmptyStateProps['action'] }) {
  return <EmptyState type="noFavorites" action={action} />;
}

export function NoNetwork({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      type="noNetwork"
      action={onRetry ? { label: '重试', onClick: onRetry } : undefined}
    />
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * <EmptyState type="noData" />
 *
 * // 自定义内容和操作
 * <EmptyState
 *   type="noData"
 *   title="还没有聊天记录"
 *   description="开始与AI对话吧！"
 *   action={{
 *     label: '开始聊天',
 *     onClick: () => navigate('/chat'),
 *     variant: 'primary'
 *   }}
 * />
 *
 * // 使用预设组件
 * <NoData action={{ label: '创建', onClick: handleCreate }} />
 * <NoSearchResults action={{ label: '清除搜索', onClick: clearSearch }} />
 * <NoFavorites action={{ label: '浏览内容', onClick: handleBrowse }} />
 * <NoNetwork onRetry={handleRetry} />
 */

/**
 * Toast Notification System
 * 提供用户反馈的通知系统
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// ============================================
// Context
// ============================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ============================================
// Provider
// ============================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => {
      const newToast = { ...toast, id };
      const filtered = prev.filter(t => t.id !== id);
      return [...filtered.slice(-maxToasts + 1), newToast];
    });

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration ?? defaultDuration);
    }
  }, [maxToasts, defaultDuration]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// ============================================
// Toast Container
// ============================================

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full"
      role="region"
      aria-live="polite"
      aria-label="Toast notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// ============================================
// Toast Item
// ============================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { t } = useTranslation('common');
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  useEffect(() => {
    // Keyboard shortcut to dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRemove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  };

  const colors = {
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    error: 'bg-red-900/90 border-red-700 text-red-100',
    warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
    info: 'bg-sky-900/90 border-sky-700 text-sky-100'
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div
        className={`
          flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg
          ${colors[toast.type]}
        `}
        role="alert"
        aria-labelledby={`toast-title-${toast.id}`}
        aria-describedby={`toast-desc-${toast.id}`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {icons[toast.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h3
              id={`toast-title-${toast.id}`}
              className="font-semibold text-sm mb-1"
            >
              {toast.title}
            </h3>
          )}
          <p
            id={`toast-desc-${toast.id}`}
            className="text-sm opacity-90"
          >
            {toast.message}
          </p>

          {/* Action Button */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                handleRemove();
              }}
              className="mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-current rounded"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-current"
          aria-label={t('close', 'Close')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Progress Bar (for non-indefinite toasts) */}
      {toast.duration !== undefined && toast.duration > 0 && (
        <div className="h-1 bg-current opacity-20 mt-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-current opacity-60"
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// 便捷 Hooks
// ============================================

export function useToastActions() {
  const { showToast } = useToast();

  return {
    success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      showToast({ type: 'success', message, ...options });
    },
    error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      showToast({ type: 'error', message, ...options });
    },
    warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      showToast({ type: 'warning', message, ...options });
    },
    info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      showToast({ type: 'info', message, ...options });
    }
  };
}

// ============================================
// CSS Animation (需要添加到 global CSS)
// ============================================

/*
@keyframes toastProgress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
*/

// ============================================
// 使用示例
// ============================================

/**
 * // 1. 在 App.tsx 中添加 Provider
 * import { ToastProvider } from './components/Toast';
 *
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <YourApp />
 *     </ToastProvider>
 *   );
 * }
 *
 * // 2. 在组件中使用
 * import { useToast, useToastActions } from './components/Toast';
 *
 * function MyComponent() {
 *   // 方法1: 使用 useToast
 *   const { showToast } = useToast();
 *
 *   const handleClick = () => {
 *     showToast({
 *       type: 'success',
 *       title: '成功',
 *       message: '操作已成功完成',
 *       duration: 3000,
 *       action: {
 *         label: '撤销',
 *         onClick: () => console.log('Undo clicked')
 *       }
 *     });
 *   };
 *
 *   // 方法2: 使用便捷 hooks
 *   const { success, error, warning, info } = useToastActions();
 *
 *   const handleSuccess = () => {
 *     success('操作成功！', { title: '成功', duration: 5000 });
 *   };
 *
 *   return <button onClick={handleClick}>显示通知</button>;
 * }
 */

/**
 * Modal Component
 * 模态框组件，用于显示弹窗和对话框
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

// ============================================
// 类型定义
// ============================================

type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'danger' | 'warning' | 'success';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'space-between';
}

// ============================================
// 样式配置
// ============================================

const sizeStyles: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

const variantStyles: Record<ModalVariant, string> = {
  default: 'border-stone-700',
  danger: 'border-red-700',
  warning: 'border-amber-700',
  success: 'border-emerald-700'
};

// ============================================
// Modal 组件
// ============================================

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'default',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = ''
}: ModalProps) {
  const { t } = useTranslation('common');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 处理 ESC 键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // 处理焦点陷阱
  useEffect(() => {
    if (!isOpen) return;

    // 保存当前焦点元素
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 聚焦到模态框
    modalRef.current?.focus();

    // 阻止 body 滚动
    document.body.style.overflow = 'hidden';

    return () => {
      // 恢复 body 滚动
      document.body.style.overflow = '';

      // 恢复焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // 不渲染任何内容
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeStyles[size]} bg-stone-900 border rounded-xl
          shadow-2xl shadow-black/50 animate-scale-in
          ${variantStyles[variant]} ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
            <h2 id="modal-title" className="text-lg font-semibold text-stone-100">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded hover:bg-stone-800"
                aria-label={t('close', '关闭')}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto custom-scroll">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-stone-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body
  return createPortal(modalContent, document.body);
}

// ============================================
// Modal 子组件
// ============================================

export function ModalHeader({
  title,
  subtitle,
  onClose,
  showCloseButton = true,
  className = ''
}: ModalHeaderProps) {
  const { t } = useTranslation('common');

  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-stone-100">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-stone-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {onClose && showCloseButton && (
        <button
          onClick={onClose}
          className="ml-4 text-stone-500 hover:text-stone-300 transition-colors p-1 rounded hover:bg-stone-800"
          aria-label={t('close', '关闭')}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`flex-1 ${className}`}>{children}</div>;
}

export function ModalFooter({
  children,
  align = 'right',
  className = ''
}: ModalFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between'
  };

  return (
    <div className={`flex items-center ${alignClasses[align]} gap-3 mt-6 pt-4 border-t border-stone-800 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// 预设模态框
// ============================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default'
}: ConfirmModalProps) {
  const { t } = useTranslation('common');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant={variant}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            {cancelLabel || t('cancel', '取消')}
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }
            `}
          >
            {confirmLabel || t('confirm', '确认')}
          </button>
        </>
      }
    >
      <p className="text-stone-300">{message}</p>
    </Modal>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info'
}: AlertModalProps) {
  const icons = {
    success: (
      <div className="w-12 h-12 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-500 mx-auto mb-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    ),
    error: (
      <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center text-red-500 mx-auto mb-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-full bg-amber-900/50 flex items-center justify-center text-amber-500 mx-auto mb-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    ),
    info: (
      <div className="w-12 h-12 rounded-full bg-sky-900/50 flex items-center justify-center text-sky-500 mx-auto mb-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
        >
          确定
        </button>
      }
    >
      {icons[type]}
      <p className="text-stone-300 text-center">{message}</p>
    </Modal>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础 Modal
 * function MyComponent() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>打开</button>
 *       <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="标题">
 *         内容...
 *       </Modal>
 *     </>
 *   );
 * }
 *
 * // 带子组件的 Modal
 * <Modal isOpen={isOpen} onClose={onClose} title="标题">
 *   <ModalHeader title="标题" subtitle="副标题" />
 *   <ModalBody>内容区域</ModalBody>
 *   <ModalFooter>
 *     <button>取消</button>
 *     <button>确认</button>
 *   </ModalFooter>
 * </Modal>
 *
 * // 不同尺寸
 * <Modal size="xs">...</Modal>
 * <Modal size="sm">...</Modal>
 * <Modal size="md">...</Modal>
 * <Modal size="lg">...</Modal>
 * <Modal size="xl">...</Modal>
 * <Modal size="full">...</Modal>
 *
 * // 不同变体
 * <Modal variant="danger">...</Modal>
 * <Modal variant="warning">...</Modal>
 * <Modal variant="success">...</Modal>
 *
 * // 确认对话框
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleConfirm}
 *   title="确认删除"
 *   message="此操作无法撤销，确定要删除吗？"
 *   variant="danger"
 * />
 *
 * // 警告对话框
 * <AlertModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="操作成功"
 *   message="您的更改已保存"
 *   type="success"
 * />
 */

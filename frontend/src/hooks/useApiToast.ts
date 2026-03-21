/**
 * API Toast Hook
 * 集成 Toast 通知的 API 调用 hook
 */

import { useCallback, useState, useEffect } from 'react';
import { useToastActions } from '../components/Toast';

// ============================================
// 类型定义
// ============================================

interface ApiOptions {
  showSuccess?: boolean;
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface ApiResult<T> {
  data?: T;
  error?: Error;
  success: boolean;
}

// ============================================
// Hook
// ============================================

export function useApiToast() {
  const { success, error, warning, info } = useToastActions();

  const wrapApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      options: ApiOptions = {}
    ): Promise<ApiResult<T>> => {
      const {
        showSuccess = true,
        showError = true,
        successMessage,
        errorMessage
      } = options;

      try {
        const data = await apiCall();

        if (showSuccess) {
          success(successMessage || '操作成功');
        }

        return { data, success: true };
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));

        if (showError) {
          error(errorMessage || errorObj.message || '操作失败，请重试', {
            title: '错误',
            action: errorObj.message.includes('网络')
              ? { label: '重试', onClick: () => window.location.reload() }
              : undefined
          });
        }

        return { error: errorObj, success: false };
      }
    },
    [success, error]
  );

  const apiSuccess = useCallback((message: string, title?: string) => {
    success(message, title ? { title } : undefined);
  }, [success]);

  const apiError = useCallback((message: string, title?: string) => {
    error(message, title ? { title } : undefined);
  }, [error]);

  const apiWarning = useCallback((message: string, title?: string) => {
    warning(message, title ? { title } : undefined);
  }, [warning]);

  const apiInfo = useCallback((message: string, title?: string) => {
    info(message, title ? { title } : undefined);
  }, [info]);

  return {
    wrapApiCall,
    apiSuccess,
    apiError,
    apiWarning,
    apiInfo
  };
}

// ============================================
// 便捷 Hooks
// ============================================

/**
 * 用于表单提交的 API hook
 */
export function useFormSubmit<T>(
  onSubmit: (data: T) => Promise<void>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const { wrapApiCall } = useApiToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: T) => {
      setIsSubmitting(true);
      try {
        const result = await wrapApiCall(
          () => onSubmit(data),
          {
            showSuccess: !!options?.successMessage,
            showError: true,
            successMessage: options?.successMessage,
            errorMessage: options?.errorMessage
          }
        );

        if (result.success && options?.onSuccess) {
          options.onSuccess();
        } else if (!result.success && options?.onError && result.error) {
          options.onError(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, wrapApiCall, options]
  );

  return { handleSubmit, isSubmitting };
}

/**
 * 用于数据加载的 API hook
 */
export function useDataLoader<T>(
  loadFn: () => Promise<T>,
  options?: {
    showError?: boolean;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const { wrapApiCall } = useApiToast();
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    const result = await wrapApiCall(loadFn, {
      showSuccess: false,
      showError: options?.showError ?? true,
      errorMessage: options?.errorMessage
    });

    if (result.success && result.data) {
      setData(result.data);
      options?.onSuccess?.(result.data);
    } else if (result.error) {
      setError(result.error);
      options?.onError?.(result.error);
    }

    setIsLoading(false);
  }, [loadFn, wrapApiCall, options]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, isLoading, error, reload: loadData };
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * function MyComponent() {
 *   const { wrapApiCall } = useApiToast();
 *
 *   const handleDelete = async (id: string) => {
 *     await wrapApiCall(
 *       () => deleteItem(id),
 *       {
 *         successMessage: '删除成功',
 *         errorMessage: '删除失败'
 *       }
 *     );
 *   };
 * }
 *
 * // 表单提交
 * function MyForm() {
 *   const { handleSubmit, isSubmitting } = useFormSubmit(
 *     async (data) => {
 *       await submitForm(data);
 *     },
 *     {
 *       successMessage: '表单已提交',
 *       onSuccess: () => navigate('/success')
 *     }
 *   );
 * }
 *
 * // 数据加载
 * function DataList() {
 *   const { data, isLoading, error, reload } = useDataLoader(
 *     () => fetchItems(),
 *     {
 *       errorMessage: '加载数据失败'
 *     }
 *   );
 * }
 */

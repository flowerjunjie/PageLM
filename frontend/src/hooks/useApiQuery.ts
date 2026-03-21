/**
 * API Query Hook
 * 集成增强 API 客户端和 React Query 的 hook
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api, type ApiError } from '../lib/apiClient';
import { useToastActions } from '../components/Toast';

// ============================================
// 类型定义
// ============================================

export interface QueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  showError?: boolean;
  errorMessage?: string;
  cacheKey?: string[];
}

export interface MutationOptions<TData, TError, TVariables> {
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
}

// ============================================
// GET 请求 Hook
// ============================================

export function useApiGet<T>(
  endpoint: string,
  options?: QueryOptions<T>
) {
  const { error: showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError: shouldShowError = true,
    errorMessage,
    cacheKey,
    ...queryOptions
  } = options || {};

  // 生成查询键
  const queryKey = cacheKey || [endpoint];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<T>(endpoint);
      if (response.error) {
        throw response.error;
      }
      return response.data as T;
    },
    ...queryOptions
  });
}

// ============================================
// POST 请求 Hook
// ============================================

export function useApiPost<TData, TVariables = any>(
  endpoint: string,
  options?: MutationOptions<TData, ApiError, TVariables>
) {
  const { success, error } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError = true,
    showSuccess = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError
  } = options || {};

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await api.post<TData>(endpoint, variables);
      if (response.error) {
        throw response.error;
      }
      return response.data as TData;
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        success(successMessage);
      }
      onSuccess?.(data);
    },
    onError: (err) => {
      if (showError) {
        error(errorMessage || err.message || '操作失败');
      }
      onError?.(err);
    }
  });
}

// ============================================
// PUT 请求 Hook
// ============================================

export function useApiPut<TData, TVariables = any>(
  endpoint: string,
  options?: MutationOptions<TData, ApiError, TVariables>
) {
  const { success, error } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError = true,
    showSuccess = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError
  } = options || {};

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await api.put<TData>(endpoint, variables);
      if (response.error) {
        throw response.error;
      }
      return response.data as TData;
    },
    onSuccess: (data, variables) => {
      if (showSuccess && successMessage) {
        success(successMessage);
      }
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      onSuccess?.(data);
    },
    onError: (err) => {
      if (showError) {
        error(errorMessage || err.message || '更新失败');
      }
      onError?.(err);
    }
  });
}

// ============================================
// DELETE 请求 Hook
// ============================================

export function useApiDelete<TData = void, TVariables = string>(
  endpoint: string,
  options?: MutationOptions<TData, ApiError, TVariables>
) {
  const { success, error } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError = true,
    showSuccess = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError
  } = options || {};

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await api.delete<TData>(`${endpoint}/${variables}`);
      if (response.error) {
        throw response.error;
      }
      return response.data as TData;
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        success(successMessage);
      }
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      onSuccess?.(data);
    },
    onError: (err) => {
      if (showError) {
        error(errorMessage || err.message || '删除失败');
      }
      onError?.(err);
    }
  });
}

// ============================================
// 批量操作 Hook
// ============================================

export function useApiBatch<TData, TVariables = any>(
  endpoint: string,
  options?: MutationOptions<TData[], ApiError, TVariables[]>
) {
  const { success, error } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError = true,
    showSuccess = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError
  } = options || {};

  return useMutation({
    mutationFn: async (variables: TVariables[]) => {
      const responses = await Promise.all(
        variables.map(v => api.post<TData>(endpoint, v))
      );
      const errors = responses.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
      return responses.map(r => r.data) as TData[];
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        success(successMessage);
      }
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      onSuccess?.(data);
    },
    onError: (err) => {
      if (showError) {
        error(errorMessage || err.message || '批量操作失败');
      }
      onError?.(err);
    }
  });
}

// ============================================
// 无限滚动 Hook (简化版)
// ============================================

export function useApiInfinite<T>(
  endpoint: string,
  options?: Omit<QueryOptions<{ items: T[]; total: number }>, 'cacheKey'>
) {
  const { error: showError } = useToastActions();

  const {
    showError: shouldShowError = true,
    errorMessage,
    ...queryOptions
  } = options || {};

  // 简化版本：使用标准 useQuery，实际应用中可以使用 useInfiniteQuery
  return useQuery({
    queryKey: [endpoint, 'infinite'],
    queryFn: async (): Promise<{ items: T[]; total: number }> => {
      const response = await api.get<{ items: T[]; total: number }>(
        `${endpoint}?page=1&limit=20`
      );
      if (response.error) {
        throw response.error;
      }
      return response.data as { items: T[]; total: number };
    },
    ...queryOptions
  });
}

// 完整的无限滚动实现示例（供参考）
/*
export function useApiInfinite<T>(
  endpoint: string,
  options?: Omit<QueryOptions<{ items: T[]; total: number }>, 'cacheKey'>
) {
  const { error: showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    showError: shouldShowError = true,
    errorMessage,
    ...queryOptions
  } = options || {};

  return useInfiniteQuery({
    queryKey: [endpoint, 'infinite'],
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const response = await api.get<{ items: T[]; total: number }>(
        `${endpoint}?page=${pageParam}&limit=20`
      );
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { items: T[]; total: number } | undefined) => {
      if (!lastPage) return undefined;
      const currentPage = Math.floor(lastPage.items.length / 20) + 1;
      return lastPage.items.length < lastPage.total ? currentPage + 1 : undefined;
    },
    ...queryOptions
  });
}
*/

// ============================================
// 使用示例
// ============================================

/**
 * // GET 请求
 * function UserList() {
 *   const { data, isLoading, error } = useApiGet<User[]>('/users', {
 *     staleTime: 5 * 60 * 1000 // 5分钟
 *   });
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (error) return <ErrorView />;
 *   return <UserList data={data} />;
 * }
 *
 * // POST 请求（创建）
 * function CreateUserForm() {
 *   const createUser = useApiPost<User, CreateUserInput>('/users', {
 *     showSuccess: true,
 *     successMessage: '用户创建成功',
 *     onSuccess: (data) => {
 *       navigate(`/users/${data.id}`);
 *     }
 *   });
 *
 *   const handleSubmit = (data: CreateUserInput) => {
 *     createUser.mutate(data);
 *   };
 *
 *   return <Form onSubmit={handleSubmit} loading={createUser.isPending} />;
 * }
 *
 * // PUT 请求（更新）
 * function UpdateUserForm({ userId }) {
 *   const updateUser = useApiPut<User, UpdateUserInput>(
 *     `/users/${userId}`,
 *     {
 *       showSuccess: true,
 *       successMessage: '用户更新成功'
 *     }
 *   );
 *
 *   const handleSubmit = (data: UpdateUserInput) => {
 *     updateUser.mutate(data);
 *   };
 *
 *   return <Form onSubmit={handleSubmit} loading={updateUser.isPending} />;
 * }
 *
 * // DELETE 请求
 * function DeleteUserButton({ userId }) {
 *   const deleteUser = useApiDelete(`/users`, {
 *     showSuccess: true,
 *     successMessage: '用户已删除',
 *     onSuccess: () => {
 *       navigate('/users');
 *     }
 *   });
 *
 *   return (
 *     <Button
 *       onClick={() => deleteUser.mutate(userId)}
 *       loading={deleteUser.isPending}
 *     >
 *       删除
 *     </Button>
 *   );
 * }
 */

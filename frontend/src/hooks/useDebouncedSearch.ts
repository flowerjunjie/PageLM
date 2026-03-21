/**
 * Debounced Search Hook
 * 防抖搜索 hook，优化搜索输入性能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/apiClient';

// ============================================
// 类型定义
// ============================================

interface UseDebouncedSearchOptions<T> {
  debounceMs?: number;
  minChars?: number;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (results: T[]) => void;
  onError?: (error: Error) => void;
}

interface SearchState<T> {
  query: string;
  results: T[] | undefined;
  isSearching: boolean;
  error: Error | null;
  debouncedQuery: string;
}

interface UseDebouncedSearchReturn<T> extends SearchState<T> {
  setQuery: (query: string) => void;
  clearSearch: () => void;
  search: (query: string) => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useDebouncedSearch<T>(
  searchEndpoint: string,
  options: UseDebouncedSearchOptions<T> = {}
): UseDebouncedSearchReturn<T> {
  const {
    debounceMs = 300,
    minChars = 2,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000,
    onSuccess,
    onError
  } = options;

  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<T[]>();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 用于取消之前的请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 手动搜索函数
  const search = useCallback(async (searchQuery: string) => {
    if (!enabled || searchQuery.length < minChars) {
      setSearchResults(undefined);
      setIsSearching(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.get<{ results?: T[]; items?: T[]; data?: T[] }>(
        `${searchEndpoint}?q=${encodeURIComponent(searchQuery)}`,
        {
          signal: abortControllerRef.current.signal,
          timeout: 10000
        }
      );

      if (response.error) {
        throw response.error;
      }

      // 处理不同的响应格式
      const results = response.data?.results ||
                      response.data?.items ||
                      response.data?.data ||
                      response.data;

      const resultsArray = Array.isArray(results) ? results : [];

      setSearchResults(resultsArray);
      onSuccess?.(resultsArray);
    } catch (err) {
      // 如果是取消错误，不处理
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setIsSearching(false);
      onError?.(errorObj);
    } finally {
      setIsSearching(false);
    }
  }, [enabled, minChars, searchEndpoint, onSuccess, onError]);

  // 防抖效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query !== debouncedQuery) {
        search(query);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, debouncedQuery, search]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setSearchResults(undefined);
    setError(null);
    setIsSearching(false);
  }, []);

  // 设置查询
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  return {
    query,
    results: searchResults,
    isSearching,
    error,
    debouncedQuery,
    setQuery,
    clearSearch,
    search
  };
}

// ============================================
// ============================================
// 带缓存的搜索 Hook
// ============================================

export function useCachedSearch<T>(
  searchEndpoint: string,
  options: UseDebouncedSearchOptions<T> = {}
) {
  const {
    debounceMs = 300,
    minChars = 2,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    onSuccess,
    onError
  } = options;

  const [query, setQueryState] = useState('');

  // 使用 React Query 进行缓存
  const { data: results, isLoading: isSearching, error } = useQuery({
    queryKey: ['search', searchEndpoint, query],
    queryFn: async () => {
      if (query.length < minChars) {
        return [];
      }

      const response = await api.get<{ results?: T[]; items?: T[]; data?: T[] }>(
        `${searchEndpoint}?q=${encodeURIComponent(query)}`
      );

      if (response.error) {
        throw response.error;
      }

      const results = response.data?.results ||
                      response.data?.items ||
                      response.data?.data ||
                      response.data;

      const resultsArray = Array.isArray(results) ? results : [];
      onSuccess?.(resultsArray);
      return resultsArray;
    },
    enabled: enabled && query.length >= minChars,
    staleTime,
    gcTime: staleTime * 2
  });

  // 防抖效果
  useEffect(() => {
    const timer = setTimeout(() => {
      // 只在 query 变化时触发
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const clearSearch = useCallback(() => {
    setQueryState('');
  }, []);

  return {
    query,
    setQuery: setQueryState,
    results,
    isSearching,
    error,
    clearSearch
  };
}

// ============================================
// 本地搜索 Hook
// ============================================

export function useLocalSearch<T>(
  items: T[] | undefined,
  searchFn: (item: T, query: string) => boolean,
  options: {
    debounceMs?: number;
    minChars?: number;
  } = {}
) {
  const { debounceMs = 150, minChars = 1 } = options;

  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<T[]>(items || []);

  // 防抖效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // 搜索逻辑
  useEffect(() => {
    if (!items) {
      setResults([]);
      return;
    }

    if (debouncedQuery.length < minChars) {
      setResults(items);
      return;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    const filtered = items.filter(item => searchFn(item, lowerQuery));
    setResults(filtered);
  }, [items, debouncedQuery, minChars, searchFn]);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setResults(items || []);
  }, [items]);

  return {
    query,
    setQuery: setQueryState,
    results,
    debouncedQuery,
    clearSearch
  };
}

// ============================================
// 使用示例
// ============================================

/**
 * // API 搜索
 * function UserSearch() {
 *   const {
 *     query,
 *     setQuery,
 *     results,
 *     isSearching,
 *     error,
 *     clearSearch
 *   } = useDebouncedSearch<User>('/api/users/search', {
 *     debounceMs: 300,
 *     minChars: 2,
 *     onSuccess: (results) => {
 *       console.log('Found:', results.length);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         type="text"
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         placeholder="搜索用户..."
 *       />
 *       {isSearching && <LoadingSpinner />}
 *       {error && <ErrorMessage error={error} />}
 *       <UserList users={results} />
 *     </div>
 *   );
 * }
 *
 * // 本地搜索
 * function LocalUserSearch({ users }: { users: User[] }) {
 *   const {
 *     query,
 *     setQuery,
 *     results,
 *     clearSearch
 *   } = useLocalSearch(
 *     users,
 *     (user, query) => {
 *       return (
 *         user.name.toLowerCase().includes(query) ||
 *         user.email.toLowerCase().includes(query)
 *       );
 *     },
 *     { debounceMs: 150 }
 *   );
 *
 *   return (
 *     <div>
 *       <input
 *         type="text"
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         placeholder="搜索用户..."
 *       />
 *       <UserList users={results} />
 *     </div>
 *   );
 * }
 */

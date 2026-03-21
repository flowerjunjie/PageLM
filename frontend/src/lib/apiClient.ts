/**
 * Enhanced API Client
 * 增强的 API 客户端，包含重试逻辑、缓存和错误处理
 */

import { env } from '../config/env';

// ============================================
// 类型定义
// ============================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: RequestCache;
  signal?: AbortSignal;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
  headers: Headers;
  cached: boolean;
}

// ============================================
// API 错误类
// ============================================

export class ApiErrorClass extends Error implements ApiError {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================================
// API 客户端类
// ============================================

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  constructor() {
    this.baseURL = env.backend || window.location.origin;
    this.defaultTimeout = 30000; // 30秒
    this.defaultRetries = 3;
    this.cache = new Map();
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查缓存
   */
  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * 核心请求方法
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      cache: cacheMode = 'no-store',
      signal
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    // 检查缓存（仅 GET 请求）
    if (method === 'GET' && cacheMode !== 'no-store') {
      const cacheKey = this.getCacheKey(url, options);
      const cached = this.getCache<T>(cacheKey);
      if (cached) {
        return {
          data: cached,
          status: 304,
          headers: new Headers(),
          cached: true
        };
      }
    }

    let lastError: Error | null = null;

    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // 组合 signal
        const combinedSignal = signal
          ? this.combineSignals([controller.signal, signal])
          : controller.signal;

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          cache: cacheMode,
          signal: combinedSignal
        });

        clearTimeout(timeoutId);

        // 处理响应
        if (!response.ok) {
          let errorDetails: any;
          try {
            errorDetails = await response.json();
          } catch {
            errorDetails = await response.text();
          }

          throw new ApiErrorClass(
            errorDetails.message || `HTTP ${response.status}`,
            response.status,
            errorDetails.code,
            errorDetails
          );
        }

        // 解析响应
        const contentType = response.headers.get('content-type');
        let data: any;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text/')) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        // 缓存成功的 GET 请求
        if (method === 'GET' && response.ok) {
          const cacheKey = this.getCacheKey(url, options);
          this.setCache(cacheKey, data);
        }

        return {
          data,
          status: response.status,
          headers: response.headers,
          cached: false
        };

      } catch (error) {
        lastError = error as Error;

        // 不重试的错误
        if (error instanceof ApiErrorClass) {
          const status = (error as ApiErrorClass).status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            throw error; // 客户端错误不重试
          }
        }

        // 最后一次尝试失败，抛出错误
        if (attempt === retries) {
          throw error;
        }

        // 等待后重试
        await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
      }
    }

    throw lastError;
  }

  /**
   * 组合多个 AbortSignal
   */
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }

  // ============================================
  // 便捷方法
  // ============================================

  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ============================================
// 导出单例
// ============================================

export const apiClient = new ApiClient();

// ============================================
// 便捷函数
// ============================================

export const api = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'method'>) => apiClient.get<T>(url, options),
  post: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiClient.post<T>(url, body, options),
  put: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiClient.put<T>(url, body, options),
  patch: <T>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiClient.patch<T>(url, body, options),
  delete: <T>(url: string, options?: Omit<RequestOptions, 'method'>) => apiClient.delete<T>(url, options),
  clearCache: (pattern?: string) => apiClient.clearCache(pattern)
};

// ============================================
// 使用示例
// ============================================

/**
 * // GET 请求
 * const { data } = await api.get<User[]>('/users');
 *
 * // POST 请求
 * const { data } = await api.post<User>('/users', { name: 'John' });
 *
 * // 带重试和超时
 * const { data } = await api.get<Data>('/api/data', {
 *   timeout: 10000,
 *   retries: 5,
 *   retryDelay: 500
 * });
 *
 * // 使用缓存
 * const { data, cached } = await api.get<Settings>('/settings', {
 *   cache: 'force-cache'
 * });
 *
 * // 清除缓存
 * api.clearCache();
 * api.clearCache('/users/*');
 */

import { QueryClient, QueryCache } from '@tanstack/react-query';
import { env } from '../../config/env';

// Create Query Client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus by default (reduces network requests)
      refetchOnWindowFocus: false,
      // Retry on mount if data is stale
      refetchOnMount: true,
      // Deduplicate identical requests automatically
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      networkMode: 'online',
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // Global error handling for queries
      console.error('Query error:', error);
    },
  }),
});

// Query keys factory for consistent cache keys
export const queryKeys = {
  // Chat queries
  chats: ['chats'] as const,
  chatDetail: (id: string) => ['chats', id] as const,

  // Flashcard queries
  flashcards: ['flashcards'] as const,

  // Exam queries
  exams: ['exams'] as const,

  // Learning materials
  materials: (chatId: string) => ['materials', 'chat', chatId] as const,
  materialById: (id: string) => ['materials', id] as const,

  // Learning profile
  learningProfile: ['learning', 'profile'] as const,
  learningStats: ['learning', 'stats'] as const,
  knowledgeMap: ['learning', 'knowledge-map'] as const,
  subjectStats: ['learning', 'subjects'] as const,
  recentActivity: (limit: number) => ['learning', 'activity', limit] as const,

  // Reviews
  dueReviews: (userId?: string) => ['reviews', 'due', userId] as const,
  allReviews: (userId?: string) => ['reviews', 'all', userId] as const,
  reviewStats: (userId?: string) => ['reviews', 'stats', userId] as const,

  // Reports
  weeklyReport: (week?: string) => ['reports', 'weekly', week] as const,
  availableWeeks: ['reports', 'weeks'] as const,

  // Debates
  debates: ['debates'] as const,
  debateSession: (id: string) => ['debates', id] as const,

  // Planner
  plannerTasks: (params?: { status?: string; dueBefore?: number; course?: string }) =>
    ['planner', 'tasks', params] as const,
  plannerWeekly: (cram?: boolean) => ['planner', 'weekly', cram] as const,
};

import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from './index';
import * as api from '../api';
import type {
  ChatDetail,
  ChatInfo,
  ChatsList,
  CompanionAskResponse,
  CompanionHistoryEntry,
  DebateAnalysis,
  DebateSession,
  ExamEvent,
  FlashCard,
  PlannerEvent,
  PlannerSlot,
  PlannerTask,
  QuizEvent,
  SavedFlashcard,
  SmartNotesEvent,
  StudyMaterials,
  TranscriptionResponse,
  WeeklyReport,
} from '../api';

// ============ Chat Hooks ============
export function useChats(options?: Omit<UseQueryOptions<ChatsList>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.chats,
    queryFn: () => api.getChats(),
    ...options,
  });
}

export function useChatDetail(
  id: string,
  options?: Omit<UseQueryOptions<ChatDetail>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.chatDetail(id),
    queryFn: () => api.getChatDetail(id),
    enabled: !!id,
    ...options,
  });
}

export function useChatMutation(
  options?: Omit<UseMutationOptions<api.ChatStartResponse, Error, api.ChatJSONBody>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (body: api.ChatJSONBody) => api.chatJSON(body),
    ...options,
  });
}

// ============ Flashcard Hooks ============
export function useFlashcards(options?: Omit<UseQueryOptions<{ ok: true; flashcards: SavedFlashcard[] }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.flashcards,
    queryFn: () => api.listFlashcards(),
    ...options,
  });
}

export function useCreateFlashcard(
  options?: Omit<UseMutationOptions<{ ok: true; flashcard: SavedFlashcard }, Error, { question: string; answer: string; tag: string }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (input) => api.createFlashcard(input),
    ...options,
  });
}

export function useDeleteFlashcard(
  options?: Omit<UseMutationOptions<{ ok: true }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (id) => api.deleteFlashcard(id),
    ...options,
  });
}

// ============ Exam Hooks ============
export function useExams(options?: Omit<UseQueryOptions<{ ok: true; exams: { id: string; name: string; sections: any[] }[] }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.exams,
    queryFn: () => api.getExams(),
    ...options,
  });
}

export function useStartExam(
  options?: Omit<UseMutationOptions<{ ok: true; runId: string; stream: string }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (examId) => api.startExam(examId),
    ...options,
  });
}

// ============ Companion Hooks ============
export function useCompanionAsk(
  options?: Omit<UseMutationOptions<CompanionAskResponse, Error, {
    question: string;
    filePath?: string;
    documentText?: string;
    documentTitle?: string;
    topic?: string;
    history?: CompanionHistoryEntry[];
  }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (input) => api.companionAsk(input),
    ...options,
  });
}

// ============ Transcription Hook ============
export function useTranscribeAudio(
  options?: Omit<UseMutationOptions<TranscriptionResponse, Error, File>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (file) => api.transcribeAudio(file),
    ...options,
  });
}

// ============ Learning Materials Hooks ============
export function useGenerateMaterials(
  options?: Omit<UseMutationOptions<{ ok: boolean; materials: api.GeneratedMaterialRef; storedId?: string }, Error, { question: string; answer: string; chatId?: string }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (input) => api.generateMaterials(input),
    ...options,
  });
}

export function useMaterialsByChat(
  chatId: string,
  options?: Omit<UseQueryOptions<{ ok: boolean; chatId: string; materials: api.StoredMaterials[]; count: number }>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.materials(chatId),
    queryFn: () => api.getMaterialsByChat(chatId),
    enabled: !!chatId,
    ...options,
  });
}

export function useMaterialById(
  id: string,
  options?: Omit<UseQueryOptions<{ ok: boolean; material: api.StoredMaterials }>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.materialById(id),
    queryFn: () => api.getMaterialById(id),
    enabled: !!id,
    ...options,
  });
}

export function useDeleteMaterial(
  options?: Omit<UseMutationOptions<{ ok: boolean; message: string }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (id) => api.deleteMaterial(id),
    ...options,
  });
}

// ============ Learning Profile Hooks ============
export function useLearningProfile(options?: Omit<UseQueryOptions<{ ok: boolean; profile: api.LearningProfile }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.learningProfile,
    queryFn: () => api.getLearningProfile(),
    ...options,
  });
}

export function useLearningStats(options?: Omit<UseQueryOptions<{ ok: boolean; stats: api.LearningStats }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.learningStats,
    queryFn: () => api.getLearningStats(),
    ...options,
  });
}

export function useKnowledgeMap(options?: Omit<UseQueryOptions<{ ok: boolean; nodes: api.KnowledgeNode[]; edges: api.KnowledgeEdge[] }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.knowledgeMap,
    queryFn: () => api.getKnowledgeMap(),
    ...options,
  });
}

export function useSubjectStats(options?: Omit<UseQueryOptions<{ ok: boolean; subjects: api.SubjectStats[] }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.subjectStats,
    queryFn: () => api.getSubjectStats(),
    ...options,
  });
}

export function useRecentActivity(limit = 10, options?: Omit<UseQueryOptions<{ ok: boolean; activity: api.ActivityItem[] }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.recentActivity(limit),
    queryFn: () => api.getRecentActivity(limit),
    ...options,
  });
}

// ============ Review Hooks ============
export function useDueReviews(userId?: string, options?: Omit<UseQueryOptions<{ success: boolean; data: api.ReviewSchedule[]; meta: { total: number } }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.dueReviews(userId),
    queryFn: () => api.getDueReviews(userId),
    ...options,
  });
}

export function useAllReviews(userId?: string, options?: Omit<UseQueryOptions<{ success: boolean; data: api.ReviewSchedule[]; meta: { total: number } }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.allReviews(userId),
    queryFn: () => api.getAllReviews(userId),
    ...options,
  });
}

export function useReviewStats(userId?: string, options?: Omit<UseQueryOptions<{ success: boolean; data: api.ReviewStats }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.reviewStats(userId),
    queryFn: () => api.getReviewStats(userId),
    ...options,
  });
}

export function useSubmitReview(
  options?: Omit<UseMutationOptions<{ success: boolean; data: api.ReviewSchedule }, Error, { flashcardId: string; quality: number }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ flashcardId, quality }) => api.submitReviewResult(flashcardId, quality),
    ...options,
  });
}

export function useDeleteReviewSchedule(
  options?: Omit<UseMutationOptions<{ success: boolean; message: string }, Error, { flashcardId: string; userId?: string }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ flashcardId, userId }) => api.deleteReviewSchedule(flashcardId, userId),
    ...options,
  });
}

// ============ Weekly Report Hooks ============
export function useWeeklyReport(week?: string, options?: Omit<UseQueryOptions<WeeklyReport>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.weeklyReport(week),
    queryFn: () => api.getWeeklyReport(week),
    ...options,
  });
}

export function useAvailableWeeks(options?: Omit<UseQueryOptions<string[]>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.availableWeeks,
    queryFn: () => api.getAvailableWeeks(),
    ...options,
  });
}

export function useCreateShareLink(
  options?: Omit<UseMutationOptions<string, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (week) => api.createShareLink(week),
    ...options,
  });
}

export function useSharedReport(
  token: string,
  options?: Omit<UseQueryOptions<WeeklyReport>, 'queryKey'>
) {
  return useQuery({
    queryKey: ['reports', 'share', token],
    queryFn: () => api.getSharedReport(token),
    enabled: !!token,
    ...options,
  });
}

// ============ Debate Hooks ============
export function useDebates(options?: Omit<UseQueryOptions<{ ok: boolean; debates: any[]; error?: string }>, 'queryKey'>) {
  return useQuery({
    queryKey: queryKeys.debates,
    queryFn: () => api.listDebates(),
    ...options,
  });
}

export function useDebateSession(
  id: string,
  options?: Omit<UseQueryOptions<{ ok: boolean; session: DebateSession; error?: string }>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.debateSession(id),
    queryFn: () => api.getDebateSession(id),
    enabled: !!id,
    ...options,
  });
}

export function useStartDebate(
  options?: Omit<UseMutationOptions<api.DebateStartResponse, Error, { topic: string; position: 'for' | 'against' }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ topic, position }) => api.startDebate(topic, position),
    ...options,
  });
}

export function useSubmitDebateArgument(
  options?: Omit<UseMutationOptions<{ ok: boolean; message: string; error?: string }, Error, { debateId: string; argument: string }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ debateId, argument }) => api.submitDebateArgument(debateId, argument),
    ...options,
  });
}

export function useAnalyzeDebate(
  options?: Omit<UseMutationOptions<{ ok: boolean; analysis: api.DebateAnalysis; session: DebateSession; error?: string }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (debateId) => api.analyzeDebate(debateId),
    ...options,
  });
}

export function useDeleteDebate(
  options?: Omit<UseMutationOptions<{ ok: boolean; message: string; error?: string }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (debateId) => api.deleteDebate(debateId),
    ...options,
  });
}

export function useSurrenderDebate(
  options?: Omit<UseMutationOptions<{ ok: boolean; message: string; error?: string }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (debateId) => api.surrenderDebate(debateId),
    ...options,
  });
}

// ============ Planner Hooks ============
export function usePlannerTasks(
  params?: { status?: string; dueBefore?: number; course?: string },
  options?: Omit<UseQueryOptions<{ ok: boolean; tasks: PlannerTask[] }>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.plannerTasks(params),
    queryFn: () => api.plannerList(params),
    ...options,
  });
}

export function usePlannerWeekly(
  cram?: boolean,
  options?: Omit<UseQueryOptions<{ ok: boolean; plan: { days: { date: string; slots: PlannerSlot[] }[] } }>, 'queryKey'>
) {
  return useQuery({
    queryKey: queryKeys.plannerWeekly(cram),
    queryFn: () => api.plannerWeekly(cram),
    ...options,
  });
}

export function usePlannerIngest(
  options?: Omit<UseMutationOptions<{ ok: boolean; task: PlannerTask }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (text) => api.plannerIngest(text),
    ...options,
  });
}

export function usePlannerUpdate(
  options?: Omit<UseMutationOptions<{ ok: boolean; task: PlannerTask }, Error, { id: string; patch: Partial<PlannerTask> }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ id, patch }) => api.plannerUpdate(id, patch),
    ...options,
  });
}

export function usePlannerDelete(
  options?: Omit<UseMutationOptions<{ ok: boolean }, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (id) => api.plannerDelete(id),
    ...options,
  });
}

export function usePlannerCreateWithFiles(
  options?: Omit<UseMutationOptions<{ ok: boolean; task: PlannerTask & { files?: any[] } }, Error, { text?: string; title?: string; course?: string; type?: string; files?: File[] }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (data) => api.plannerCreateWithFiles(data),
    ...options,
  });
}

// ============ WebSocket Wrapper Hooks ============
// These provide a consistent interface for WebSocket connections
export function useWebSocketConnection<T extends { type: string }>(
  connectFn: (onEvent: (ev: T) => void) => { ws: WebSocket; close: () => void }
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<{ ws: WebSocket; close: () => void } | null>(null);

  const connect = useCallback((onEvent: (ev: T) => void) => {
    try {
      const connection = connectFn((ev) => {
        if (ev.type === 'error') {
          setError(new Error('Stream error'));
          setIsConnected(false);
        }
        onEvent(ev);
      });

      wsRef.current = connection;
      setIsConnected(true);
      setError(null);

      return connection;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      setIsConnected(false);
      throw error;
    }
  }, [connectFn]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, isConnected, error };
}

// Import useState, useCallback, useRef, useEffect
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * UI Components Export
 * 统一导出所有 UI 组件
 */

// ============================================
// Components
// ============================================

// Performance & Loading
export { default as PerformanceMonitor } from './PerformanceMonitor';
export {
  LoadingScreen,
  InlineLoader,
  Skeleton,
  ChatMessageSkeleton,
  CardSkeleton,
  ListSkeleton,
  LoadingButton,
  DelayedLoader
} from './LoadingStates';

// Notifications
export { ToastProvider, useToast, useToastActions } from './Toast';

// Empty States
export { default as EmptyState } from './EmptyState';
export { NoData, NoSearchResults, NoFavorites, NoNetwork } from './EmptyState';

// Cards
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  StatCard,
  FeatureCard,
  ActionCard
} from './Card';

// Badges
export {
  Badge,
  StatusBadge,
  Tag,
  ProgressBadge,
  NotificationBadge,
  NewBadge,
  BetaBadge,
  ProBadge,
  HotBadge
} from './Badge';

// Progress
export {
  ProgressBar,
  CircularProgress,
  ProgressSteps,
  IndeterminateProgress,
  ProgressRing
} from './Progress';

// Modals
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmModal,
  AlertModal
} from './Modal';

// Error Handling
export { default as ErrorFallback } from './ErrorFallback';

// User Profile
export { UserProfileCard, UserStatsCard } from './UserProfileCard';

// Learning Components
export { StudyTimer } from './StudyTimer';
export { LearningPath, QuickPath } from './LearningPath';
export { AchievementCard, AchievementGrid } from './AchievementCard';
export { LessonCard, LessonGrid } from './LessonCard';

// Dashboard & Analytics
export { LearningStatsDashboard } from './LearningStatsDashboard';

// Search & Filter
export { SearchInput } from './SearchInput';
export { FilterPanel } from './FilterPanel';

// Form Components
export {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
  FormSwitch,
  FormSlider,
  FormDatePicker,
  FormLabel,
  FormError,
  formValidators,
  validateForm
} from './FormComponents';

// ============================================
// Types
// ============================================

export type { StudyTimerVariant, TimerMode, TimerStatus } from './StudyTimer';
export type { LearningPathVariant, StepStatus, LearningStep } from './LearningPath';
export type { AchievementRarity, AchievementStatus } from './AchievementCard';
export type { LessonCardVariant, LessonStatus, LessonDifficulty } from './LessonCard';
export type { TimeRange, StatsView, LearningActivity, SubjectMastery, StreakData, LearningStatsData } from './LearningStatsDashboard';
export type { SearchInputVariant, SearchSuggestion, SearchFilter } from './SearchInput';
export type { FilterType, FilterOption, FilterGroup, ActiveFilter } from './FilterPanel';
export type {
  InputSize,
  InputState,
  FormInputProps,
  FormTextareaProps,
  FormSelectProps,
  FormCheckboxProps,
  FormRadioGroupProps,
  FormSwitchProps,
  FormSliderProps,
  FormDatePickerProps
} from './FormComponents';

// ============================================
// Hooks
// ============================================

export { useApiToast } from '../hooks/useApiToast';
export {
  useApiGet,
  useApiPost,
  useApiPut,
  useApiDelete,
  useApiBatch,
  useApiInfinite
} from '../hooks/useApiQuery';

export {
  useDebouncedSearch,
  useCachedSearch,
  useLocalSearch
} from '../hooks/useDebouncedSearch';

export {
  useVirtualList,
  useSimpleVirtualList
} from '../hooks/useVirtualList';

export {
  useLatest,
  useStableCallback
} from '../hooks/useLatest';

export {
  useLazyState,
  useMediaQuery,
  buildIndexMap
} from '../hooks/usePerformance';

export {
  useDebounce as useDebounceHook
} from '../hooks/useDebounce';

export {
  useThrottle as useThrottleHook
} from '../hooks/useThrottle';

// ============================================
// Utilities
// ============================================

export { apiClient } from '../lib/apiClient';
export { queryClient } from '../lib/query';

// ============================================
// Re-export commonly used types
// ============================================

export type { Toast, ToastType } from './Toast';
export type { ApiError } from '../lib/apiClient';

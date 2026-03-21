/**
 * LearningPath Component
 * 学习路径/进度追踪组件 - 显示步骤进度和导航
 */

import { ReactNode, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

export type LearningPathVariant = 'horizontal' | 'vertical';
export type StepStatus = 'pending' | 'current' | 'completed' | 'locked';

export interface LearningStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  status: StepStatus;
  disabled?: boolean;
}

interface LearningPathProps {
  steps: LearningStep[];
  currentStepId?: string;
  onStepClick?: (step: LearningStep, index: number) => void;
  variant?: LearningPathVariant;
  showProgress?: boolean;
  showLabels?: boolean;
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const STATUS_CONFIG = {
  pending: {
    bgColor: 'bg-stone-800',
    borderColor: 'border-stone-700',
    textColor: 'text-stone-500',
    iconColor: 'text-stone-600',
    lineColor: 'bg-stone-800'
  },
  current: {
    bgColor: 'bg-sky-600',
    borderColor: 'border-sky-500',
    textColor: 'text-sky-500',
    iconColor: 'text-white',
    lineColor: 'bg-sky-500'
  },
  completed: {
    bgColor: 'bg-emerald-600',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-500',
    iconColor: 'text-white',
    lineColor: 'bg-emerald-500'
  },
  locked: {
    bgColor: 'bg-stone-900',
    borderColor: 'border-stone-800',
    textColor: 'text-stone-600',
    iconColor: 'text-stone-700',
    lineColor: 'bg-stone-800'
  }
};

// ============================================
// 子组件
// ============================================

interface StepNodeProps {
  step: LearningStep;
  index: number;
  isClickable: boolean;
  onClick?: () => void;
  showLabel: boolean;
  variant: LearningPathVariant;
}

function StepNode({ step, index, isClickable, onClick, showLabel, variant }: StepNodeProps) {
  const config = STATUS_CONFIG[step.status];
  const isCompleted = step.status === 'completed';
  const isCurrent = step.status === 'current';
  const isLocked = step.status === 'locked';

  const baseClasses = `
    relative flex items-center justify-center
    w-10 h-10 rounded-full border-2 font-semibold
    transition-all duration-200
    ${config.bgColor} ${config.borderColor}
  `;

  const interactiveClasses = isClickable && !isLocked
    ? 'cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95'
    : 'cursor-default';

  const icon = step.icon || (
    isCompleted ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ) : isLocked ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <span className="text-sm">{index + 1}</span>
    )
  );

  return (
    <div className={`flex ${variant === 'vertical' ? 'flex-col items-center gap-2' : 'flex-col items-center'}`}>
      {/* Step circle */}
      <button
        onClick={isClickable && !isLocked ? onClick : undefined}
        disabled={!isClickable || isLocked}
        className={`${baseClasses} ${interactiveClasses}`}
        aria-label={`Step ${index + 1}: ${step.title}`}
        aria-current={isCurrent ? 'step' : undefined}
      >
        <span className={config.iconColor}>{icon}</span>

        {/* Pulse animation for current step */}
        {isCurrent && (
          <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-20" />
        )}
      </button>

      {/* Step label */}
      {showLabel && (
        <div
          className={`
            mt-2 text-center transition-colors duration-200
            ${variant === 'vertical' ? 'text-left' : 'absolute -bottom-8'}
            ${isCurrent ? 'text-sky-500 font-medium' : config.textColor}
          `}
          style={variant === 'vertical' ? undefined : { minWidth: '80px' }}
        >
          <p className="text-sm font-medium whitespace-nowrap">{step.title}</p>
          {step.description && (
            <p className={`text-xs mt-0.5 ${isCurrent ? 'text-sky-400' : 'text-stone-500'}`}>
              {step.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ProgressLineProps {
  status: StepStatus;
  variant: LearningPathVariant;
}

function ProgressLine({ status, variant }: ProgressLineProps) {
  const config = STATUS_CONFIG[status];
  const lineClass = `flex-1 h-0.5 rounded-full transition-all duration-300 ${config.lineColor}`;

  return (
    <div
      className={variant === 'vertical' ? 'flex-1 w-0.5 my-2' : lineClass}
      aria-hidden="true"
    />
  );
}

// ============================================
// 主组件
// ============================================

export function LearningPath({
  steps,
  currentStepId,
  onStepClick,
  variant = 'horizontal',
  showProgress = true,
  showLabels = true,
  className = ''
}: LearningPathProps) {
  const { t } = useTranslation('common');

  // Calculate progress
  const currentIndex = currentStepId
    ? steps.findIndex((s) => s.id === currentStepId)
    : steps.findIndex((s) => s.status === 'current');

  const progressPercentage = currentIndex >= 0
    ? ((currentIndex + 1) / steps.length) * 100
    : 0;

  const completedCount = steps.filter((s) => s.status === 'completed').length;

  // Determine if step is clickable
  const isStepClickable = (step: LearningStep, index: number): boolean => {
    if (step.disabled || step.status === 'locked') return false;
    // Can click completed or current steps
    if (step.status === 'completed' || step.status === 'current') return true;
    // Can click the first pending step
    if (step.status === 'pending') {
      const previousStep = steps[index - 1];
      return !previousStep || previousStep.status === 'completed';
    }
    return false;
  };

  // Handle step click
  const handleStepClick = (step: LearningStep, index: number) => {
    if (isStepClickable(step, index)) {
      onStepClick?.(step, index);
    }
  };

  const baseClasses = variant === 'horizontal'
    ? 'w-full'
    : 'w-full max-w-xs mx-auto';

  return (
    <div className={`${baseClasses} ${className}`}>
      {/* Progress overview */}
      {showProgress && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-400">学习进度</p>
            <p className="text-2xl font-bold text-white mt-1">
              {Math.round(progressPercentage)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-400">已完成</p>
            <p className="text-2xl font-bold text-white mt-1">
              {completedCount}/{steps.length}
            </p>
          </div>
        </div>
      )}

      {/* Overall progress bar */}
      {showProgress && (
        <div className="relative h-2 bg-stone-800 rounded-full overflow-hidden mb-8">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Steps */}
      <div
        className={`
          flex items-center
          ${variant === 'horizontal' ? 'justify-between' : 'flex-col justify-start gap-0'}
        `}
        role="list"
        aria-label="Learning path steps"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const lineStatus = step.status === 'completed' ? 'completed' : 'pending';

          return (
            <div
              key={step.id}
              className={`
                flex items-center
                ${variant === 'horizontal' ? 'flex-1' : 'w-full flex-col'}
              `}
              role="listitem"
            >
              {/* Step node */}
              <div className={variant === 'horizontal' ? 'flex-1' : 'w-full'}>
                <StepNode
                  step={step}
                  index={index}
                  isClickable={isStepClickable(step, index)}
                  onClick={() => handleStepClick(step, index)}
                  showLabel={showLabels}
                  variant={variant}
                />
              </div>

              {/* Progress line (not for last step) */}
              {!isLast && (
                <div className={variant === 'horizontal' ? 'flex-1 px-2' : 'flex-1'}>
                  <ProgressLine status={lineStatus} variant={variant} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current step info */}
      {currentStepId && currentIndex >= 0 && (
        <div className="mt-12 p-4 bg-stone-900/50 border border-stone-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center">
              <span className="text-white font-semibold">{currentIndex + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-400">当前步骤</p>
              <p className="text-lg font-semibold text-white mt-0.5">
                {steps[currentIndex]?.title}
              </p>
              {steps[currentIndex]?.description && (
                <p className="text-sm text-stone-400 mt-1">
                  {steps[currentIndex].description}
                </p>
              )}
            </div>
            {steps[currentIndex]?.status === 'completed' && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/30 text-emerald-500 text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  已完成
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 预设组件
// ============================================

interface QuickPathProps {
  currentStep: number;
  totalSteps: number;
  onStepChange?: (step: number) => void;
  variant?: LearningPathVariant;
  className?: string;
}

export function QuickPath({
  currentStep,
  totalSteps,
  onStepChange,
  variant = 'horizontal',
  className = ''
}: QuickPathProps) {
  const steps: LearningStep[] = Array.from({ length: totalSteps }, (_, i) => ({
    id: `step-${i}`,
    title: `步骤 ${i + 1}`,
    status: i < currentStep ? 'completed' : i === currentStep ? 'current' : 'pending'
  }));

  return (
    <LearningPath
      steps={steps}
      currentStepId={`step-${currentStep}`}
      onStepClick={(step) => onStepChange?.(parseInt(step.id.split('-')[1]))}
      variant={variant}
      className={className}
    />
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * const steps = [
 *   { id: '1', title: '开始', status: 'completed' as const },
 *   { id: '2', title: '学习中', status: 'current' as const },
 *   { id: '3', title: '完成', status: 'pending' as const }
 * ];
 * <LearningPath steps={steps} />
 *
 * // 带点击处理
 * <LearningPath
 *   steps={steps}
 *   currentStepId="2"
 *   onStepClick={(step, index) => {
 *     console.log('Clicked step:', step.title);
 *   }}
 * />
 *
 * // 垂直布局
 * <LearningPath
 *   steps={steps}
 *   variant="vertical"
 *   showLabels={true}
 * />
 *
 * // 快速路径（简单数字步骤）
 * <QuickPath
 *   currentStep={2}
 *   totalSteps={5}
 *   onStepChange={(step) => console.log('Go to step:', step)}
 * />
 *
 * // 自定义图标和描述
 * const detailedSteps = [
 *   {
 *     id: 'upload',
 *     title: '上传材料',
 *     description: 'PDF, Word, 或图片',
 *     status: 'completed' as const,
 *     icon: <UploadIcon />
 *   },
 *   {
 *     id: 'process',
 *     title: 'AI 处理',
 *     description: '提取关键信息',
 *     status: 'current' as const,
 *     icon: <ProcessingIcon />
 *   },
 *   {
 *     id: 'review',
 *     title: '审核结果',
 *     description: '确认准确性',
 *     status: 'pending' as const,
 *     icon: <ReviewIcon />
 *   }
 * ];
 * <LearningPath steps={detailedSteps} />
 */

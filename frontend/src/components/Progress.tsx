/**
 * Progress Component
 * 进度条组件，用于显示加载进度和完成状态
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';
type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'primary';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressSize;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
  striped?: boolean;
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  completed?: number[];
  className?: string;
}

// ============================================
// 样式配置
// ============================================

const sizeStyles: Record<ProgressSize, string> = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4'
};

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  primary: 'bg-indigo-500'
};

// ============================================
// Linear Progress Bar
// ============================================

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className = '',
  animated = false,
  striped = false
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-stone-400">{label}</span>}
          {showLabel && <span className="text-sm font-medium text-stone-200">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`relative w-full ${sizeStyles[size]} bg-stone-800 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${variantStyles[variant]} rounded-full transition-all duration-300 ease-out ${
            striped ? 'bg-[length:20px_20px_0_0] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem]' : ''
          } ${animated ? 'animate-progress' : ''}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// ============================================
// Circular Progress
// ============================================

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showLabel = false,
  label,
  className = ''
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colors: Record<ProgressVariant, string> = {
    default: '#0ea5e9', // sky-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    primary: '#6366f1'  // indigo-500
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937" // stone-800
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </svg>
      {/* 中心标签 */}
      {(label || showLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label ? (
            <span className="text-sm text-stone-400">{label}</span>
          ) : null}
          {showLabel && (
            <span className="text-xl font-bold text-stone-200">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Progress Steps
// ============================================

export function ProgressSteps({
  steps,
  currentStep,
  completed = [],
  className = ''
}: ProgressStepsProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completed.includes(index) || index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex-1 flex items-center">
              {/* 步骤圆圈 */}
              <div
                className={`
                  relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-all duration-200
                  ${
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-stone-700 bg-stone-900 text-stone-500'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>

              {/* 步骤标签 */}
              <div
                className={`
                  absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs transition-colors duration-200
                  ${isCurrent ? 'text-sky-500 font-medium' : 'text-stone-500'}
                `}
              >
                {step}
              </div>

              {/* 连接线 */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-colors duration-200
                    ${isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-stone-800'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Indeterminate Progress
// ============================================

export function IndeterminateProgress({
  size = 'md',
  variant = 'default',
  className = ''
}: { size?: ProgressSize; variant?: ProgressVariant; className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className={`relative w-full ${sizeStyles[size]} bg-stone-800 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${variantStyles[variant]} rounded-full animate-indeterminate-progress`}
          role="progressbar"
          aria-label="Loading"
        />
      </div>
    </div>
  );
}

// ============================================
// Progress Ring (简易版)
// ============================================

export function ProgressRing({
  value,
  max = 100,
  size = 40,
  className = ''
}: {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className={className}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1f2937"
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </svg>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 线性进度条
 * <ProgressBar value={75} />
 * <ProgressBar value={30} variant="success" showLabel />
 * <ProgressBar value={90} label="上传中..." size="lg" striped animated />
 *
 * // 圆形进度
 * <CircularProgress value={65} size={120} showLabel />
 * <CircularProgress value={40} variant="warning" label="处理中" />
 *
 * // 步骤进度
 * <ProgressSteps
 *   steps={['注册', '验证', '完成']}
 *   currentStep={1}
 *   completed={[0]}
 * />
 *
 * // 不确定进度
 * <IndeterminateProgress />
 * <IndeterminateProgress variant="primary" size="lg" />
 *
 * // 进度环
 * <ProgressRing value={75} size={32} />
 *
 * // 动态更新
 * function UploadProgress() {
 *   const [progress, setProgress] = useState(0);
 *
 *   useEffect(() => {
 *     const interval = setInterval(() => {
 *       setProgress(p => Math.min(100, p + 10));
 *     }, 500);
 *     return () => clearInterval(interval);
 *   }, []);
 *
 *   return (
 *     <ProgressBar
 *       value={progress}
 *       showLabel
 *       label="上传中"
 *       variant={progress === 100 ? 'success' : 'primary'}
 *     />
 *   );
 * }
 */

/**
 * StudyTimer Component
 * 学习计时器组件 - 支持番茄钟计时法
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================
// 类型定义
// ============================================

export type StudyTimerVariant = 'minimal' | 'standard' | 'detailed';
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface StudyTimerProps {
  variant?: StudyTimerVariant;
  focusDuration?: number; // 分钟
  shortBreakDuration?: number; // 分钟
  longBreakDuration?: number; // 分钟
  longBreakInterval?: number; // 几个focus后进入长休息
  onSessionComplete?: (mode: TimerMode, duration: number) => void;
  enableSound?: boolean;
  autoStart?: boolean;
  className?: string;
}

interface StudySession {
  mode: TimerMode;
  duration: number;
  completedAt: Date;
}

// ============================================
// 常量配置
// ============================================

const DEFAULT_DURATIONS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15
};

const MODE_COLORS = {
  focus: 'bg-sky-500',
  shortBreak: 'bg-emerald-500',
  longBreak: 'bg-indigo-500'
};

const MODE_GRADIENTS = {
  focus: 'from-sky-500 to-blue-600',
  shortBreak: 'from-emerald-500 to-green-600',
  longBreak: 'from-indigo-500 to-purple-600'
};

// ============================================
// 工具函数
// ============================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

// ============================================
// 子组件
// ============================================

interface TimerDisplayProps {
  time: number;
  totalTime: number;
  mode: TimerMode;
  status: TimerStatus;
  variant: StudyTimerVariant;
}

function TimerDisplay({ time, totalTime, mode, status, variant }: TimerDisplayProps) {
  const percentage = ((totalTime - time) / totalTime) * 100;
  const isFocus = mode === 'focus';

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-white tabular-nums">
          {formatTime(time)}
        </span>
        {status === 'running' && (
          <div className="flex gap-0.5">
            <span className="w-1 h-4 bg-sky-500 rounded animate-pulse" />
            <span className="w-1 h-4 bg-sky-500 rounded animate-pulse delay-100" />
            <span className="w-1 h-4 bg-sky-500 rounded animate-pulse delay-200" />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="relative">
        {/* SVG Circular Progress */}
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(41, 37, 36, 0.5)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - percentage / 100)}
            className="transition-all duration-1000 ease-out"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={mode === 'focus' ? '#0ea5e9' : mode === 'shortBreak' ? '#10b981' : '#6366f1'} />
              <stop offset="100%" stopColor={mode === 'focus' ? '#2563eb' : mode === 'shortBreak' ? '#059669' : '#8b5cf6'} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white tabular-nums">
            {formatTime(time)}
          </span>
          <span className={`text-sm mt-2 ${isFocus ? 'text-sky-400' : 'text-emerald-400'}`}>
            {mode === 'focus' ? '专注中' : mode === 'shortBreak' ? '短休息' : '长休息'}
          </span>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className="space-y-4">
      {/* Time display */}
      <div className="text-6xl font-bold text-white tabular-nums">
        {formatTime(time)}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${MODE_COLORS[mode]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Mode indicator */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
        isFocus ? 'bg-sky-900/30 text-sky-400' : 'bg-emerald-900/30 text-emerald-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'animate-pulse' : ''} ${isFocus ? 'bg-sky-400' : 'bg-emerald-400'}`} />
        <span className="text-sm font-medium">
          {mode === 'focus' ? '专注时间' : mode === 'shortBreak' ? '短休息' : '长休息'}
        </span>
      </div>
    </div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary';
}

function ControlButton({ onClick, disabled, icon, label, variant = 'secondary' }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 py-2
        rounded-xl font-medium transition-all duration-200
        ${variant === 'primary'
          ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-900/20'
          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-stone-900
      `}
      aria-label={label}
    >
      {icon}
      {variant === 'primary' && <span>{label}</span>}
    </button>
  );
}

// ============================================
// 主组件
// ============================================

export function StudyTimer({
  variant = 'standard',
  focusDuration = DEFAULT_DURATIONS.focus,
  shortBreakDuration = DEFAULT_DURATIONS.shortBreak,
  longBreakDuration = DEFAULT_DURATIONS.longBreak,
  longBreakInterval = 4,
  onSessionComplete,
  enableSound = false,
  autoStart = false,
  className = ''
}: StudyTimerProps) {
  const { t } = useTranslation('common');

  // Timer state
  const [mode, setMode] = useState<TimerMode>('focus');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [focusStreak, setFocusStreak] = useState(0);

  // Refs
  const intervalRef = useRef<number | null>(null);
  const totalTimeRef = useRef(focusDuration * 60);

  // Get current duration based on mode
  const getCurrentDuration = useCallback(() => {
    switch (mode) {
      case 'focus':
        return focusDuration;
      case 'shortBreak':
        return shortBreakDuration;
      case 'longBreak':
        return longBreakDuration;
    }
  }, [mode, focusDuration, shortBreakDuration, longBreakDuration]);

  // Determine next mode
  const getNextMode = useCallback((): TimerMode => {
    if (mode === 'focus') {
      const shouldLongBreak = (focusStreak + 1) % longBreakInterval === 0;
      return shouldLongBreak ? 'longBreak' : 'shortBreak';
    }
    return 'focus';
  }, [mode, focusStreak, longBreakInterval]);

  // Timer tick
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer complete
          setStatus('completed');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Play sound if enabled
          if (enableSound) {
            playNotificationSound();
          }

          // Record session
          const session: StudySession = {
            mode,
            duration: getCurrentDuration(),
            completedAt: new Date()
          };
          setSessions((prev) => [...prev, session]);

          // Update focus streak
          if (mode === 'focus') {
            setFocusStreak((prev) => prev + 1);
          }

          // Call completion callback
          onSessionComplete?.(mode, getCurrentDuration());

          // Auto-start next session if enabled
          if (autoStart) {
            setTimeout(() => {
              const nextMode = getNextMode();
              setMode(nextMode);
              const nextDuration = nextMode === 'focus' ? focusDuration :
                nextMode === 'shortBreak' ? shortBreakDuration : longBreakDuration;
              setTimeLeft(nextDuration * 60);
              totalTimeRef.current = nextDuration * 60;
              setStatus('running');
            }, 1000);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, mode, getCurrentDuration, onSessionComplete, enableSound, autoStart, getNextMode, focusDuration, shortBreakDuration, longBreakDuration]);

  // Update time when mode changes
  useEffect(() => {
    if (status === 'idle') {
      const duration = getCurrentDuration();
      setTimeLeft(duration * 60);
      totalTimeRef.current = duration * 60;
    }
  }, [mode, getCurrentDuration, status]);

  // Control handlers
  const handleStart = () => {
    setStatus('running');
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleReset = () => {
    setStatus('idle');
    const duration = getCurrentDuration();
    setTimeLeft(duration * 60);
    totalTimeRef.current = duration * 60;
  };

  const handleSkip = () => {
    const nextMode = getNextMode();
    setMode(nextMode);
    setStatus('idle');
    const nextDuration = nextMode === 'focus' ? focusDuration :
      nextMode === 'shortBreak' ? shortBreakDuration : longBreakDuration;
    setTimeLeft(nextDuration * 60);
    totalTimeRef.current = nextDuration * 60;
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setStatus('idle');
    const duration = newMode === 'focus' ? focusDuration :
      newMode === 'shortBreak' ? shortBreakDuration : longBreakDuration;
    setTimeLeft(duration * 60);
    totalTimeRef.current = duration * 60;
  };

  // Calculate stats
  const totalFocusTime = sessions
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + s.duration, 0);

  const todaySessions = sessions.filter(
    (s) => new Date(s.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className={`bg-stone-900/50 border border-stone-800 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      {variant !== 'minimal' && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">学习计时器</h2>
            <p className="text-sm text-stone-400 mt-1">
              {variant === 'detailed' && `已完成 ${sessions.length} 个会话 · 今日 ${todaySessions} 个`}
            </p>
          </div>

          {/* Mode selector */}
          {variant === 'detailed' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('focus')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'focus'
                    ? 'bg-sky-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                专注
              </button>
              <button
                onClick={() => handleModeChange('shortBreak')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'shortBreak'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                短休息
              </button>
              <button
                onClick={() => handleModeChange('longBreak')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'longBreak'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                长休息
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timer Display */}
      <div className="flex justify-center mb-8">
        <TimerDisplay
          time={timeLeft}
          totalTime={totalTimeRef.current}
          mode={mode}
          status={status}
          variant={variant}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {status === 'idle' || status === 'completed' ? (
          <ControlButton
            onClick={handleStart}
            disabled={false}
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            }
            label="开始"
            variant="primary"
          />
        ) : (
          <>
            <ControlButton
              onClick={handlePause}
              disabled={status === 'paused'}
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                </svg>
              }
              label="暂停"
            />
            <ControlButton
              onClick={handleStart}
              disabled={status === 'running'}
              icon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              }
              label="继续"
            />
          </>
        )}

        <ControlButton
          onClick={handleReset}
          disabled={status === 'idle'}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                clipRule="evenodd"
              />
            </svg>
          }
          label="重置"
        />

        <ControlButton
          onClick={handleSkip}
          disabled={status === 'idle'}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 006.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5zM9.75 7a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 019.75 7z" />
            </svg>
          }
          label="跳过"
        />
      </div>

      {/* Session stats (detailed variant only) */}
      {variant === 'detailed' && (
        <div className="mt-8 pt-6 border-t border-stone-800">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
              <p className="text-sm text-stone-400 mt-1">完成会话</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{Math.floor(totalFocusTime / 60)}h</p>
              <p className="text-sm text-stone-400 mt-1">专注时长</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{focusStreak}</p>
              <p className="text-sm text-stone-400 mt-1">连续专注</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 使用示例
// ============================================

/**
 * // 基础使用
 * <StudyTimer />
 *
 * // 自定义时长
 * <StudyTimer
 *   focusDuration={30}
 *   shortBreakDuration={10}
 *   longBreakDuration={20}
 * />
 *
 * // 最小化变体
 * <StudyTimer variant="minimal" />
 *
 * // 详细变体，带声音
 * <StudyTimer
 *   variant="detailed"
 *   enableSound={true}
 *   onSessionComplete={(mode, duration) => {
 *     console.log(`Completed ${mode} session of ${duration} minutes`);
 *   }}
 * />
 *
 * // 自动开始下一会话
 * <StudyTimer autoStart={true} />
 */

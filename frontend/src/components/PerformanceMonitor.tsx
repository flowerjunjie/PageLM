/**
 * Performance Monitor Component
 * 追踪和显示实时性能指标
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  fpsHistory: number[];
  isLowPerformance: boolean;
}

export default function PerformanceMonitor() {
  const { t } = useTranslation('common');
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    fpsHistory: [],
    isLowPerformance: false,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frames = 0;
    const fpsHistory: number[] = [];
    const maxHistoryLength = 60;

    const measurePerformance = () => {
      const currentTime = performance.now();
      frames++;

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));

        // 记录FPS历史
        fpsHistory.push(fps);
        if (fpsHistory.length > maxHistoryLength) {
          fpsHistory.shift();
        }

        // 检测内存使用（如果支持）
        const memory = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0;

        // 判断是否低性能
        const isLowPerformance = fps < 30 || (memory > 100 && memory < 200);

        setMetrics({
          fps,
          memory,
          fpsHistory: [...fpsHistory],
          isLowPerformance,
        });

        frames = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    // 只在开发环境或显式启用时运行
    if (import.meta.env.DEV || isVisible) {
      measurePerformance();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible]);

  // 开发环境默认显示，生产环境默认隐藏
  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const avgFps = metrics.fpsHistory.length > 0
    ? Math.round(metrics.fpsHistory.reduce((a, b) => a + b, 0) / metrics.fpsHistory.length)
    : metrics.fps;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
        metrics.isLowPerformance
          ? 'bg-red-900/80 border-red-700'
          : 'bg-stone-900/80 border-stone-700'
      }`}
      role="complementary"
      aria-label="Performance Monitor"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-stone-400 hover:text-white transition-colors"
        aria-label="Hide performance monitor"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* FPS Display */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`w-2 h-2 rounded-full ${
              metrics.fps >= 50 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-stone-400">FPS</span>
        </div>
        <div className="text-2xl font-bold text-white">
          {metrics.fps}
          <span className="text-sm font-normal text-stone-400 ml-1">/ 60</span>
        </div>
      </div>

      {/* Average FPS */}
      <div className="mb-3">
        <div className="text-xs text-stone-400 mb-1">Average</div>
        <div className="text-lg font-semibold text-white">{avgFps}</div>
      </div>

      {/* Memory Usage */}
      {metrics.memory > 0 && (
        <div className="mb-3">
          <div className="text-xs text-stone-400 mb-1">Memory</div>
          <div className="text-lg font-semibold text-white">{metrics.memory} MB</div>
        </div>
      )}

      {/* FPS Graph */}
      <div className="h-16 flex items-end gap-px">
        {metrics.fpsHistory.map((fps, index) => {
          const height = (fps / 60) * 100;
          const color = fps >= 50 ? 'bg-green-500' : fps >= 30 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div
              key={index}
              className={`flex-1 ${color} rounded-t transition-all duration-150`}
              style={{ height: `${height}%` }}
              aria-label={`FPS at ${index}: ${fps}`}
            />
          );
        })}
      </div>

      {/* Performance Status */}
      <div className="mt-3 pt-3 border-t border-stone-700">
        <div className="text-xs text-stone-400 mb-1">Status</div>
        <div className={`text-sm font-medium ${metrics.isLowPerformance ? 'text-red-400' : 'text-green-400'}`}>
          {metrics.isLowPerformance ? 'Low Performance' : 'Good Performance'}
        </div>
      </div>

      {/* Restore Button (when hidden) */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-stone-900/80 border border-stone-700 text-white hover:bg-stone-800 transition-colors"
          aria-label="Show performance monitor"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * 使用示例:
 *
 * import PerformanceMonitor from './components/PerformanceMonitor';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <PerformanceMonitor />
 *     </>
 *   );
 * }
 */

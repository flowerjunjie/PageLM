/**
 * Request Metrics Tracking
 * Shared metrics store for monitoring API usage
 */

// Simple metrics tracking
export const requestMetrics = {
  requests: 0,
  errors: 0,
  responseTimes: [] as number[],
  startTime: Date.now(),
};

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  requestMetrics.requests = 0;
  requestMetrics.errors = 0;
  requestMetrics.responseTimes = [];
  requestMetrics.startTime = Date.now();
}

/**
 * Get average response time
 */
export function getAverageResponseTime(): number {
  if (requestMetrics.responseTimes.length === 0) return 0;
  return Math.round(
    requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / requestMetrics.responseTimes.length
  );
}

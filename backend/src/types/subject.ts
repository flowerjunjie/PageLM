/**
 * Canonical Subject type for the PageLM backend.
 *
 * Previously this union type was duplicated across three separate modules:
 *   - backend/src/services/analytics.ts   ('history' variant, no 'english')
 *   - backend/src/services/reports.ts     ('history' variant, no 'english')
 *   - backend/src/services/planner/types.ts ('english' variant, no 'history')
 *
 * The merged canonical set below includes all values from every prior definition
 * so that existing data stored under any variant remains valid.  Consumers that
 * only stored a subset will still satisfy `Subject` because the type is a union.
 */
export type Subject =
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'math'
  | 'history'
  | 'english'
  | 'other';

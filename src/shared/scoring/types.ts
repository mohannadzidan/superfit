import { FitScoreResult } from './schema';

export interface ScoredJob extends FitScoreResult {
  jobId: string;
  analyzedAt: string;
}

export type FitScoreLevel = FitScoreResult['level'];  // Re-export for convenience or mapped usage
export type { FitScoreResult }; // Re-export the imported type

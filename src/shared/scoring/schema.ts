import { z } from 'zod';

export const FitScoreLevelSchema = z.enum([
  'NOT_MATCHING',
  'BARELY_MATCHING',
  'LIKELY_MATCHING',
  'SUPER_FIT'
]);

export const FitScoreResultSchema = z.object({
  /** Level of fit */
  level: FitScoreLevelSchema,
  
  /** Short summary or headline (e.g., "Good potential match") */
  headline: z.string(),
  
  /** Explanation of why matches/doesn't match */
  explanation: z.string(),
  
  /** List of matching keywords/skills found */
  matchingSkills: z.array(z.string()).optional(),
  
  /** List of missing keywords/skills */
  missingSkills: z.array(z.string()).optional()
});

export type FitScoreLevel = z.infer<typeof FitScoreLevelSchema>;
export type FitScoreResult = z.infer<typeof FitScoreResultSchema>;

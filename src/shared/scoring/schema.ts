import { match } from "ts-pattern";
import { z } from "zod";

export const FitScoreLevelSchema = z.enum([
  "NOT_MATCHING",
  "BARELY_MATCHING",
  "NEUTRAL_MATCHING",
  "LIKELY_MATCHING",
  "SUPER_FIT",
]);

export const FitScoreResultSchema = z
  .object({
    /** Level of fit */
    level: FitScoreLevelSchema,

    /** Short summary or headline (e.g., "Good potential match") */
    headline: z.string().default("TODO: needs value"),

    /** Explanation of why matches/doesn't match */
    explanation: z.string().default("TODO: needs value"),

    /** List of matching keywords/skills found */
    matchingSkills: z.array(z.string()).optional(),

    /** List of missing keywords/skills */
    missingSkills: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    ...data,
    headline: match(data.level)
      .with("NOT_MATCHING", () => "Not matching")
      .with("BARELY_MATCHING", () => "Barely matching")
      .with("NEUTRAL_MATCHING", () => "Neutral matching")
      .with("LIKELY_MATCHING", () => "Likely matching")
      .with("SUPER_FIT", () => "Super fit")
      .exhaustive(),
  }));

export type FitScoreLevel = z.infer<typeof FitScoreLevelSchema>;
export type FitScoreResult = z.infer<typeof FitScoreResultSchema>;

import { FitScoreResult, FitScoreResultSchema } from "./schema";
import { z } from "zod";

/**
 * Extracts a JSON object from a string that might contain other text.
 * Searches for code blocks ```json ... ``` or the first/last brace.
 */
export function extractJsonFromText(text: string): unknown {
  try {
    // 1. Try parsing the whole text first
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from full text", { error: e });
    // Continue
  }

  // 2. Look for markdown code blocks
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse JSON from code block", { candidate: match[1], error: e }); 
      // Continue
    }
  }

  // 3. Look for first '{' and last '}'
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      console.error("Failed to parse JSON from candidate substring", { candidate, error: e });
      // One last desperate cleanup: sometimes newlines break formatting in simple regex
      // We could try a more lenient json parser or just fail here.
    }
  }

  throw new Error("No valid JSON found in response");
}

export function parseAndValidateScore(text: string): FitScoreResult {
  try {
    const rawObject = extractJsonFromText(text);
    return FitScoreResultSchema.parse(rawObject);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // Safe access via any cast to avoid TS issues with ZodError<unknown>
      const zodError = error as any;
      console.error("Schema validation error", zodError);
      throw new Error(
        `Validation failed: ${zodError.errors.map((e: any) => e.message).join(", ")}`,
      );
    }
    throw error;
  }
}

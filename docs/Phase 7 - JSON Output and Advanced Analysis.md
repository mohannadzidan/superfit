# Phase 7: JSON Output and Advanced Analysis

## Objective

Enhance the job fit analysis system by shifting from simple text matching to structured JSON output, enabling detailed feedback such as missing skills, matching skills, and detailed explanations. Additionally, improve the user experience with robust error handling and advanced configuration options.

## Core Changes

### 1. JSON Output Strategy

To ensure reliable JSON output from various LLMs (especially smaller local models), we introduced a configurable "JSON Strategy" in the AI Model settings.

| Strategy      | Description                                                                                                 | Best For                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Native**    | Uses the model's native JSON mode (e.g., `format: 'json'` in Ollama).                                       | Advanced models (Llama 3, Mistral)               |
| **Extract**   | Asks for JSON in the prompt and extracts it from the text response using regex/parsing.                     | Models without native JSON support               |
| **Two-Stage** | **Stage 1**: "Think" and analyze the fit in detail.<br>**Stage 2**: Transform the analysis into valid JSON. | Logic-heavy tasks where one-shot JSON might fail |

### 2. Advanced Fit Score Schema

The `FitScoreResult` has been expanded to provide granular feedback.

```typescript
// src/shared/scoring/schema.ts
export const FitScoreResultSchema = z.object({
  level: z.enum([
    'NOT_MATCHING',
    'BARELY_MATCHING',
    'NEUTRAL_MATCHING',
    'LIKELY_MATCHING',
    'SUPER_FIT',
  ]),
  headline: z.string(), // e.g. "Good potential match"
  explanation: z.string(), // Detailed reasoning
  matchingSkills: z.array(z.string()).optional(),
  missingSkills: z.array(z.string()).optional(),
})
```

### 3. Updated LLM Prompting

The system prompt now explicitly instructs the model to reason first (chain-of-thought) and then output a JSON object with specific keys (`missingSkills`, `level`, etc.).

**System Prompt Snippet:**

```text
You are a job-resume matching assistant... output ONLY a JSON object with two keys: `missingSkills` and `level`...
Analysis Criteria:
1. Required hard skills/tools
2. Required experience duration
3. Required domain/industry expertise
```

### 4. Background Script Orchestration

The `ANALYZE_JOB_FIT` handler in `src/background/index.ts` now orchestrates the chosen JSON strategy:

1. **Load Config**: Check user's preferred strategy (Native, Extract, Two-Stage).
2. **Execute Strategy**:
   - _Native/Extract_: Single call with specific system prompt.
   - _Two-Stage_:
     - Call 1: Generate analysis text.
     - Call 2: Convert analysis to JSON.
3. **Parse & Validate**: Use `zod` schema to ensure the output matches `FitScoreResultSchema`. Fallback or error if invalid.

### 5. UI Enhancements

#### Resume Editor (`src/options/components/ResumeEditor.tsx`)

- **Split View**: Added a side-by-side Markdown editor and live preview.
- **Styling**: Improved preview styling to mimic a real resume document (Times New Roman, proper headers).
- **Save Feedback**: Added snackbar notifications for successful saves.

#### Score Popup (`src/content/components/ScorePopup.tsx`)

- **Detailed View**: Clicking the popup expands it to show:
  - Full Headline
  - Missing Skills list (critical availability for user improvement)
  - Matching Skills list
- **Dynamic Styling**: Background colors and icons now map to the new 5-level score scale.
- **Shadow DOM**: Fully encapsulated Material UI theme within Shadow DOM to prevent CSS leaks from LinkedIn.

## Technical Improvements

- **Zod Validation**: Strict runtime validation of LLM outputs.
- **TS-Pattern**: Use of `ts-pattern` for cleaner state matching in UI and logic.
- **Error Handling**: Granular error codes (`NO_RESUME`, `LLM_NOT_CONFIGURED`, `ANALYSIS_FAILED`) mapped to user-friendly UI messages.

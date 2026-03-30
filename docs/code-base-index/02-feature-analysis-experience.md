# Feature Deep Dive: In-Page Analysis Experience

## Purpose
This feature group delivers the visible user experience on top of a job page: loading state, streaming AI output, and conversation context for job-fit analysis.

## User perspective
After opening a supported job posting, users see a compact popup anchored on the page. The popup expands to show a live transcript of analysis and token counters while the model is responding.

## Modules involved
- UI orchestration and mounting: **src/content/components/PopupManager.tsx** (defines **PopupManager**).
- Main analysis panel: **src/content/components/ScorePopup.tsx** (defines **ScorePopup**).
- Message rendering components: **src/content/components/MessageCard.tsx** and **src/content/components/ThreadHeader.tsx**.
- Thread transport hook: **src/shared/hooks/useLLMThread.ts**.
- Prompt template source: **src/prompts/matching-level-evaluator.user.md**.
- Theme definition: **src/theme/index.ts**.

## Data and models
- **ThreadState**, **ThreadMessage**, **ThreadPortMessage** from **src/shared/messaging/thread-types.ts** represent message history and stream state.
- Prompt variable payload includes job fields and resume content injected by the LLM layer.
- UI references scoring concepts from **FitScoreResult** types, though current rendering is mainly transcript-oriented.

## Dependencies
- Internal dependencies:
  - Background thread service via Chrome runtime ports.
  - Prompt templates from **src/prompts/**.
- External dependencies:
  - React and Material UI for rendering.
  - Emotion cache for style scoping in Shadow DOM.
  - Chrome extension runtime APIs (`chrome.runtime.connect`).

## Sub-features

### Shadow DOM popup injection
- Purpose: Keep extension UI styling isolated from host-site CSS.
- Modules: **src/content/components/PopupManager.tsx**.
- Models: **PopupManager** class state.
- Dependencies: browser Shadow DOM APIs, Emotion cache container.

### Streaming transcript display
- Purpose: Show real-time model output and prior messages in one thread view.
- Modules: **src/content/components/ScorePopup.tsx**, **src/content/components/MessageCard.tsx**, **src/shared/hooks/useLLMThread.ts**.
- Models: **ThreadMessage**, **ThreadPortMessage**.
- Dependencies: background service stream updates.

### Token telemetry in header
- Purpose: Expose input and output token counts during a thread session.
- Modules: **src/content/components/ThreadHeader.tsx**, **src/shared/hooks/useLLMThread.ts**.
- Models: token counters in **ThreadState**.
- Dependencies: provider stream metadata propagated by background service.

### Threaded messaging and future extensibility
- Purpose: The infrastructure supports continuous conversation blocks (`Prompts`, `Outputs`). While currently oriented to an initial flow trigger, it enables future interactive/chat follow-ups.
- Modules: **src/content/components/MessageCard.tsx**.
- Models: **ThreadMessage**.

## Entry points
- Feature execution begins from **src/content/index.ts** when analysis is initiated.
- UI state synchronization begins in **src/shared/hooks/useLLMThread.ts**, which opens a named runtime port for a thread and subscribes to thread state updates (`STATE_UPDATE`, `STREAM_UPDATE`). When a thread is empty, **ScorePopup** initiates the workflow by dispatching a `SEND_PROMPT`.
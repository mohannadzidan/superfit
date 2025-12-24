# Phase 8: Streaming LLM Support

## Overview

Phase 8 introduces real-time streaming of LLM output to the UI, improving the user experience by showing immediate "Thinking..." feedback during the analysis process. A robust, stateful "Threaded Messaging" architecture was implemented to support this.

## Architecture

### 1. ThreadService (Background)

- **File:** `src/background/services/thread.ts`
- **Purpose:** Manages persistent conversation threads and handles Chrome Port connections.
- **Key Features:**
  - Maintains `threads` map (ID -> State).
  - Handles `startAnalysis` to initiate Job Fit workflows.
  - Broadcasts `STREAM_UPDATE` events as chunks arrive.
  - Broadcasts `FIT_RESULT` when analysis is complete and parsed.
  - Uses `llmService.streamCompletion` to interface with providers.

### 2. LLM Providers

- **Interface:** Added `streamCompletion(request, onChunk)` to `LLMProvider`.
- **Implementations:**
  - **Ollama:** Uses `fetch` with `stream: true` and `TextDecoder` to parse JSON lines.
  - **Gemini:** Uses `@google/genai` SDK's `generateContentStream` (iterating over the result generator).

### 3. Frontend Hooks & UI

- **Hook:** `useLLMThread(threadId)` (`src/shared/hooks/useLLMThread.ts`)
  - Abstraction over `chrome.runtime.connect`.
  - Manages `messages`, `streamingContent`, `status`, `fitResult`.
  - Exposes `startAnalysis(jobInfo)` to trigger workflows.
- **Component:** `ScorePopup.tsx`
  - Refactored to accept `jobId`.
  - Uses `useLLMThread` to drive the UI.
  - Displays "Thinking..." with streaming text during analysis.
  - Displays structured results once `FIT_RESULT` is received.

## Data Flow

1. **Detection:** Content Script detects Job Posting -> specific adapter extracts `JobPostingInfo`.
2. **Initiation:** `JobWatcher` calls `popupManager.startAnalysis(jobInfo)`.
3. **Popup Mount:** `ScorePopup` mounts with `jobId`.
4. **Connection:** `useLLMThread` connects to `thread:{jobId}` port.
5. **Start:** If thread is empty, `ScorePopup` calls `startAnalysis`.
6. **Streaming:** Background script calls LLM, streams chunks to UI via Port. UI updates in real-time.
7. **Completion:** Background script finishes stream, parses JSON (Chain-of-Thought style), sends `FIT_RESULT`.
8. **Result:** UI switches to Result view.

## Verification

- **Manual Test:** Open a Job Posting. Check if "Thinking..." appears and text streams before the final score is shown.
- **Persistence:** Close and reopen the popup (if supported by manager) to see if state is retained (handled by `ThreadService` memory, though PopupManager currently destroys DOM on hide).

## Future Improvements

- **Chat:** The infrastructure supports full chat (user replies). Future phases can enable a "Chat with Resume Assistant" feature.
- **Persistence:** Save threads to `chrome.storage.local` to survive browser restarts.

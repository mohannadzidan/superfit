# Phase 8: Streaming LLM Support

## Overview

Phase 8 introduces real-time streaming of LLM output to the UI, improving the user experience by showing immediate "Thinking..." feedback during the analysis process. A robust, stateful "Threaded Messaging" architecture was implemented to support this.

## Architecture

### 1. ThreadService (Background)

- **File:** `src/background/services/thread.ts`
- **Purpose:** Manages persistent conversation threads and handles Chrome Port connections.
- **Key Features:**
  - Maintains `threads` map (ID -> State).
  - Handles `SEND_PROMPT` to initiate workflows and interactive follow-ups.
  - Broadcasts `STREAM_UPDATE` events as chunks arrive.
  - Broadcasts `STATE_UPDATE` when thread state changes.
  - Uses `llmService.streamCompletion` to interface with providers, merging resume context automatically.

### 2. LLM Providers

- **Interface:** Added `streamCompletion(request, onChunk)` to `LLMProvider`.
- **Implementations:**
  - **Ollama:** Uses `fetch` with `stream: true` and `TextDecoder` to parse JSON lines.
  - **Gemini:** Uses `@google/genai` SDK's `generateContentStream` (iterating over the result generator).

### 3. Frontend Hooks & UI

- **Hook:** `useLLMThread(threadId)` (`src/shared/hooks/useLLMThread.ts`)
  - Abstraction over `chrome.runtime.connect` for thread ports.
  - Manages message history, `streamingContent`, `status`, and model token consumption metrics.
  - Exposes `sendMessage(variables, messages, tools)` to interact with the active thread.
- **Component:** `ScorePopup.tsx`
  - Instantiates initial analysis flow or tooling context based on thread state.
  - Uses `useLLMThread` to drive UI rendering of past messages and current streams.
  - Displays structured conversation blocks (Prompts, Outputs) via `MessageCard.tsx`.

## Data Flow

1. **Detection:** Content Script detects Job Posting -> specific adapter extracts `JobPostingInfo`.
2. **Initiation:** `JobWatcher` calls `popupManager.startAnalysis(jobInfo)`.
3. **Popup Mount:** `ScorePopup` mounts with `jobId`.
4. **Connection:** `useLLMThread` connects to `thread:{jobId}` port and syncs state.
5. **Start:** If thread is empty, `ScorePopup` calls `sendMessage` with the evaluator prompt.
6. **Streaming:** Background script merges system variables (like resume), calls LLM, and streams chunks to UI via Port. UI updates `streamingContent` in real-time.
7. **Completion:** Background script finishes stream, adds full assistant message to state, sends `STREAM_DONE` and updates full thread state.
8. **Result:** UI shows updated conversation transcript.

## Verification

- **Manual Test:** Open a Job Posting. Check if "Thinking..." appears and text streams before the final score is shown.
- **Persistence:** Close and reopen the popup (if supported by manager) to see if state is retained (handled by `ThreadService` memory, though PopupManager currently destroys DOM on hide).

## Future Improvements

- **Chat:** The infrastructure supports full chat (user replies). Future phases can enable a "Chat with Resume Assistant" feature.
- **Persistence:** Save threads to `chrome.storage.local` to survive browser restarts.

# Feature Deep Dive: Background Messaging and Thread Orchestration

## Purpose
This feature group coordinates communication between UI surfaces and the model layer. It exists to preserve conversation state, stream outputs in real time, and provide a stable messaging API for options and content modules.

## User perspective
Users experience a continuous analysis session even if the popup view is minimized or re-opened, and provider/model checks from options return quickly through a simple request/response flow.

## Modules involved
- Background bootstrap and message router: **src/background/index.ts**.
- Thread lifecycle service: **src/background/services/thread.ts** (defines **ThreadService**).
- Message contracts: **src/shared/messaging/types.ts** and **src/shared/messaging/thread-types.ts**.
- Consumer hook on UI side: **src/shared/hooks/useLLMThread.ts**.

## Data and models
- **ThreadState**: per-thread message history, stream status, in-progress content, and token counters. Managed by an internal `threads` map in the `ThreadService`.
- **ThreadMessage**: normalized chat message object with role/content/timestamp.
- **ThreadPortMessage**: port-level event union for state initialization, stream updates, finalization, user prompts (`SEND_PROMPT`), and errors.
- Request/response contracts for options actions in **src/shared/messaging/types.ts**.

## Dependencies
- Internal dependencies:
  - **LLMService** for actual model streaming.
  - `resumeStorage` and `llmStorage` for runtime prerequisites.
  - Score parsing contracts in **src/shared/scoring/** (legacy/non-thread analysis path is present but currently commented out).
- External dependencies:
  - Chrome runtime messaging APIs (`chrome.runtime.onMessage`, `chrome.runtime.onConnect`, ports).

## Sub-features

### One-off background command handling
- Purpose: Support options-page workflows such as provider listing, model retrieval, and connection testing.
- Modules: **src/background/index.ts**, **src/shared/messaging/types.ts**.
- Models: **LLMMessage**, **ListLLMProvidersResponse**, **GetModelsResponse**, **TestConnectionResponse**.
- Dependencies: provider registry and provider implementations.

### Stateful threaded streaming
- Purpose: Keep long-running analysis interactions synchronized across UI and background contexts.
- Modules: **src/background/services/thread.ts**, **src/shared/hooks/useLLMThread.ts**.
- Models: **ThreadState**, **ThreadPortMessage**, **ThreadMessage**.
- Dependencies: runtime ports and LLM streaming callbacks.

### Broadcast-based multi-port updates
- Purpose: Push state/stream updates to all active listeners for a thread ID.
- Modules: **src/background/services/thread.ts**.
- Models: per-thread port sets and state snapshots.
- Dependencies: Chrome port lifecycle (connect/disconnect events).

## Entry points
- Global background messaging starts at **src/background/index.ts** (service worker entry from manifest).
- Thread messaging starts at **ThreadService** initialization in **src/background/services/thread.ts**, imported during background startup.
# Data Model and Persistence

## Storage systems used
- Primary persistence: **Chrome extension local storage** via `chrome.storage.local`.
- Secondary state: in-memory thread state held by the background service worker while active.
- No relational database, ORM schema, SQL migration system, or seed pipeline is present in this codebase.

## Main entities and what they represent

### ResumeData
- Definition: **src/shared/types/resume.ts**.
- Represents the user resume source text and metadata.
- Persisted by: **src/shared/storage/resume.ts**.

### StoredLLMConfig
- Definition: **src/shared/storage/llm.ts**.
- Represents active AI provider selection, selected model, per-provider settings, JSON/output strategy, and update timestamp.
- Persisted by: **src/shared/storage/llm.ts**.

### JobPostingInfo
- Definition: **src/adapters/types.ts**.
- Represents a normalized job posting extracted from a platform page.
- Lifecycle: created by platform adapters and passed into analysis flow; not persisted to durable storage by default.

### ThreadMessage, ThreadState, ThreadPortMessage
- Definition: **src/shared/messaging/thread-types.ts**.
- Represents conversation history and live stream state for analysis threads. The `threads` map structure handles persistent conversational states inside the service worker.
- Lifecycle: managed in memory by **src/background/services/thread.ts**. In the future, this state strategy allows persisting whole chat sessions across browser restarts.

### FitScoreResult and ScoredJob
- Definitions: **src/shared/scoring/schema.ts**, **src/shared/scoring/types.ts**.
- Represents structured fit scoring output and optional job-linked scoring shape.
- Validation/parsing: **src/shared/scoring/parser.ts**.
- Persistence: no dedicated persistent scoring repository currently implemented.

## Key relationships between entities
- A **JobPostingInfo** instance is the core input context for one analysis thread.
- A **ThreadState** contains many **ThreadMessage** records over time.
- A **StoredLLMConfig** points to one active provider and one active model, while still holding config blocks for multiple providers.
- A **ResumeData** value is referenced during prompt rendering by the LLM service and injected as a template variable.
- **FitScoreResult** is intended as normalized structured output for job fit interpretation.

## Model/schema definition locations
- Adapter contracts and job entity: **src/adapters/types.ts**.
- Thread/message contracts: **src/shared/messaging/thread-types.ts** and **src/shared/messaging/types.ts**.
- Score schema and parser: **src/shared/scoring/schema.ts**, **src/shared/scoring/parser.ts**, **src/shared/scoring/types.ts**.
- Resume and LLM persistence contracts: **src/shared/types/resume.ts**, **src/shared/storage/resume.ts**, **src/shared/storage/llm.ts**.

## Migrations and schema management
- Browser-storage data is versioned minimally in **ResumeData.version**.
- No formal migration framework exists for local storage keys/config evolution.
- No seed scripts are present for application runtime data.
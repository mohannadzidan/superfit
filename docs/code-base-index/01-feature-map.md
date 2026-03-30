# Feature Map

## Purpose of this map
This file lists the capabilities SuperFit currently provides, grouped by functional area. Each item names the owning module so a new team member can navigate directly to implementation boundaries.

## A) Job Page Detection and Extraction

### LinkedIn page detection
- What it does: Detects whether the current browser page is a LinkedIn job posting and decides whether analysis should start.
- Ownership: **src/content/index.ts**, **src/adapters/registry.ts**, **src/adapters/types.ts**, **src/adapters/linkedin/index.ts**.

### Structured job information extraction
- What it does: Converts page content into a normalized **JobPostingInfo** object containing title, description, URL, and optional company/location data.
- Ownership: **src/adapters/linkedin/index.ts**, **src/adapters/types.ts**.

## B) In-Page Analysis Experience

### Popup injection and rendering in Shadow DOM
- What it does: Mounts an isolated React UI on top of the job page so host page styles do not break extension UI styling.
- Ownership: **src/content/components/PopupManager.tsx**, **src/content/components/ScorePopup.tsx**, **src/theme/index.ts**.

### Streaming analysis transcript
- What it does: Shows incremental model output while analysis is running and preserves message flow for a thread-based conversation.
- Ownership: **src/content/components/ScorePopup.tsx**, **src/content/components/MessageCard.tsx**, **src/content/components/ThreadHeader.tsx**, **src/shared/hooks/useLLMThread.ts**.

### Token usage visibility
- What it does: Displays prompt/output token counts to help users understand model usage for a thread.
- Ownership: **src/content/components/ThreadHeader.tsx**, **src/shared/messaging/thread-types.ts**, **src/background/services/thread.ts**.

## C) AI Provider and Model Management

### Provider discovery and selection
- What it does: Lists available LLM providers and presents provider-specific configuration fields.
- Ownership: **src/background/index.ts**, **src/llm/registry.ts**, **src/llm/types.ts**, **src/options/pages/AIModel.tsx**.

### Connection testing and model loading
- What it does: Validates provider connectivity and fetches model catalogs from the selected provider.
- Ownership: **src/background/index.ts**, **src/options/components/ProviderConfigForm.tsx**, **src/options/components/ModelSelector.tsx**, **src/llm/providers/ollama.ts**, **src/llm/providers/gemini.ts**.

### LLM streaming execution
- What it does: Sends prompt messages to the active provider/model and streams chunks back to the UI.
- Ownership: **src/llm/service.ts**, **src/llm/types.ts**, **src/llm/providers/**.

## D) User Profile and Configuration

### Resume management
- What it does: Lets users store resume content in Markdown and preview/save it in options.
- Ownership: **src/options/pages/MyInfo.tsx**, **src/options/components/ResumeEditor.tsx**, **src/shared/storage/resume.ts**, **src/shared/types/resume.ts**.

### LLM configuration persistence
- What it does: Stores active provider, model, provider-specific settings, and output strategy for reuse.
- Ownership: **src/options/pages/AIModel.tsx**, **src/shared/storage/llm.ts**.

## E) Background Messaging and Thread Orchestration

### Thread lifecycle management
- What it does: Creates and maintains thread state, message history, stream status, and connected UI ports.
- Ownership: **src/background/services/thread.ts**, **src/shared/messaging/thread-types.ts**.

### Extension message contract handling
- What it does: Handles one-off runtime messages for provider listing, model listing, and connection checks.
- Ownership: **src/background/index.ts**, **src/shared/messaging/types.ts**.

## F) Scoring Data Contracts

### Fit score schema and parsing
- What it does: Defines the normalized scoring shape and validates parsed output into consistent fit levels.
- Ownership: **src/shared/scoring/schema.ts**, **src/shared/scoring/parser.ts**, **src/shared/scoring/types.ts**.

## Deep-dive index
- Job extraction and adapters: `02-feature-platform-adapters.md`
- In-page analysis UI: `02-feature-analysis-experience.md`
- AI provider system and inference: `02-feature-llm-provider-layer.md`
- Options, resume, and settings: `02-feature-options-and-profile.md`
- Threading and message orchestration: `02-feature-background-threading.md`
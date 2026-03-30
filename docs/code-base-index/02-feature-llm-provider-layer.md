# Feature Deep Dive: LLM Provider Layer and Inference

## Purpose
This feature group abstracts multiple AI backends behind one provider interface so the extension can switch between local and cloud model sources without changing calling code.

## User perspective
Users can pick a provider, verify connection, choose a model, and run analysis using that model. The extension streams responses progressively rather than waiting for a single final payload.

## Modules involved
- Provider contracts: **src/llm/types.ts** (defines **LLMProvider**, **LLMModel**, **ProviderConfigSchema**, **CompletionRequest**, **StreamChunk**).
- Provider registry: **src/llm/registry.ts** (defines **ProviderRegistry** and **IProviderRegistry**).
- Inference orchestration: **src/llm/service.ts** (defines **LLMService** and **ILLMService**).
- Concrete providers: **src/llm/providers/ollama.ts** (defines **OllamaProvider**) and **src/llm/providers/gemini.ts** (defines **GeminiProvider**).
- Background message API surface: **src/background/index.ts**.

## Data and models
- **LLMProvider** interface: required capabilities for availability checks, model listing, configuration schema, and streaming completion.
- **StoredLLMConfig** from **src/shared/storage/llm.ts**: persisted active provider, provider config blocks, selected model, and output strategy.
- **CompletionRequest** and **StreamChunk**: input and streamed output contracts for inference calls.

## Dependencies
- Internal dependencies:
  - `llmStorage` configuration for provider/model selection.
  - `resumeStorage` used by **LLMService** to inject resume variables into prompts.
  - Runtime messaging contracts in **src/shared/messaging/types.ts**.
- External dependencies:
  - Ollama HTTP/service endpoint.
  - Google Gemini API through `@google/genai`.
  - Mustache for template variable rendering.
  - LRU cache and hash utilities for request optimization support.

## Sub-features

### Provider registration and lookup
- Purpose: Keep providers discoverable through a central registry.
- Modules: **src/llm/registry.ts**, **src/background/index.ts**, **src/llm/service.ts**.
- Models: **ProviderRegistry**, **LLMProvider**.
- Dependencies: provider implementations loaded at startup.

### Provider-specific connectivity and model catalog
- Purpose: Validate connectivity and fetch available model identifiers.
- Modules: **src/llm/providers/ollama.ts**, **src/llm/providers/gemini.ts**, **src/background/index.ts**.
- Models: **LLMModel**, **ProviderConfigSchema**.
- Dependencies: remote provider APIs.

### Prompt variable rendering and streaming generation
- Purpose: Render prompt templates with runtime variables and stream output chunks.
- Modules: **src/llm/service.ts**.
- Models: **CompletionRequest**, **StreamChunk**.
- Dependencies: Mustache rendering, active provider stream API.

## Entry points
- One-off provider operations start at **src/background/index.ts** via message types like provider listing, connection test, and model retrieval.
- Threaded generation starts from **src/background/services/thread.ts**, which calls **LLMService** streaming with thread messages and variables.
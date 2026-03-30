# External Services and Integrations

## LinkedIn web page integration
- What it is and why used:
  - SuperFit reads job content directly from LinkedIn job pages so users do not need to manually copy job descriptions.
- Integration owner:
  - **src/adapters/linkedin/index.ts**.
- Wrapper interface/class:
  - **PlatformAdapter** interface in **src/adapters/types.ts**.
  - **LinkedInAdapter** class in **src/adapters/linkedin/index.ts**.

## Ollama integration (local model runtime)
- What it is and why used:
  - Ollama enables local inference on user hardware, aligning with privacy-first usage patterns.
- Integration owner:
  - **src/llm/providers/ollama.ts**.
- Wrapper interface/class:
  - **LLMProvider** interface in **src/llm/types.ts**.
  - **OllamaProvider** class in **src/llm/providers/ollama.ts**.

## Gemini integration (cloud model runtime)
- What it is and why used:
  - Gemini provides a hosted AI model option when users prefer or require cloud-based models.
- Integration owner:
  - **src/llm/providers/gemini.ts**.
- Wrapper interface/class:
  - **LLMProvider** interface in **src/llm/types.ts**.
  - **GeminiProvider** class in **src/llm/providers/gemini.ts**.

## Chrome Extension Platform APIs
- What it is and why used:
  - Chrome APIs provide local persistence, background/content communication, and extension lifecycle surfaces required by Manifest V3 apps.
- Integration owner:
  - Storage: **src/shared/storage/resume.ts**, **src/shared/storage/llm.ts**.
  - Runtime messaging: **src/background/index.ts**, **src/background/services/thread.ts**, **src/shared/hooks/useLLMThread.ts**.
  - Options page navigation: **src/content/components/PopupManager.tsx** and score popup actions.
- Wrapper interface/class:
  - Storage wrappers (`resumeStorage`, `llmStorage`) act as integration boundaries.
  - **ThreadService** in **src/background/services/thread.ts** wraps port-based communication.

## Prompt templating and content-conversion libraries
- What it is and why used:
  - Mustache renders prompt variables into prompt templates.
  - Turndown converts extracted HTML descriptions into cleaner text/Markdown before AI processing.
- Integration owner:
  - Mustache usage: **src/llm/service.ts**.
  - Turndown usage: **src/adapters/linkedin/index.ts**.
- Wrapper interface/class:
  - LLM prompt handling through **LLMService**.
  - Platform extraction via **LinkedInAdapter**.
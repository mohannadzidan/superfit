## Project Overview

SuperFit is a privacy-first Chrome Manifest V3 extension that analyzes job postings against a user's resume using local or cloud LLMs. It extracts structured job data from job boards (currently LinkedIn), runs semantic gap analysis via an agentic LLM pipeline, and displays results in the page via a Shadow DOM-isolated React UI.

## Commands

```bash
pnpm dev        # Development server with HMR (Vite watch mode)
pnpm build      # tsc + Vite → outputs to build/
pnpm fmt        # Prettier formatting (TS, JSON, CSS, MD)
pnpm zip        # build + compress for distribution
```

Load the extension in Chrome from `build/` (or `dist/` in dev mode) using "Load unpacked".

## Architecture

The extension has three main execution contexts that communicate via Chrome messaging:

### Background Service Worker (`src/background/index.ts`)

- Initializes provider/agent registries and LLMService on startup
- Handles one-off messages (LIST_LLM_PROVIDERS, TEST_LLM_CONNECTION, GET_LLM_MODELS, CAPTURE_JOB, PROXY_FETCH)
- Manages persistent Port connections for streaming LLM responses via `ThreadService`
- Routes all external HTTP through here to bypass CSP restrictions in content scripts

### Content Script (`src/content/index.ts`)

- Mounts React UI into a **Shadow DOM** container to avoid CSS conflicts with host pages

### Options Page (`src/options/index.tsx`)

- React + MUI UI for resume input, LLM provider selection, API key entry, model selection

### Platform Adapters (`src/adapters/`)

Implement `PlatformAdapter` interface to extract `JobPostingInfo` from a job board's DOM. Currently only `LinkedInAdapter`. To add a new adapter: implement the interface in `src/adapters/<name>/`, register it in `AdapterRegistry` in `src/content/index.ts`.

## Key Patterns

- **Storage**: `chrome.storage.local` via typed helpers in `src/shared/storage/` (llm config, captured job, resume)
- **Messaging types**: All message shapes defined in `src/shared/messaging/types.ts` (one-off)
- **Templates**: System prompts use Mustache templating (`src/llm/agents/job-fit/prompts.ts`) to inject resume/job context
- **TypeScript**: Strict mode, `esModuleInterop: false` — use `import type` for type-only imports

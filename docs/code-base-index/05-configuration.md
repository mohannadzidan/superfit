# Configuration and Environment

## Environment variables and runtime controls

### Build/runtime mode
- Variable: `NODE_ENV`.
- Where used: **src/manifest.ts**.
- What it controls:
  - Appends a development suffix to extension name when running in development mode.

### Provider credentials and endpoints (user-managed settings)
These are not process environment variables in this codebase; they are runtime settings stored in extension local storage.

- Ollama server URL:
  - Controlled by provider config schema in **src/llm/providers/ollama.ts**.
  - Persisted in **src/shared/storage/llm.ts**.
- Gemini API key:
  - Controlled by provider config schema in **src/llm/providers/gemini.ts**.
  - Persisted in **src/shared/storage/llm.ts**.

### Model strategy toggle
- Setting: `jsonStrategy` (`native`, `extract`, `two-stage`).
- Where defined/persisted: **src/shared/storage/llm.ts**.
- Where selected: **src/options/pages/AIModel.tsx**.
- What it controls:
  - Chosen output strategy for structured model responses. Note: The codebase includes the Chain-of-Thought processing intent (like the "two-stage" think-then-transform approach), which can be selected to ensure reliable extraction.

## Configuration files and what they govern
- **package.json**:
  - Project metadata, scripts (`dev`, `build`, `preview`, `zip`), dependencies.
- **vite.config.ts**:
  - Build output directory (`build`), CRX plugin integration, React plugin, chunk naming.
- **src/manifest.ts**:
  - Manifest V3 definition (background worker, content scripts, options page, storage permission).
- **tsconfig.json** and **tsconfig.node.json**:
  - TypeScript compiler settings for app and node-side tooling contexts.
- **pnpm-workspace.yaml** and **pnpm-lock.yaml**:
  - Package-manager workspace scope and lockfile state.
- HTML entry shells (`options.html`, `popup.html`, `newtab.html`, `sidepanel.html`, `devtools.html`):
  - Extension page bootstrap documents; only options currently maps to a present source entry file.

## Feature flags and toggles
- Build flag behavior:
  - Development naming toggle in **src/manifest.ts** based on `NODE_ENV`.
- User-level runtime toggles:
  - Selected provider/model and strategy in **StoredLLMConfig** via **src/shared/storage/llm.ts**.
- There is no centralized feature-flag service file in the current codebase.

## Notes and observed constraints
- Manifest permissions are intentionally narrow (`storage` only) in **src/manifest.ts**.
- Content scripts are configured with broad URL matches in **src/manifest.ts**, while platform matching is narrowed by adapter logic in **src/adapters/**.
- README operational guidance mentions Ollama CORS setup for local development/runtime compatibility.
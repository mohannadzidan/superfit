# Feature Deep Dive: Options, Resume, and User Configuration

## Purpose

This feature group gives users a settings workspace for managing their resume and AI model configuration. It exists so analysis behavior can be customized once and reused automatically during browsing.

## User perspective

Users open the extension options page and switch between two sections: personal information (resume) and AI model setup. They can edit resume content, configure provider credentials/endpoints, test connectivity, select a model, and save settings.

## Modules involved

- Options entry and shell: **src/options/index.tsx**, **src/options/Options.tsx**.
- Resume page: **src/options/pages/MyInfo.tsx** and **src/options/components/ResumeEditor.tsx**.
- AI model page: **src/options/pages/AIModel.tsx**.
- Config UI components: **src/options/components/ProviderSelector.tsx**, **src/options/components/ProviderConfigForm.tsx**, **src/options/components/ModelSelector.tsx**.
- Persistence services: **src/shared/storage/resume.ts**, **src/shared/storage/llm.ts**.

## Data and models

- **ResumeData** in **src/shared/types/resume.ts**: Markdown content, modification timestamp, and version.
- **StoredLLMConfig** in **src/shared/storage/llm.ts**: active provider/model and per-provider config blocks.
- Provider schemas and models from **src/llm/types.ts** power dynamic forms and model dropdowns.

## Dependencies

- Internal dependencies:
  - Background message API for provider discovery, connection testing, and model listing.
  - Shared storage services for durable settings.
- External dependencies:
  - React and MUI component system.
  - Chrome local storage API.

## Sub-features

### Resume editing and preview

- Purpose: Store and maintain resume content used by prompts.
- Modules: **src/options/pages/MyInfo.tsx**, **src/options/components/ResumeEditor.tsx**, **src/shared/storage/resume.ts**.
- Models: **ResumeData**.
- Dependencies: `react-markdown` for preview rendering.

### Provider and model setup

- Purpose: Configure the selected AI backend and model.
- Modules: **src/options/pages/AIModel.tsx**, **src/options/components/ProviderSelector.tsx**, **src/options/components/ProviderConfigForm.tsx**, **src/options/components/ModelSelector.tsx**.
- Models: **ProviderConfigSchema**, **LLMModel**, **StoredLLMConfig**.
- Dependencies: background message handlers, provider APIs.

### Output strategy selection

- Purpose: Persist preferred JSON/output handling mode.
- Modules: **src/options/pages/AIModel.tsx**, **src/shared/storage/llm.ts**.
- Models: `jsonStrategy` values (`native`, `extract`, `two-stage`).
- Dependencies: consumed by LLM-related runtime logic where applicable.

## Entry points

- Extension options execution begins in **options.html**, which loads **src/options/index.tsx**.
- Data operations originate from Options components and route through storage modules and background runtime messages.

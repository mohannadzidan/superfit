# SuperFit Codebase Overview

## What this application is

SuperFit is a browser extension that helps job seekers quickly judge how well a job posting matches their resume. It runs on job pages, extracts the listing content, and sends that information to a configured AI model so users can get a practical fit assessment without leaving the page.

## Problem and audience

The product is built for people applying to jobs, especially users who want fast feedback about whether to apply or upskill first. A secondary audience is teams who care about privacy-first workflows, because resume content and job text can be processed through local model providers. It acts as an automated screener assessing explicit requirements, implicit context, and candidate proficiency from the in-browser context.

## High-level architecture

- Architecture style: browser extension application (Chrome Manifest V3) with a strong local-first orientation, avoiding remote endpoints for PII. It separates the problem across Content Script (DOM, extraction, UI), Background Script (orchestration, long-running streaming, LLM APIs), and Options Page (configuration).
- Runtime: **Node.js** for build tooling, and browser extension runtime for execution.
- Main runtime surfaces:
  - Background service worker in **src/background/index.ts**.
  - Content script in **src/content/index.ts**.
  - Options application in **src/options/index.tsx**.
- Data persistence: browser local storage via Chrome extension APIs.

## Top-level directory map

- **src/**: main application source (adapters, background worker, content UI, LLM layer, options UI, shared contracts/storage, prompts, theme).
- **public/**: static assets such as extension icons and brand images.
- **build/**: generated build output from Vite/CRXJS.
- **docs/**: project phase documents and planning notes.
- Root HTML entry files (`options.html`, `popup.html`, `newtab.html`, `sidepanel.html`, `devtools.html`): extension page entry shells; only `options.html` maps to a currently present TypeScript entry.
- Root configs (`package.json`, `vite.config.ts`, `tsconfig*.json`, `pnpm-workspace.yaml`): package/dependency, build, and compiler configuration.

## Tech stack summary

- Languages: TypeScript, Markdown, HTML.
- UI: React 18 and Material UI (MUI) with Emotion.
- Build tooling: Vite + `@crxjs/vite-plugin` for Chrome extension packaging.
- AI providers: Ollama via `ollama` SDK and Gemini via `@google/genai`.
- Validation and parsing: Zod and `ts-pattern`.
- Prompt templating/conversion: Mustache and Turndown.
- Storage: Chrome extension local storage (`chrome.storage.local`).

## Build, run, and deploy model

- Development and build are managed through npm scripts in `package.json` (`dev`, `build`, `preview`).
- The Vite build outputs to the **build/** directory.
- Packaging for distribution is handled by **src/zip.js** (zips built artifacts using manifest metadata).
- Deployment target is a packaged browser extension loaded into Chrome.

## Documentation index

This documentation set is organized as a landscape map for onboarding. [docs/code-base-index/01-feature-map.md](docs/code-base-index/01-feature-map.md) lists user-facing and system-facing capabilities and points to ownership folders. The `02-feature-*.md` files explain each major feature area in plain language, including modules, entities, dependencies, and entry points. [docs/code-base-index/03-data-model.md](docs/code-base-index/03-data-model.md) focuses on core data structures and persistence patterns. [docs/code-base-index/04-integrations.md](docs/code-base-index/04-integrations.md) covers external systems (job platform DOM, Ollama, Gemini, Chrome APIs). [docs/code-base-index/05-configuration.md](docs/code-base-index/05-configuration.md) explains configuration files, runtime controls, and environment-sensitive behavior. [docs/code-base-index/06-messaging.md](docs/code-base-index/06-messaging.md) maps the intra-extension communication, including UI-to-background threads and payload definitions.

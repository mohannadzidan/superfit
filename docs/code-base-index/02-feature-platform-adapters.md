# Feature Deep Dive: Platform Adapters and Job Extraction

## Purpose

This feature group identifies supported job platforms and converts raw page content into a consistent internal job-posting format. It exists so all downstream analysis can operate on one normalized structure instead of platform-specific HTML.

## User perspective

When a user opens a supported job page, SuperFit automatically detects the page and prepares analysis without requiring manual copy/paste of the job description.

## Modules involved

- Core adapter contracts: **src/adapters/types.ts** (defines **PlatformAdapter** and **JobPostingInfo**).
- Adapter lookup and registration: **src/adapters/registry.ts** (defines **AdapterRegistry**).
- LinkedIn implementation: **src/adapters/linkedin/index.ts** (defines **LinkedInAdapter**).
- Runtime wiring: **src/content/index.ts** registers adapters and invokes extraction.

## Data and models

- Primary entity: **JobPostingInfo**.
  - Represents extracted job metadata and description.
  - Fields include `id`, `jobUrl`, `jobTitle`, `jobDescription`, optional company/location.
- Primary interface: **PlatformAdapter**.
  - Represents a platform-specific strategy that can detect compatibility and extract structured data.

## Dependencies

- Internal dependencies:
  - **AdapterRegistry** for selecting one adapter for a URL.
  - Content orchestration in **src/content/index.ts** to trigger UI workflow.
- External dependencies:
  - Browser DOM APIs for page inspection.
  - `turndown` library to convert HTML job descriptions into Markdown-friendly text.

## Sub-features

### URL-platform matching

- Purpose: Select the adapter that understands the current URL structure.
- Modules: **src/adapters/registry.ts**, **src/content/index.ts**.
- Models: **PlatformAdapter**.
- Dependencies: browser `window.location`.

### Job page qualification

- Purpose: Confirm a matched domain is actually a job posting page.
- Modules: **src/adapters/linkedin/index.ts**.
- Models: **PlatformAdapter**.
- Dependencies: DOM selectors specific to LinkedIn page layouts.

### Job metadata and description extraction

- Purpose: Produce a normalized **JobPostingInfo** used by analysis and UI layers.
- Modules: **src/adapters/linkedin/index.ts**, **src/adapters/types.ts**.
- Models: **JobPostingInfo**.
- Dependencies: DOM APIs and `turndown` conversion.

## Entry points

- Primary execution starts in **src/content/index.ts** (content script entry), which instantiates page watching, asks **AdapterRegistry** for a matching adapter, and calls into **LinkedInAdapter** when appropriate.

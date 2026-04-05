---
name: create-platform-adapter
description: Guides creation of a new PlatformAdapter for SuperFit. Use when the user wants to add support for a new job board (e.g., Indeed, Glassdoor, Greenhouse, Workday). Handles scaffolding the adapter class, extracting job info from DOM, and registering in the AdapterRegistry.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
disable-model-invocation: true
---

# SuperFit: Create a Platform Adapter

## Overview

A `PlatformAdapter` teaches SuperFit how to extract job postings from a specific job board's DOM. Each adapter:
1. Detects whether the current URL/page belongs to its platform
2. Extracts structured `JobPostingInfo` from the DOM
3. Optionally locates the apply button and job description container

## Interface Contract (`src/adapters/types.ts`)

```ts
export interface JobPostingInfo {
  id: string;           // Unique job ID (from URL or DOM)
  jobUrl: string;       // window.location.href
  jobTitle: string;
  jobDescription: string; // Markdown-converted description
  companyName?: string;
  location?: string;
  platform: string;     // Must match adapter.name
}

export interface PlatformAdapter {
  readonly name: string;        // Unique lowercase identifier, e.g. 'indeed'
  readonly icon?: string;       // SVG string (white fill, for dark backgrounds)

  matches(url: string): boolean;
  isJobPostingPage(): boolean;
  extractJobInfo(): JobPostingInfo | null;

  getApplyButton?(): HTMLElement | null;
  getJobDescriptionContainer?(): HTMLElement | null;
  addBadge?(postId: string, badge: { text: string }): void;
}
```

## Step-by-Step Instructions

### Step 1 — Inspect the target job board

Before writing any code, ask the user to open a sample job posting page and share:
- The URL pattern for job postings (e.g. `indeed.com/viewjob?jk=...`)
- The CSS selectors or DOM structure for: job title, company name, description container, location, and apply button
- How the job ID can be derived (URL param, path segment, or DOM attribute)

If the user hasn't provided this, ask: *"Can you share a sample job posting URL and the relevant DOM selectors or HTML structure?"*

### Step 2 — Create the adapter file

Create the file at `src/adapters/<platform-name>/index.ts`.

Use this template — replace all `<PLACEHOLDERS>`:

```ts
import { PlatformAdapter, JobPostingInfo } from '../types';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

function htmlToMarkdown(html: string): string {
  return turndownService
    .turndown(html)
    .replace(/\*\*\s*(.+?)\s*\*\*/g, '**$1**')
    .replace(/[\t ]*(\n)[\t ]+$/gm, '\n')
    .replace(/\n\s*\n+\s*/g, '\n\n')
    .replace(/\* {2,}/g, '* ');
}

const ICON_SVG = /* svg */`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <!-- paste platform SVG path here -->
</svg>`;

export class <ClassName>Adapter implements PlatformAdapter {
  readonly name = '<platform-name>';   // e.g. 'indeed'
  readonly icon = ICON_SVG;

  matches(url: string): boolean {
    return url.includes('<domain>');   // e.g. 'indeed.com'
  }

  isJobPostingPage(): boolean {
    const isJobUrl = window.location.pathname.match(/<url-pattern>/) !== null;
    return isJobUrl;
  }

  extractJobInfo(): JobPostingInfo | null {
    try {
      const titleElement = document.querySelector('<title-selector>');
      const jobTitle = titleElement?.textContent?.trim() ?? '';

      const companyElement = document.querySelector('<company-selector>');
      const companyName = companyElement?.textContent?.trim() ?? '';

      const descriptionElement = document.querySelector('<description-selector>');
      const jobDescription = htmlToMarkdown(descriptionElement?.innerHTML ?? '');

      const locationElement = document.querySelector('<location-selector>');
      const location = locationElement?.textContent?.trim() ?? '';

      if (!jobTitle || !jobDescription) {
        console.warn('SuperFit: Failed to extract essential job info (Title or Description missing)');
        return null;
      }

      const id = this.extractJobId() ?? 'unknown';

      return {
        id,
        jobUrl: window.location.href,
        jobTitle,
        jobDescription,
        companyName,
        location,
        platform: this.name,
      };
    } catch (error) {
      console.error('SuperFit: Error extracting job info', error);
      return null;
    }
  }

  getApplyButton(): HTMLElement | null {
    return document.querySelector<HTMLElement>('<apply-button-selector>');
  }

  getJobDescriptionContainer(): HTMLElement | null {
    return document.querySelector<HTMLElement>('<description-selector>');
  }

  private extractJobId(): string | null {
    // Option A: URL query param
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('<param-name>');
    if (id) return id;

    // Option B: path segment
    const match = window.location.pathname.match(/<path-regex>/);
    if (match?.[1]) return match[1];

    return null;
  }
}
```

### Step 3 — Register the adapter

Open `src/adapters/registry.ts` and add two lines:

```ts
// At the top — add import:
import { <ClassName>Adapter } from './<platform-name>';

// At the bottom — register:
adapterRegistry.register(new <ClassName>Adapter());
```

The registry uses a simple array and deduplicates by `name`. Order matters: the first matching adapter wins, so register more specific platforms before generic ones.

### Step 4 — Verify

Run `pnpm build` and check for TypeScript errors. Then load the extension in Chrome, navigate to a job posting on the target site, open the extension popup, and verify the job is captured correctly.

```bash
pnpm build
```

## Key Patterns from Existing Adapters

### htmlToMarkdown
Both `LinkedInAdapter` and `TokyoDevAdapter` use the same `htmlToMarkdown` helper. Always convert HTML description containers to Markdown — raw HTML confuses LLMs. The regex chain cleans up bold markers, trailing whitespace, consecutive newlines, and list bullets.

### extractJobId
Try URL query params first (e.g. `?currentJobId=123`), then regex on pathname (e.g. `/view/(\d+)`). Fall back to `'unknown'` — never return an empty string as an ID.

### isJobPostingPage
Should be fast (no network calls). Check URL pattern first; optionally also check for the presence of key DOM elements for sites with dynamic routing.

### Icon
Use a white-fill SVG (the bubble renders on a dark background). Inline it as a template literal string assigned to `readonly icon`.

## Files to Touch

| File | Change |
|---|---|
| `src/adapters/<name>/index.ts` | Create — new adapter class |
| `src/adapters/registry.ts` | Add import + `adapterRegistry.register(...)` |

That's it — no changes needed to content scripts, background, or options.

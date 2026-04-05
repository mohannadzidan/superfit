## Objective

Implement the Adapter pattern for robust, extensible detection and extraction of job posting content. For MVP, only LinkedIn is supported, but the architecture enables easy addition of future platforms.

## Architecture Overview

```mermaid
classDiagram
    class PlatformAdapter {
        <<interface>>
        +name: string
        +matches(url: string): boolean
        +isJobPostingPage(): boolean
        +extractJobInfo(): JobPostingInfo | null
    }

    class LinkedInAdapter {
        +name: "linkedin"
        +matches(url: string): boolean
        +isJobPostingPage(): boolean
        +extractJobInfo(): JobPostingInfo | null
    }

    class AdapterRegistry {
        -adapters: PlatformAdapter[]
        +register(adapter: PlatformAdapter): void
        +getAdapter(url: string): PlatformAdapter | null
        +getAllAdapters(): PlatformAdapter[]
    }

    PlatformAdapter <|.. LinkedInAdapter
    AdapterRegistry o-- PlatformAdapter
```

## Interface Specifications

### JobPostingInfo

```typescript
interface JobPostingInfo {
  /** Unique identifier for the job posting */
  id: string
  /** Full URL of the job posting */
  jobUrl: string
  /** Job title */
  jobTitle: string
  /** Full job description text */
  jobDescription: string
  /** Company name (optional for MVP) */
  companyName?: string
}
```

### PlatformAdapter Interface

```typescript
interface PlatformAdapter {
  /** Unique name identifier for the platform */
  readonly name: string

  /**
   * Check if this adapter can handle the given URL
   * @param url - Current page URL
   * @returns true if this adapter should be used
   */
  matches(url: string): boolean

  /**
   * Check if current page is a job posting page
   * Assumes matches() has already returned true
   * @returns true if page contains a job posting
   */
  isJobPostingPage(): boolean

  /**
   * Extract job information from the current page
   * Assumes isJobPostingPage() has returned true
   * @returns JobPostingInfo or null if extraction fails
   */
  extractJobInfo(): JobPostingInfo | null
}
```

### AdapterRegistry Interface

```typescript
interface IAdapterRegistry {
  /**
   * Register a new platform adapter
   */
  register(adapter: PlatformAdapter): void

  /**
   * Get the appropriate adapter for a given URL
   * @returns The matching adapter or null
   */
  getAdapter(url: string): PlatformAdapter | null

  /**
   * Get all registered adapters
   */
  getAllAdapters(): PlatformAdapter[]
}
```

### SPA Navigation Handling

```mermaid
sequenceDiagram
    participant User
    participant LinkedIn
    participant ContentScript
    participant Adapter

    User->>LinkedIn: Navigate to job listing
    LinkedIn->>ContentScript: URL Change Event
    ContentScript->>Adapter: matches(newUrl)
    Adapter-->>ContentScript: true
    ContentScript->>Adapter: isJobPostingPage()

    alt Job posting detected
        Adapter-->>ContentScript: true
        ContentScript->>Adapter: extractJobInfo()
        Adapter-->>ContentScript: JobPostingInfo
        ContentScript->>ContentScript:  Trigger analysis flow
    else Not a job posting
        Adapter-->>ContentScript: false
        ContentScript->>ContentScript: Hide popup if visible
    end
```

### Navigation Detection Strategy

Implementation should use:

1. popstate event for browser back/forward
2. MutationObserver or polling for SPA navigation
3. Debouncing to prevent excessive callbacks

## Content Script Integration

```mermaid
flowchart TB
    Start[Content Script Loads] --> Init[Initialize AdapterRegistry]
    Init --> Register[Register LinkedIn Adapter]
    Register --> Monitor[Start URL Monitor]

    Monitor --> URLChange{URL Changed?}
    URLChange -->|Yes| GetAdapter[Get Matching Adapter]
    URLChange -->|No| Monitor

    GetAdapter --> HasAdapter{Adapter Found?}
    HasAdapter -->|No| HideUI[Hide Popup UI]
    HasAdapter -->|Yes| CheckPage[isJobPostingPage? ]

    CheckPage -->|No| HideUI
    CheckPage -->|Yes| Extract[extractJobInfo]

    Extract --> HasInfo{Info Extracted?}
    HasInfo -->|No| ShowError[Show Error State]
    HasInfo -->|Yes| SendToBG[Send to Background]

    HideUI --> Monitor
    ShowError --> Monitor
    SendToBG --> WaitResponse[Wait for Score]
    WaitResponse --> ShowPopup[Display Score Popup]
    ShowPopup --> Monitor
```

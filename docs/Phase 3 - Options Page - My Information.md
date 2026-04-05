## Objective

Build the Options page section for managing user information. For the MVP, this consists solely of resume input in Markdown format with live preview.

## Options Page Structure

```mermaid
flowchart LR
    subgraph OptionsPage["Options Page"]
        subgraph SideNav["Side Navigation"]
            MI[My Information]
            AI[AI Model]
        end

        subgraph MainContent["Main Content Area"]
            subgraph MyInfoSection["My Information Section"]
                TabNav[Tab Navigation]
                ResumeTab[Resume Tab]
            end
        end
    end

    SideNav --> MainContent
    MI --> MyInfoSection
    TabNav --> ResumeTab
```

## Navigation Architecture

### Side Navigation

| Menu Item      | Path                      | Description                |
| -------------- | ------------------------- | -------------------------- |
| My Information | `/info/resume` \| `/info` | User resume                |
| AI Model       | `/ai-model`               | LLM provider configuration |

### Tab Navigation (under My Information)

| Tab    | Description                       |
| ------ | --------------------------------- |
| Resume | Markdown editor with live preview |

> Note: Additional tabs (e.g., Questions/Answers) are deferred to post-MVP.

## UI Specifications

### Resume Tab Layout

```mermaid
flowchart TB
    subgraph ResumeTab["Resume Tab"]
        subgraph EditorPanel["Editor Panel (50%)"]
            Toolbar[Formatting Toolbar]
            TextArea[Markdown TextArea]
            CharCount[Character Counter]
        end

        subgraph PreviewPanel["Preview Panel (50%)"]
            Preview[Rendered Markdown]
        end

        ActionBar[Save / Reset Actions]
    end

    EditorPanel --> ActionBar
    PreviewPanel --> ActionBar
```

### Component Specifications

#### MarkdownEditor Component

```typescript
interface MarkdownEditorProps {
  /** Current markdown content */
  value: string

  /** Callback when content changes */
  onChange: (value: string) => void

  /** Maximum character limit */
  maxLength?: number

  /** Placeholder text */
  placeholder?: string

  /** Read-only mode */
  disabled?: boolean
}
```

#### MarkdownPreview Component

```typescript
interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string

  /** Custom CSS class */
  className?: string
}
```

### UI Behavior

| Interaction           | Behavior                                   |
| --------------------- | ------------------------------------------ |
| Text input            | Immediate update to preview (debounced)    |
| Save button           | Persist to Chrome Storage                  |
| Reset button          | Reload from last saved state               |
| Page leave w/ unsaved | Show confirmation dialog                   |
| Character limit       | Show warning at 90%, prevent input at 100% |

## Storage Specification

### ResumeData Interface

```typescript
// src/shared/types/resume.ts

export interface ResumeData {
  /** Markdown content of the resume */
  markdownContent: string

  /** ISO timestamp of last modification */
  lastModified: string

  /** Data version for future migrations */
  version: number
}
```

### Storage Keys

| Key           | Type       | Description               |
| ------------- | ---------- | ------------------------- |
| `resume_data` | ResumeData | User's resume information |

### Storage Service Interface

```typescript
// src/shared/storage/resume.ts

export interface IResumeStorage {
  /**
   * Get stored resume data
   * @returns ResumeData or null if not set
   */
  getResume(): Promise<ResumeData | null>

  /**
   * Save resume data
   * @param content - Markdown content to save
   */
  saveResume(content: string): Promise<void>

  /**
   * Clear stored resume
   */
  clearResume(): Promise<void>

  /**
   * Check if resume exists
   */
  hasResume(): Promise<boolean>
}
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Resume Editor
    participant State as React State
    participant Storage as Chrome Storage

    User->>UI: Types in editor
    UI->>State: Update local state
    State->>UI: Re-render preview

    User->>UI:  Clicks Save
    UI->>Storage: saveResume(content)
    Storage-->>UI: Success
    UI->>User: Show save confirmation

    Note over UI,Storage: On page load
    UI->>Storage: getResume()
    Storage-->>UI:  ResumeData
    UI->>State: Initialize with data
```

## Validation Rules

| Rule           | Constraint        |
| -------------- | ----------------- |
| Maximum length | 50,000 characters |
| Minimum length | 0 (empty allowed) |
| Content type   | Valid UTF-8 text  |

# Phase 5: Options Page – AI Model Configuration

## Objective

Provide a user interface for configuring the LLM provider and model selection.  For MVP, only Ollama is supported, but the UI architecture accommodates future providers. 

## Navigation Context

```mermaid
flowchart LR
    subgraph SideNav["Side Navigation"]
        MI[My Information]
        AI[AI Model ●]
    end
    
    subgraph MainContent["AI Model Section"]
        ProviderConfig[Provider Configuration]
        ModelSelect[Model Selection]
        ConnTest[Connection Status]
    end
    
    AI --> MainContent
```

## UI Layout

```mermaid
flowchart TB
    subgraph AIModelSection["AI Model Configuration"]
        subgraph ProviderArea["Provider Selection"]
            ProviderCard[Ollama Provider Card]
            ProviderStatus[Connection Status]
        end
        
        subgraph ConfigArea["Provider Configuration"]
            URLInput[Server URL Input]
            TestButton[Test Connection Button]
        end
        
        subgraph ModelArea["Model Selection"]
            ModelDropdown[Model Dropdown]
            ModelInfo[Model Information]
            RefreshButton[Refresh Models Button]
        end
        
        SaveButton[Save Configuration]
    end
    
    ProviderArea --> ConfigArea
    ConfigArea --> ModelArea
    ModelArea --> SaveButton
```

## Component Specifications

### ProviderSelector Component

```typescript
interface ProviderSelectorProps {
  /** List of available providers */
  providers: ProviderInfo[];
  
  /** Currently selected provider ID */
  selectedProviderId: string | null;
  
  /** Callback when provider is selected */
  onSelect: (providerId:  string) => void;
}

interface ProviderInfo {
  providerId: string;
  providerName:  string;
  description: string;
  isAvailable:  boolean;
  status: 'connected' | 'disconnected' | 'checking';
}
```

### ProviderConfigForm Component

```typescript
interface ProviderConfigFormProps {
  /** Configuration schema from provider */
  schema: ProviderConfigSchema;
  
  /** Current configuration values */
  values: Record<string, unknown>;
  
  /** Callback when values change */
  onChange: (values: Record<string, unknown>) => void;
  
  /** Callback to test connection */
  onTestConnection: () => Promise<boolean>;
  
  /** Current connection status */
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}
```

### ModelSelector Component

```typescript
interface ModelSelectorProps {
  /** Available models from provider */
  models: LLMModel[];
  
  /** Currently selected model ID */
  selectedModelId: string | null;
  
  /** Callback when model is selected */
  onSelect: (modelId: string) => void;
  
  /** Callback to refresh model list */
  onRefresh: () => Promise<void>;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Whether provider is connected */
  isProviderConnected: boolean;
}
```

## UI States

### Provider Card States

| State        | Visual Indicator                          |
|--------------|-------------------------------------------|
| Available    | Green checkmark, "Connected" label        |
| Unavailable  | Red X, "Not Connected" label              |
| Checking     | Spinner, "Checking..." label              |

### Model Dropdown States

| State              | Behavior                                |
|--------------------|-----------------------------------------|
| Provider connected | Shows model list, enabled               |
| Provider disconnected | Disabled, shows "Connect provider first" |
| Loading models     | Shows spinner                           |
| No models          | Shows "No models found"                 |

## Ollama-Specific UI

### Configuration Fields

| Field       | Type  | Default                    | Required |
|-------------|-------|----------------------------|----------|
| Server URL  | URL   | `http://localhost:11434`   | Yes      |

### Test Connection Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Config Form
    participant BG as Background Script
    participant Ollama as Ollama Server

    User->>UI: Click "Test Connection"
    UI->>UI: Show "Checking..." state
    UI->>BG: testConnection(serverUrl)
    BG->>Ollama: GET /api/tags
    
    alt Connection successful
        Ollama-->>BG: 200 OK
        BG-->>UI: { success: true, models: [... ] }
        UI->>UI:  Show "Connected" ✓
        UI->>UI:  Populate model dropdown
    else Connection failed
        Ollama-->>BG:  Error/Timeout
        BG-->>UI:  { success: false, error: "..." }
        UI->>UI: Show "Failed" ✗
        UI->>User: Display error message
    end
```

## Data Flow

```mermaid
flowchart TB
    subgraph OptionsPage["Options Page"]
        UI[AI Model UI]
        LocalState[React State]
    end
    
    subgraph Background["Background Script"]
        LLMService[LLM Service]
        Registry[Provider Registry]
    end
    
    subgraph Storage["Chrome Storage"]
        Config[llm_config]
    end
    
    UI -->|User input| LocalState
    LocalState -->|Save| Storage
    LocalState -->|Test/Refresh| Background
    Background -->|Query| Ollama[(Ollama)]
    Background -->|Results| LocalState
    
    UI -->|Load on mount| Storage
    Storage -->|Initial values| LocalState
```

## Message API

### Messages from Options Page to Background

```typescript
// Test provider connection
interface TestConnectionMessage {
  type: 'TEST_LLM_CONNECTION';
  payload: {
    providerId: string;
    config: Record<string, unknown>;
  };
}

interface TestConnectionResponse {
  success: boolean;
  error?: string;
}

// Get available models
interface GetModelsMessage {
  type: 'GET_LLM_MODELS';
  payload:  {
    providerId: string;
  };
}

interface GetModelsResponse {
  success: boolean;
  models?:  LLMModel[];
  error?: string;
}
```

## Validation Rules

| Field       | Validation                                   |
|-------------|----------------------------------------------|
| Server URL  | Must be valid URL, must start with http(s):// |
| Model       | Must be selected from available list         |

## Phase 5 Deliverables

- [ ] AI Model section in Options page
- [ ] ProviderSelector component (Ollama only for MVP)
- [ ] ProviderConfigForm component
- [ ] ModelSelector component
- [ ] Connection testing functionality
- [ ] Model list refresh functionality
- [ ] Configuration persistence to storage
- [ ] Background script message handlers
- [ ] Error state handling and display
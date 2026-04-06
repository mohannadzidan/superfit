/** Built-in provider types — add new ones by extending this union */
export type ProviderType = 'ollama' | 'llamacpp' | 'gemini' | 'groq' | 'openai-compat'

export type RouterPurpose = string

export interface RouterModelEntry {
  /** Reference to a StoredProvider.id */
  providerId: string
  /** The model identifier as known by the provider */
  modelId: string
  /** Rate limit configuration — all optional */
  limits?: {
    rpm?: number
    rpd?: number
    tpm?: number
    tpd?: number
  }
}

export interface StoredRouter {
  id: string
  /** User-facing name */
  name: string
  /** Which purpose this router serves */
  purpose: RouterPurpose
  /** Ordered list of models with their quotas */
  models: RouterModelEntry[]
}

export interface StoredProvider {
  /** Unique user-assigned ID, also used as display label */
  id: string
  /** Which built-in provider type */
  providerType: ProviderType
  /** Provider-specific config (apiKey, serverUrl, etc.) */
  config: Record<string, unknown>
}

export interface StoredModel {
  /** Unique ID */
  id: string
  /** Reference to a StoredProvider.id */
  providerId: string
  /** The model identifier as known by the provider */
  modelId: string
  /** User-facing name */
  name: string
}

export type ThrottleReason = 'rpm' | 'rpd' | 'tpm' | 'tpd'

export interface ModelQuotaState {
  /** Sliding window counters */
  requestsThisMinute: number
  requestsToday: number
  tokensThisMinute: number
  tokensToday: number
  /** Internal window timestamps (ms) */
  minuteWindowStart: number
  dayWindowStart: number
  /** Throttle state */
  throttledUntil?: number
  throttleReason?: ThrottleReason
  /** Error state */
  lastError?: { message: string; timestamp: number }
}

export type ModelHealthStatus = 'available' | 'throttled' | 'error'

export interface RouterModelStatus {
  providerId: string
  modelId: string
  health: ModelHealthStatus
  quotaState: ModelQuotaState | null
  unavailableReason?: string
}

/**
 * Model configuration returned by ACQUIRE_MODEL — contains everything needed
 * for a content script to instantiate a LangChain model with proxied fetch.
 */
export interface AcquiredModelConfig {
  /** Composite key "storedProviderId:modelId" used for quota tracking reports */
  key: string
  providerType: ProviderType
  modelId: string
  /** OpenAI-compatible base URL */
  baseURL: string
  /** API key (or placeholder like 'ollama' / 'not-needed' for local models) */
  apiKey: string
}

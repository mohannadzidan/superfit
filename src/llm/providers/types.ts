import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export interface RateLimitInfo {
  retryAfterSeconds?: number
  remainingRequests?: number
  remainingTokens?: number
  resetRequestsSeconds?: number
  resetTokensSeconds?: number
}

export interface LLMModel {
  /** Unique model identifier (e.g., "llama3.2:latest") */
  modelId: string

  /** Human-readable display name */
  displayName: string

  /** Optional description */
  description?: string
}

export interface ProviderConfigField {
  key: string
  label: string
  type: 'text' | 'url' | 'password' | 'number' | 'boolean'
  required: boolean
  defaultValue?: unknown
  description?: string
}

export interface ProviderConfigSchema {
  fields: ProviderConfigField[]
}

export interface LangChainProvider {
  readonly providerId: string
  readonly providerName: string

  isAvailable(): Promise<boolean>
  getAvailableModels(): Promise<LLMModel[]>
  getConfigSchema(): ProviderConfigSchema
  configure(config: Record<string, unknown>): Promise<void>

  /**
   * Create a LangChain chat model instance for the given model ID.
   * Pass a custom `fetch` to route HTTP calls through the background proxy
   * when instantiating from a content script.
   */
  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): BaseChatModel

  /**
   * Optional: search/filter models by query string.
   * Providers that implement this will be queried server-side as the user types.
   * Providers without this method fall back to client-side filtering on the full list.
   */
  searchModels?(query: string): Promise<LLMModel[]>

  /** Optional: parse provider-specific rate-limit headers from responses.
   *  Providers that don't support this simply don't implement it. */
  parseRateLimitHeaders?(headers: Record<string, string>): RateLimitInfo | null
}

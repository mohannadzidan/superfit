import { BaseChatModel } from '@langchain/core/language_models/chat_models'

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
}

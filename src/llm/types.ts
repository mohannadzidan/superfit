import type { ChatRequest, ToolCall } from 'ollama'

export interface LLMModel {
  /** Unique model identifier (e.g., "llama3.2:latest") */
  modelId: string

  /** Human-readable display name */
  displayName: string

  /** Optional description */
  description?: string
}

export type CompletionRequest = Omit<ChatRequest, 'stream'>
// export interface CompletionRequest {
//   /** The prompt to send to the model */
//   prompt: string

//   /** Model identifier to use */
//   model: string

//   /** Optional system prompt */
//   systemPrompt?: string

//   /** Temperature for response randomness (0.0-1.0) */
//   temperature?: number

//   /** Response format (e.g. 'json' for native JSON mode) */
//   format?: 'json'
// }

export interface CompletionResponse {
  /** Generated text response */
  text: string

  /** Model used for generation */
  model: string

  /** Whether generation completed successfully */
  success: boolean

  /** Error message if success is false */
  error?: string
}

export interface ProviderConfigField {
  /** Field key in config object */
  key: string

  /** Display label */
  label: string

  /** Field type */
  type: 'text' | 'url' | 'password' | 'number' | 'boolean'

  /** Whether field is required */
  required: boolean

  /** Default value */
  defaultValue?: unknown

  /** Help text */
  description?: string
}

export interface ProviderConfigSchema {
  fields: ProviderConfigField[]
}

export interface LLMProvider {
  /** Unique identifier for this provider */
  readonly providerId: string

  /** Human-readable provider name */
  readonly providerName: string

  /**
   * Check if provider is available and properly configured
   */
  isAvailable(): Promise<boolean>

  /**
   * Get list of models available from this provider
   */
  getAvailableModels(): Promise<LLMModel[]>

  /**
   * Get configuration options for this provider
   */
  getConfigSchema(): ProviderConfigSchema

  /**
   * Update provider configuration
   */
  configure(config: Record<string, unknown>): Promise<void>

  /**
   * Stream a completion response
   */
  streamCompletion(request: CompletionRequest, onChunk: (chunk: StreamChunk) => void): Promise<void>
}

export interface StreamChunk {
  text: string
  isDone: boolean
  tool_calls?: ToolCall[]
  inputTokens?: number
  outputTokens?: number
}

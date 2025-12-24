import { Ollama } from 'ollama'
import {
  LLMProvider,
  LLMModel,
  CompletionRequest,
  CompletionResponse,
  ProviderConfigSchema,
  StreamChunk,
} from '../types'

interface OllamaConfig {
  serverUrl: string
}

interface OllamaTagsResponse {
  models: Array<{
    name: string
    modified_at: string
    size: number
  }>
}

interface OllamaGenerateResponse {
  model: string
  response: string
  done: boolean
}

export class OllamaProvider implements LLMProvider {
  readonly providerId = 'ollama'
  readonly providerName = 'Ollama (Local)'
  private ollama!: Ollama
  private config: OllamaConfig = {
    serverUrl: 'http://localhost:11434', // TODO: this should be loaded from the config
  }

  async configure(config: Record<string, unknown>): Promise<void> {
    this.ollama = new Ollama({
      host: this.config.serverUrl.replace(/\/$/, ''),
    })
    if (typeof config.serverUrl === 'string') {
      // Remove trailing slash if present
      this.config.serverUrl = config.serverUrl.replace(/\/$/, '')
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'serverUrl',
          label: 'Server URL',
          type: 'url',
          required: true,
          defaultValue: 'http://localhost:11434',
          description: 'URL where Ollama is running locally',
        },
      ],
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s timeout for availability check

      const response = await fetch(`${this.config.serverUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      console.log('Ollama isAvailable check failed:', error)
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/tags`)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = (await response.json()) as OllamaTagsResponse

      return data.models.map((model) => ({
        modelId: model.name,
        displayName: model.name,
        description: `Size: ${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
      }))
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error)
      return []
    }
  }

  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<void> {
    try {
      const response = await this.ollama.chat({
        ...request,
        stream: true,
        model: request.model,
        keep_alive: '3m',
        options: {
          temperature: 0.7,
        },
      })
      for await (const part of response) {
        onChunk({
          isDone: part.done,
          text: part.message.content,
          tool_calls: part.message.tool_calls,
          inputTokens: part.prompt_eval_count,
          outputTokens: part.eval_count,
        })
      }
    } catch (error) {
      console.error('Ollama stream failed', error)
      throw error
    }
  }
}

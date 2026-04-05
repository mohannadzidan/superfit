import { ChatOpenAI } from '@langchain/openai'
import { LangChainProvider, LLMModel, ProviderConfigSchema } from './types'

interface OllamaTagsResponse {
  models: Array<{ name: string; size: number }>
}

export class OllamaProvider implements LangChainProvider {
  readonly providerId = 'ollama'
  readonly providerName = 'Ollama (Local)'
  private serverUrl = 'http://localhost:11434'

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.serverUrl === 'string') {
      this.serverUrl = config.serverUrl.replace(/\/$/, '')
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
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const response = await fetch(`${this.serverUrl}/api/tags`, { signal: controller.signal })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/tags`)
      if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`)
      const data = (await response.json()) as OllamaTagsResponse
      return data.models.map((m) => ({
        modelId: m.name,
        displayName: m.name,
        description: `Size: ${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
      }))
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error)
      return []
    }
  }

  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): ChatOpenAI {
    return new ChatOpenAI({
      model: modelId,
      temperature: 0.7,
      apiKey: 'ollama',
      configuration: {
        baseURL: `${this.serverUrl}/v1`,
        ...(options?.fetch ? { fetch: options.fetch } : {}),
      },
    })
  }
}

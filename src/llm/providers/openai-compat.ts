import { ChatOpenAI } from '@langchain/openai'
import type { LangChainProvider, LLMModel, ProviderConfigSchema } from './types'

interface OpenAIModelsResponse {
  data: Array<{ id: string; object: string }>
}

export class OpenAICompatProvider implements LangChainProvider {
  readonly providerId = 'openai-compat'
  readonly providerName = 'OpenAI Compatible'
  private serverUrl = ''
  private apiKey = ''

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.serverUrl === 'string') {
      this.serverUrl = config.serverUrl.replace(/\/$/, '')
    }
    if (typeof config.apiKey === 'string') {
      this.apiKey = config.apiKey
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'serverUrl',
          label: 'Base URL',
          type: 'url',
          required: true,
          defaultValue: '',
          description: 'OpenAI-compatible API base URL (e.g. https://openrouter.ai/api/v1)',
        },
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: false,
          defaultValue: '',
          description: 'API key (leave blank if not required)',
        },
      ],
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.serverUrl) return false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const headers: Record<string, string> = {}
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`
      const response = await fetch(`${this.serverUrl}/models`, {
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    if (!this.serverUrl) return []
    try {
      const headers: Record<string, string> = {}
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`
      const response = await fetch(`${this.serverUrl}/models`, { headers })
      if (!response.ok) return []
      const data = (await response.json()) as OpenAIModelsResponse
      return data.data.map((m) => ({ modelId: m.id, displayName: m.id }))
    } catch (error) {
      console.error('Failed to fetch OpenAI-compat models:', error)
      return []
    }
  }

  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): ChatOpenAI {
    return new ChatOpenAI({
      model: modelId,
      apiKey: this.apiKey || 'not-needed',
      temperature: 0.7,
      configuration: {
        baseURL: this.serverUrl,
        ...(options?.fetch ? { fetch: options.fetch } : {}),
      },
    })
  }
}

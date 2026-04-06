import { ChatOpenAI } from '@langchain/openai'
import type { LangChainProvider, LLMModel, ProviderConfigSchema, RateLimitInfo } from './types'

interface GroqModelsResponse {
  data: Array<{ id: string; object: string }>
}

export class GroqProvider implements LangChainProvider {
  readonly providerId = 'groq'
  readonly providerName = 'Groq'
  private apiKey = ''

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.apiKey === 'string') {
      this.apiKey = config.apiKey
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          defaultValue: '',
          description: 'Groq API Key from console.groq.com',
        },
      ],
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    if (!this.apiKey) return []
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      if (!response.ok) return []
      const data = (await response.json()) as GroqModelsResponse
      return data.data.map((m) => ({ modelId: m.id, displayName: m.id }))
    } catch (error) {
      console.error('Failed to fetch Groq models:', error)
      return []
    }
  }

  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): ChatOpenAI {
    return new ChatOpenAI({
      model: modelId,
      apiKey: this.apiKey,
      temperature: 0.7,
      configuration: {
        baseURL: 'https://api.groq.com/openai/v1',
        ...(options?.fetch ? { fetch: options.fetch } : {}),
      },
    })
  }

  parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
    const retryAfter = headers['retry-after'] ?? headers['x-ratelimit-reset-requests']
    if (!retryAfter) return null
    return {
      retryAfterSeconds: parseFloat(retryAfter) || undefined,
      remainingRequests: headers['x-ratelimit-remaining-requests']
        ? parseInt(headers['x-ratelimit-remaining-requests'])
        : undefined,
      remainingTokens: headers['x-ratelimit-remaining-tokens']
        ? parseInt(headers['x-ratelimit-remaining-tokens'])
        : undefined,
    }
  }
}

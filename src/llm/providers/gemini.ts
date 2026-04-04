import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { LangChainProvider, LLMModel, ProviderConfigSchema } from './types'

interface GeminiModelsResponse {
  models: Array<{ name: string; displayName: string; description?: string }>
}

export class GeminiProvider implements LangChainProvider {
  readonly providerId = 'gemini'
  readonly providerName = 'Gemini'
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
          description: 'Google AI API Key',
        },
      ],
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { signal: controller.signal },
      )
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    if (!this.apiKey) return []
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
      )
      if (!response.ok) return []
      const data = (await response.json()) as GeminiModelsResponse
      return data.models
        .filter((m) => m.name.includes('gemini'))
        .map((m) => ({
          modelId: m.name.replace('models/', ''),
          displayName: m.displayName || m.name,
          description: m.description,
        }))
    } catch (error) {
      console.error('Failed to fetch Gemini models:', error)
      return []
    }
  }

  createModel(
    modelId: string,
    _options?: { fetch?: typeof globalThis.fetch },
  ): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      model: modelId,
      apiKey: this.apiKey,
      temperature: 0.7,
    })
  }
}

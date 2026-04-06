import { ChatOpenAI } from '@langchain/openai'
import { GoogleGenAI } from '@google/genai';

import { LangChainProvider, LLMModel, ProviderConfigSchema } from './types'

interface GeminiModelsResponse {
  models: Array<{ name: string; displayName: string; description?: string }>
  nextPageToken?: string
}

export class GeminiProvider implements LangChainProvider {
  readonly providerId = 'gemini'
  readonly providerName = 'Gemini'
  private apiKey = ''

  private ai: GoogleGenAI | null = null

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.apiKey === 'string') {
      this.apiKey = config.apiKey
      this.ai = new GoogleGenAI({ apiKey: this.apiKey })
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
      const response = await this.ai?.models.list({
        config: {
          pageSize: 1
        }
      })
      if (!response || !response.sdkHttpResponse?.responseInternal.ok)
        return false
      return true
    } catch {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    return this.searchModels('')
  }

  async searchModels(query: string): Promise<LLMModel[]> {
    if (!this.apiKey) return []
    try {
      const allModels: LLMModel[] = []
      const response = await this.ai?.models.list({
        config: {
          pageSize: 99999,
        }
      })
      if (response) {

        for (let i = 0; i < response.pageLength; i++) {
          const model = response.getItem(i);
          allModels.push({
            modelId: model.name!,
            displayName: model.displayName!,
            description: model.description,
          });
        }
      }



      return allModels.filter(a => a.displayName.toLowerCase().includes(query.toLowerCase()) || a.modelId.toLowerCase().includes(query.toLowerCase()));
    } catch (error) {
      console.error('Failed to fetch Gemini models:', error)
      return []
    }
  }

  /**
   * Creates a model using Gemini's OpenAI-compatible endpoint so that a
   * custom `fetch` function (e.g. createProxiedFetch) can be injected.
   * The API key is passed as a query param via the baseURL to satisfy the
   * OpenAI client auth requirements alongside Google's key-based auth.
   */
  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): ChatOpenAI {
    return new ChatOpenAI({
      model: modelId,
      apiKey: this.apiKey,
      temperature: 0.7,

      configuration: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        ...(options?.fetch ? { fetch: options.fetch } : {}),
      },
    })
  }
}

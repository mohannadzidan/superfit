import { GoogleGenAI } from '@google/genai'
import {
  LLMProvider,
  LLMModel,
  CompletionRequest,
  CompletionResponse,
  ProviderConfigSchema,
  StreamChunk,
} from '../types'

interface OllamaConfig {
  apiKey?: string
}

interface OllamaGenerateResponse {
  model: string
  response: string
  done: boolean
}

export class GeminiProvider implements LLMProvider {
  readonly providerId = 'gemini'
  readonly providerName = 'Gemini'
  private ai = new GoogleGenAI({ apiKey: '' })
  private config: OllamaConfig = {
    apiKey: undefined,
  }

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.apiKey === 'string') {
      // Remove trailing slash if present
      this.config.apiKey = config.apiKey.replace(/\/$/, '')
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey })
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          defaultValue: '',
          description: 'API Key for Google GenAI',
        },
      ],
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false
    }
    try {
      const response = await this.ai.models.list()
      return true // TODO: check if model is available properly
    } catch (error) {
      return false
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await this.ai.models.list()
      return response.page.map((model) => ({
        modelId: model.name ?? 'Unknown',
        displayName: model.name ?? 'Unknown',
        description: model.description ?? '',
      }))
    } catch (error) {
      console.error('Failed to fetch gemini models:', error)
      return []
    }
  }

  async streamCompletion(
    request: CompletionRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<void> {
    try {
      const result = await this.ai.models.generateContentStream({
        model: request.model,
        contents: request.messages!.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }],
        })),
      })

      for await (const chunk of result) {
        const chunkText = chunk.text
        if (chunkText) {
          onChunk({
            text: chunkText,
            isDone: false,
          })
        }
      }
      onChunk({ text: '', isDone: true }) // Signal done
    } catch (error) {
      console.error('Gemini stream failed', error)
      throw error
    }
  }
}

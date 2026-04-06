import { GeminiProvider } from './gemini'
import { GroqProvider } from './groq'
import { LlamaCppProvider } from './llamacpp'
import { OllamaProvider } from './ollama'
import { OpenAICompatProvider } from './openai-compat'
import type { LangChainProvider, ProviderConfigSchema } from './types'
import type { ProviderType } from '../router/router-types'

type ProviderFactory = () => LangChainProvider

export class ProviderTypeRegistry {
  private factories = new Map<ProviderType, ProviderFactory>()
  private names = new Map<ProviderType, string>()

  register(type: ProviderType, name: string, factory: ProviderFactory): void {
    this.factories.set(type, factory)
    this.names.set(type, name)
  }

  createProvider(type: ProviderType): LangChainProvider {
    const factory = this.factories.get(type)
    if (!factory) throw new Error(`Unknown provider type: ${type}`)
    return factory()
  }

  getProviderName(type: ProviderType): string {
    return this.names.get(type) ?? type
  }

  getConfigSchema(type: ProviderType): ProviderConfigSchema {
    return this.createProvider(type).getConfigSchema()
  }

  getRegisteredTypes(): ProviderType[] {
    return Array.from(this.factories.keys())
  }
}

export const providerTypeRegistry = new ProviderTypeRegistry()

providerTypeRegistry.register('ollama', 'Ollama (Local)', () => new OllamaProvider())
providerTypeRegistry.register('llamacpp', 'llama.cpp (Local)', () => new LlamaCppProvider())
providerTypeRegistry.register('gemini', 'Gemini', () => new GeminiProvider())
providerTypeRegistry.register('groq', 'Groq', () => new GroqProvider())
providerTypeRegistry.register('openai-compat', 'OpenAI Compatible', () => new OpenAICompatProvider())

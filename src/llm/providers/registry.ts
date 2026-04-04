import { GeminiProvider } from './gemini'
import { LlamaCppProvider } from './llamacpp'
import { OllamaProvider } from './ollama'
import { LangChainProvider } from './types'

export interface IProviderRegistry {
  register(provider: LangChainProvider): void
  getProvider(providerId: string): LangChainProvider | null
  getAllProviders(): LangChainProvider[]
  getAvailableProviders(): Promise<LangChainProvider[]>
}

export class ProviderRegistry implements IProviderRegistry {
  private providers: Map<string, LangChainProvider> = new Map()

  register(provider: LangChainProvider): void {
    if (this.providers.has(provider.providerId)) {
      console.warn(`Provider ${provider.providerId} is already registered.`)
      return
    }
    this.providers.set(provider.providerId, provider)
  }

  getProvider(providerId: string): LangChainProvider | null {
    return this.providers.get(providerId) ?? null
  }

  getAllProviders(): LangChainProvider[] {
    return Array.from(this.providers.values())
  }

  async getAvailableProviders(): Promise<LangChainProvider[]> {
    const results = await Promise.all(
      this.getAllProviders().map(async (p) => ((await p.isAvailable()) ? p : null)),
    )
    return results.filter((p): p is LangChainProvider => p !== null)
  }
}

export const providerRegistry = new ProviderRegistry()


providerRegistry.register(new OllamaProvider())
providerRegistry.register(new LlamaCppProvider())
providerRegistry.register(new GeminiProvider())
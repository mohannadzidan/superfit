import { LLMProvider } from './types';

export interface IProviderRegistry {
  register(provider: LLMProvider): void;
  getProvider(providerId: string): LLMProvider | null;
  getAllProviders(): LLMProvider[];
  getAvailableProviders(): Promise<LLMProvider[]>;
}

export class ProviderRegistry implements IProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  register(provider: LLMProvider): void {
    if (this.providers.has(provider.providerId)) {
      console.warn(`Provider with ID ${provider.providerId} is already registered.`);
      return;
    }
    this.providers.set(provider.providerId, provider);
  }

  getProvider(providerId: string): LLMProvider | null {
    return this.providers.get(providerId) || null;
  }

  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  async getAvailableProviders(): Promise<LLMProvider[]> {
    const providers = this.getAllProviders();
    const availabilityChecks = providers.map(async (provider) => {
      const isAvailable = await provider.isAvailable();
      return isAvailable ? provider : null;
    });

    const results = await Promise.all(availabilityChecks);
    return results.filter((p): p is LLMProvider => p !== null);
  }
}

export const providerRegistry = new ProviderRegistry();

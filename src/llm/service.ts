import { IProviderRegistry, providerRegistry } from './registry';
import { CompletionRequest, CompletionResponse, LLMProvider } from './types';
import { llmStorage } from '../shared/storage/llm';
import { OllamaProvider } from './providers/ollama';

// Register default providers
providerRegistry.register(new OllamaProvider());

export interface ILLMService {
  initialize(providerId?: string, modelId?: string): Promise<void>;
  generateCompletion(request: Omit<CompletionRequest, 'model'>): Promise<CompletionResponse>;
}

export class LLMService implements ILLMService {
  private currentProvider: LLMProvider | null = null;
  private currentModelId: string = '';

  constructor(private registry: IProviderRegistry = providerRegistry) {}

  async initialize(providerId?: string, modelId?: string): Promise<void> {
    // If IDs provided, use them
    if (providerId && modelId) {
      this.setProvider(providerId, modelId);
      return;
    }

    // Otherwise load from storage
    const stored = await llmStorage.getConfig();
    if (stored) {
      this.setProvider(stored.providerId, stored.modelId);
      
      // Update config if specific settings exist
      const provider = this.registry.getProvider(stored.providerId);
      if (provider && stored.providerConfigs[stored.providerId]) {
        await provider.configure(stored.providerConfigs[stored.providerId]);
      }
    } else {
      // Default fallback
      const providers = this.registry.getAllProviders();
      if (providers.length > 0) {
        this.currentProvider = providers[0];
        // Cannot strictly set modelId yet until we fetch them, but provider is ready
      }
    }
  }

  private setProvider(providerId: string, modelId: string) {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      console.warn(`LLMService: Provider ${providerId} not found.`);
      return;
    }
    this.currentProvider = provider;
    this.currentModelId = modelId;
  }

  async generateCompletion(request: Omit<CompletionRequest, 'model'>): Promise<CompletionResponse> {
    if (!this.currentProvider) {
      return {
        text: '',
        model: '',
        success: false,
        error: 'No LLM provider configured.'
      };
    }

    if (!this.currentModelId) {
       return {
        text: '',
        model: '',
        success: false,
        error: 'No model selected.'
      };
    }

    return this.currentProvider.generateCompletion({
      ...request,
      model: this.currentModelId
    });
  }

  getCurrentSettings() {
    return {
      providerId: this.currentProvider?.providerId,
      modelId: this.currentModelId
    };
  }
}

export const llmService = new LLMService();

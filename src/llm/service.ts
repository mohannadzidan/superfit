import { IProviderRegistry, providerRegistry } from './providers/registry'
import { LangChainProvider } from './providers/types'
import { llmStorage } from '../shared/storage/llm'
import { resumeStorage } from '../shared/storage/resume'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

export interface ILLMService {
  initialize(providerId?: string, modelId?: string): Promise<void>
  getModel(): BaseChatModel
  loadVariables(): Promise<Record<string, string>>
}

export class LLMService implements ILLMService {
  private currentProvider: LangChainProvider | null = null
  private currentModelId: string = ''

  constructor(private registry: IProviderRegistry = providerRegistry) {}

  async initialize(providerId?: string, modelId?: string): Promise<void> {
    if (providerId && modelId) {
      this.setProvider(providerId, modelId)
      return
    }

    const stored = await llmStorage.getConfig()
    if (stored) {
      this.setProvider(stored.providerId, stored.providerConfigs[stored.providerId].modelId)

      const provider = this.registry.getProvider(stored.providerId)
      if (provider && stored.providerConfigs[stored.providerId]) {
        await provider.configure(stored.providerConfigs[stored.providerId].config)
      }
    } else {
      const providers = this.registry.getAllProviders()
      if (providers.length > 0) {
        this.currentProvider = providers[0]
      }
    }
  }

  private setProvider(providerId: string, modelId: string) {
    const provider = this.registry.getProvider(providerId)
    if (!provider) {
      console.warn(`LLMService: Provider ${providerId} not found.`)
      return
    }
    this.currentProvider = provider
    this.currentModelId = modelId
  }

  async loadVariables(): Promise<Record<string, string>> {
    const resume = await resumeStorage.getResume()
    return { resume: resume?.markdownContent ?? '' }
  }

  getModel(): BaseChatModel {
    if (!this.currentProvider) throw new Error('No LLM provider configured.')
    if (!this.currentModelId) throw new Error('No model selected.')
    return this.currentProvider.createModel(this.currentModelId)
  }

  getCurrentSettings() {
    return {
      providerId: this.currentProvider?.providerId,
      modelId: this.currentModelId,
    }
  }
}

export const llmService = new LLMService()

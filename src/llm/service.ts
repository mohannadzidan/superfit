import { IProviderRegistry, providerRegistry } from './registry'
import { CompletionRequest, CompletionResponse, LLMProvider, StreamChunk } from './types'
import { llmStorage } from '../shared/storage/llm'
import { OllamaProvider } from './providers/ollama'
import { LRUCache } from 'lru-cache'
import { hash } from 'ohash'
import Mustache from 'mustache'
import { resumeStorage } from '../shared/storage/resume'

const lru = new LRUCache({
  max: 500,

  // for use when you need to clean up something when objects
  // are evicted from the cache
  // dispose: (value, key, reason) => {
  //   freeFromMemoryOrWhatever(value)
  // },

  // for use when you need to know that an item is being inserted
  // note that this does NOT allow you to prevent the insertion,
  // it just allows you to know about it.
  // onInsert: (value, key, reason) => {
  //   logInsertionOrWhatever(key, value)
  // },

  // how long to live in ms
  ttl: 1000 * 60 * 5,

  // return stale items before removing from cache?
  allowStale: false,

  // updateAgeOnGet: false,
  // updateAgeOnHas: false,

  // async method to use for cache.fetch(), for
  // stale-while-revalidate type of behavior
  // fetchMethod: async (key, staleValue, { options, signal, context }) => {},
})

async function cache<T>(key: string, asyncFn: () => Promise<T>): Promise<T> {
  const cachedValue = lru.get(key)
  if (cachedValue !== undefined) {
    return cachedValue as T
  }
  try {
    const result = asyncFn()
    lru.set(key, result)
    return result
  } catch (error) {
    lru.delete(key)
    throw error
  }
}

// Register default providers
providerRegistry.register(new OllamaProvider())

export interface ILLMService {
  initialize(providerId?: string, modelId?: string): Promise<void>
  streamCompletion(
    request: Omit<CompletionRequest, 'model'>,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<void>
}

export class LLMService implements ILLMService {
  private currentProvider: LLMProvider | null = null
  private currentModelId: string = ''

  constructor(private registry: IProviderRegistry = providerRegistry) {}

  async initialize(providerId?: string, modelId?: string): Promise<void> {
    // If IDs provided, use them
    if (providerId && modelId) {
      this.setProvider(providerId, modelId)
      return
    }

    // Otherwise load from storage
    const stored = await llmStorage.getConfig()
    if (stored) {
      this.setProvider(stored.providerId, stored.providerConfigs[stored.providerId].modelId)

      // Update config if specific settings exist
      const provider = this.registry.getProvider(stored.providerId)
      if (provider && stored.providerConfigs[stored.providerId]) {
        await provider.configure(stored.providerConfigs[stored.providerId].config)
      }
    } else {
      // Default fallback
      const providers = this.registry.getAllProviders()
      if (providers.length > 0) {
        this.currentProvider = providers[0]
        // Cannot strictly set modelId yet until we fetch them, but provider is ready
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

  async loadVariables() {
    // 1. Get Resume
    const resume = await resumeStorage.getResume()

    return { resume: resume?.markdownContent ?? '' }
  }

  async streamCompletion(
    request: Omit<CompletionRequest, 'model'> & { variables?: Record<string, string> },
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('No LLM provider configured.')
    }

    if (!this.currentModelId) {
      throw new Error('No model selected.')
    }
    const builtinVariables = await this.loadVariables()
    request.variables = {
      ...builtinVariables,
      ...request.variables,
    }
    console.log({ aaaaa: true, variables: request.variables })

    request.messages = request.messages?.map((message) => ({
      ...message,
      content: Mustache.render(message.content, request.variables),
    }))

    delete request.variables
    return this.currentProvider.streamCompletion(
      {
        ...request,
        model: this.currentModelId,
      },
      onChunk,
    )
  }

  getCurrentSettings() {
    return {
      providerId: this.currentProvider?.providerId,
      modelId: this.currentModelId,
    }
  }
}

export const llmService = new LLMService()

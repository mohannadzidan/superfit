import type { LangChainProvider } from '../providers/types'
import { providerTypeRegistry } from '../providers/registry'
import { routerStorage } from '../../shared/storage/router-storage'
import type { RouterModelStatus, StoredProvider, ProviderType, AcquiredModelConfig } from './router-types'
import { QuotaTracker } from './quota-tracker'
import { LLMRouter } from './router-engine'

function getProviderEndpoint(
  providerType: ProviderType,
  config: Record<string, unknown>,
): { baseURL: string; apiKey: string } {
  const serverUrl = ((config.serverUrl as string) ?? '').replace(/\/$/, '')
  const apiKey = (config.apiKey as string) ?? ''
  switch (providerType) {
    case 'groq':
      return { baseURL: 'https://api.groq.com/openai/v1', apiKey }
    case 'gemini':
      return { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey }
    case 'ollama':
      return { baseURL: `${serverUrl}/v1`, apiKey: 'ollama' }
    case 'llamacpp':
      return { baseURL: `${serverUrl}/v1`, apiKey: 'not-needed' }
    case 'openai-compat':
      return { baseURL: serverUrl, apiKey: apiKey || 'not-needed' }
  }
}

export class RouterManager {
  /** Keyed by router purpose */
  private routers = new Map<string, LLMRouter>()
  /** Keyed by StoredProvider.id */
  private providerInstances = new Map<string, LangChainProvider>()
  /** Keyed by StoredProvider.id — kept for acquireModel() config lookups */
  private storedProviders = new Map<string, StoredProvider>()
  private quotaTracker = new QuotaTracker()

  /** Initialize from storage — creates provider instances and routers */
  async initialize(): Promise<void> {
    const [providers, routers] = await Promise.all([
      routerStorage.getProviders(),
      routerStorage.getRouters(),
    ])

    this.providerInstances.clear()
    this.storedProviders.clear()
    this.routers.clear()

    // Build provider instances (keyed by StoredProvider.id)
    for (const stored of providers) {
      try {
        const instance = providerTypeRegistry.createProvider(stored.providerType)
        await instance.configure(stored.config)
        this.providerInstances.set(stored.id, instance)
        this.storedProviders.set(stored.id, stored)
      } catch (err) {
        console.warn(`RouterManager: failed to create provider "${stored.id}":`, err)
      }
    }

    // Build routers
    for (const storedRouter of routers) {
      const router = new LLMRouter(storedRouter, this.providerInstances, this.quotaTracker)
      this.routers.set(storedRouter.purpose, router)
    }
  }

  /**
   * Select the best available model for a purpose and return its connection
   * config so a content script can instantiate a LangChain model locally
   * with createProxiedFetch(). Quota pre-checks are applied; the first
   * passing model is returned.
   */
  acquireModel(purpose: string): AcquiredModelConfig | null {
    let router: LLMRouter | undefined
    try {
      router = this.getRouter(purpose)
    } catch {
      return null
    }

    for (const entry of router.modelEntries) {
      const provider = this.providerInstances.get(entry.providerId)
      if (!provider) continue
      if (!this.quotaTracker.canUse(entry.providerId, entry.modelId, entry.limits)) continue

      const stored = this.storedProviders.get(entry.providerId)
      if (!stored) continue

      const { baseURL, apiKey } = getProviderEndpoint(stored.providerType, stored.config)
      return {
        key: `${entry.providerId}:${entry.modelId}`,
        providerType: stored.providerType,
        modelId: entry.modelId,
        baseURL,
        apiKey,
      }
    }
    return null
  }

  /** Report a successful model invocation for quota tracking */
  recordSuccess(key: string, inputTokens: number, outputTokens: number): void {
    const colon = key.indexOf(':')
    const providerId = key.slice(0, colon)
    const modelId = key.slice(colon + 1)
    this.quotaTracker.recordSuccess(providerId, modelId, inputTokens, outputTokens)
  }

  /** Report a 429 / rate-limit response so the model is throttled */
  recordThrottle(key: string, retryAfterMs?: number): void {
    const colon = key.indexOf(':')
    const providerId = key.slice(0, colon)
    const modelId = key.slice(colon + 1)
    this.quotaTracker.recordThrottle(providerId, modelId, undefined, retryAfterMs)
  }

  /** Report a non-rate-limit error so the model is isolated temporarily */
  recordError(key: string, error: string): void {
    const colon = key.indexOf(':')
    const providerId = key.slice(0, colon)
    const modelId = key.slice(colon + 1)
    this.quotaTracker.recordError(providerId, modelId, error)
  }

  /**
   * Get a router by purpose. Falls back to 'default' if not found,
   * throws if 'default' is also missing.
   */
  getRouter(purpose: string): LLMRouter {
    const router = this.routers.get(purpose) ?? this.routers.get('default')
    if (!router) {
      throw new Error(
        `No router configured for purpose "${purpose}" and no default router found. ` +
          'Please configure at least one router in the Options page.',
      )
    }
    return router
  }

  /** Reload config from storage (called when storage changes) */
  async reload(): Promise<void> {
    await this.initialize()
  }

  /** Get all router statuses for UI */
  getAllStatus(): Record<string, RouterModelStatus[]> {
    const result: Record<string, RouterModelStatus[]> = {}
    for (const [purpose, router] of this.routers) {
      result[purpose] = router.getStatus()
    }
    return result
  }

  get quota(): QuotaTracker {
    return this.quotaTracker
  }
}

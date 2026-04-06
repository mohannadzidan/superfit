import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { LangChainProvider } from '../providers/types'
import type { StoredRouter, RouterModelStatus, ModelHealthStatus, RouterModelEntry } from './router-types'
import { QuotaTracker } from './quota-tracker'
import { TrackedModel } from './tracked-model'

export class AllModelsExhaustedError extends Error {
  constructor(
    public readonly details: Array<{ providerId: string; modelId: string; reason: string }>,
  ) {
    super(
      `All models exhausted: ${details.map((d) => `${d.providerId}:${d.modelId} (${d.reason})`).join(', ')}`,
    )
    this.name = 'AllModelsExhaustedError'
  }
}

export class LLMRouter {
  constructor(
    private readonly config: StoredRouter,
    private readonly providerInstances: Map<string, LangChainProvider>,
    private readonly quotaTracker: QuotaTracker,
  ) {}

  /**
   * Get the best available model, respecting quotas and health.
   * Iterates models in order, returns first healthy one.
   * Throws AllModelsExhaustedError if none available.
   */
  getModel(): { model: BaseChatModel; providerId: string; modelId: string } {
    const exhaustedReasons: Array<{ providerId: string; modelId: string; reason: string }> = []

    for (const entry of this.config.models) {
      const provider = this.providerInstances.get(entry.providerId)
      if (!provider) {
        exhaustedReasons.push({
          providerId: entry.providerId,
          modelId: entry.modelId,
          reason: 'provider not found',
        })
        continue
      }

      if (!this.quotaTracker.canUse(entry.providerId, entry.modelId, entry.limits)) {
        const status = this.quotaTracker.getStatus(entry.providerId, entry.modelId)
        const state = this.quotaTracker.getState(entry.providerId, entry.modelId)
        let reason: string
        if (status === 'throttled') {
          const until = state?.throttledUntil
          const remainMs = until ? until - Date.now() : 0
          reason = `throttled (${state?.throttleReason ?? 'unknown'}, resets in ${Math.ceil(remainMs / 1000)}s)`
        } else if (status === 'error') {
          reason = `error: ${state?.lastError?.message ?? 'unknown'}`
        } else {
          reason = 'quota exceeded'
        }
        exhaustedReasons.push({ providerId: entry.providerId, modelId: entry.modelId, reason })
        continue
      }

      const innerModel = provider.createModel(entry.modelId)
      const tracked = new TrackedModel(
        innerModel,
        entry.providerId,
        entry.modelId,
        this.quotaTracker,
        () => {
          // On 429, retry with next model by re-running selection
          const next = this.getModel()
          return next.model
        },
      )

      return { model: tracked, providerId: entry.providerId, modelId: entry.modelId }
    }

    throw new AllModelsExhaustedError(exhaustedReasons)
  }

  /** Get status of all models in this router */
  getStatus(): RouterModelStatus[] {
    return this.config.models.map((entry) => {
      const health: ModelHealthStatus = this.quotaTracker.getStatus(
        entry.providerId,
        entry.modelId,
      )
      const state = this.quotaTracker.getState(entry.providerId, entry.modelId)
      const provider = this.providerInstances.get(entry.providerId)

      let unavailableReason: string | undefined
      if (!provider) {
        unavailableReason = 'provider not configured'
      } else if (health === 'throttled' && state?.throttledUntil) {
        const remainMs = state.throttledUntil - Date.now()
        unavailableReason = `throttled (${state.throttleReason ?? 'unknown'}, resets in ${Math.ceil(remainMs / 1000)}s)`
      } else if (health === 'error' && state?.lastError) {
        unavailableReason = state.lastError.message
      }

      return {
        providerId: entry.providerId,
        modelId: entry.modelId,
        health,
        quotaState: state,
        unavailableReason,
      }
    })
  }

  get purpose(): string {
    return this.config.purpose
  }

  get modelEntries(): RouterModelEntry[] {
    return this.config.models
  }
}

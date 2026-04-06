import type { ModelQuotaState, ModelHealthStatus, ThrottleReason, RouterModelEntry } from './router-types'

const ERROR_ISOLATION_MS = 60_000
const MIN_WINDOW_MS = 60_000
const DAY_WINDOW_MS = 86_400_000
const DEFAULT_BACKOFF_MS = 10_000
const MAX_BACKOFF_MS = 5 * 60_000

export class QuotaTracker {
  private states = new Map<string, ModelQuotaState>()
  private backoffMs = new Map<string, number>()

  private key(providerId: string, modelId: string): string {
    return `${providerId}:${modelId}`
  }

  private getOrCreate(providerId: string, modelId: string): ModelQuotaState {
    const k = this.key(providerId, modelId)
    if (!this.states.has(k)) {
      const now = Date.now()
      this.states.set(k, {
        requestsThisMinute: 0,
        requestsToday: 0,
        tokensThisMinute: 0,
        tokensToday: 0,
        minuteWindowStart: now,
        dayWindowStart: now,
      })
    }
    return this.states.get(k)!
  }

  private resetExpiredWindows(state: ModelQuotaState): void {
    const now = Date.now()
    if (now - state.minuteWindowStart >= MIN_WINDOW_MS) {
      state.requestsThisMinute = 0
      state.tokensThisMinute = 0
      state.minuteWindowStart = now
    }
    if (now - state.dayWindowStart >= DAY_WINDOW_MS) {
      state.requestsToday = 0
      state.tokensToday = 0
      state.dayWindowStart = now
    }
  }

  /** Check if a model can accept a request given its configured limits */
  canUse(providerId: string, modelId: string, limits?: RouterModelEntry['limits']): boolean {
    const state = this.getOrCreate(providerId, modelId)
    this.resetExpiredWindows(state)
    const now = Date.now()

    // Check throttle
    if (state.throttledUntil && now < state.throttledUntil) return false
    if (state.throttledUntil && now >= state.throttledUntil) {
      delete state.throttledUntil
      delete state.throttleReason
    }

    // Check error isolation
    if (state.lastError && now - state.lastError.timestamp < ERROR_ISOLATION_MS) return false
    if (state.lastError && now - state.lastError.timestamp >= ERROR_ISOLATION_MS) {
      delete state.lastError
    }

    if (!limits) return true

    if (limits.rpm !== undefined && state.requestsThisMinute >= limits.rpm) return false
    if (limits.rpd !== undefined && state.requestsToday >= limits.rpd) return false
    if (limits.tpm !== undefined && state.tokensThisMinute >= limits.tpm) return false
    if (limits.tpd !== undefined && state.tokensToday >= limits.tpd) return false

    return true
  }

  /** Get current health status */
  getStatus(providerId: string, modelId: string): ModelHealthStatus {
    const state = this.getOrCreate(providerId, modelId)
    const now = Date.now()
    if (state.throttledUntil && now < state.throttledUntil) return 'throttled'
    if (state.lastError && now - state.lastError.timestamp < ERROR_ISOLATION_MS) return 'error'
    return 'available'
  }

  /** Record that a request is starting (increments request counters) */
  recordRequest(providerId: string, modelId: string): void {
    const state = this.getOrCreate(providerId, modelId)
    this.resetExpiredWindows(state)
    state.requestsThisMinute++
    state.requestsToday++
  }

  /** Record a successful request with token usage */
  recordSuccess(
    providerId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const state = this.getOrCreate(providerId, modelId)
    const tokens = inputTokens + outputTokens
    state.tokensThisMinute += tokens
    state.tokensToday += tokens
    // Clear any previous error / throttle on success
    delete state.lastError
    const k = this.key(providerId, modelId)
    this.backoffMs.delete(k)
  }

  /** Record a 429 / rate limit error */
  recordThrottle(
    providerId: string,
    modelId: string,
    reason?: ThrottleReason,
    retryAfterMs?: number,
  ): void {
    const state = this.getOrCreate(providerId, modelId)
    const k = this.key(providerId, modelId)

    let backoff: number
    if (retryAfterMs !== undefined) {
      backoff = retryAfterMs
      this.backoffMs.delete(k)
    } else {
      const current = this.backoffMs.get(k) ?? DEFAULT_BACKOFF_MS
      backoff = Math.min(current * 2, MAX_BACKOFF_MS)
      this.backoffMs.set(k, backoff)
    }

    state.throttledUntil = Date.now() + backoff
    state.throttleReason = reason
  }

  /** Record a non-rate-limit error */
  recordError(providerId: string, modelId: string, message: string): void {
    const state = this.getOrCreate(providerId, modelId)
    state.lastError = { message, timestamp: Date.now() }
  }

  /** Get state for UI display */
  getState(providerId: string, modelId: string): ModelQuotaState | null {
    return this.states.get(this.key(providerId, modelId)) ?? null
  }
}

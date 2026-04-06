import { ChatOpenAI } from '@langchain/openai'
import type { AcquiredModelConfig } from './router/router-types'

/**
 * Instantiate a LangChain ChatOpenAI model from a config acquired via the
 * ACQUIRE_MODEL background message. All providers expose an OpenAI-compatible
 * endpoint, so a single model class works for all of them.
 *
 * Pass `proxiedFetch` (from createProxiedFetch) so that the content script
 * routes HTTP calls through the background service worker, bypassing CSP.
 *
 * @example
 * ```ts
 * const proxiedFetch = createProxiedFetch()
 * const resp = await chrome.runtime.sendMessage({ type: 'ACQUIRE_MODEL', payload: { purpose: 'complete-fields' } })
 * const model = createProxiedModel(resp.model, proxiedFetch)
 * const result = await model.invoke([new HumanMessage('Hello')])
 * ```
 */
export function createProxiedModel(
  config: AcquiredModelConfig,
  proxiedFetch: typeof globalThis.fetch,
): ChatOpenAI {
  return new ChatOpenAI({
    model: config.modelId,
    apiKey: config.apiKey,
    temperature: 0.7,
    configuration: {
      baseURL: config.baseURL,
      fetch: proxiedFetch,
    },
  })
}

/** Returns true if the error looks like a 429 Too Many Requests response. */
export function is429Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  if (e['status'] === 429 || e['statusCode'] === 429) return true
  if (typeof e['message'] === 'string' && /\b429\b/.test(e['message'])) return true
  return false
}

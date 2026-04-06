import { llmService } from '../llm/service'
import { providerTypeRegistry } from '../llm/providers/registry'
import { agentRegistry } from '../llm/agents/registry'
import { jobFitAgent } from '../llm/agents/job-fit'

import type {
  LLMMessage,
  GetRouterStatusResponse,
  ListProviderTypesResponse,
  GetProviderModelsResponse,
  TestProviderConnectionResponse,
  AcquireModelResponse,
  ProxyFetchResponse,
  GetCapturedJobResponse,
  CapturedJobChangedMessage,
} from '../shared/messaging/types'
import type { JobPostingInfo } from '../adapters/types'
import type { LLMModel } from '../llm/providers/types'
import { capturedJobStorage } from '../shared/storage/capturedJob'

console.log('SuperFit background service worker started')

agentRegistry.register(jobFitAgent)

// Initialize router manager
llmService
  .initialize()
  .catch((err) => console.error('LLM Service Init Error:', err))

// Reload router manager whenever storage changes
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') {
    llmService.manager.reload().catch((err) => console.error('RouterManager reload error:', err))
  }
})

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse)
  return true // Keep channel open for async response
})

async function handleMessage(request: LLMMessage): Promise<unknown> {
  // ── Provider / Router management ─────────────────────────────────────────

  if (request.type === 'LIST_PROVIDER_TYPES') {
    const types = providerTypeRegistry.getRegisteredTypes()
    return {
      success: true,
      providerTypes: types.map((type) => ({
        type,
        name: providerTypeRegistry.getProviderName(type),
        configSchema: providerTypeRegistry.getConfigSchema(type),
      })),
    } satisfies ListProviderTypesResponse
  }

  if (request.type === 'GET_PROVIDER_MODELS') {
    const { providerType, config, query } = request.payload
    try {
      const provider = providerTypeRegistry.createProvider(providerType)
      await provider.configure(config)
      const supportsSearch = typeof provider.searchModels === 'function'
      let models: LLMModel[]
      if (query !== undefined && supportsSearch) {
        models = await provider.searchModels!(query)
      } else {
        models = await provider.getAvailableModels()
      }
      return { success: true, models, supportsSearch } satisfies GetProviderModelsResponse
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models',
      } satisfies GetProviderModelsResponse
    }
  }

  if (request.type === 'TEST_PROVIDER_CONNECTION') {
    const { providerType, config } = request.payload
    try {
      const provider = providerTypeRegistry.createProvider(providerType)
      await provider.configure(config)
      const ok = await provider.isAvailable()
      return ok
        ? { success: true }
        : { success: false, error: 'Connection failed. Check settings and ensure the service is running.' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } satisfies TestProviderConnectionResponse
    }
  }

  if (request.type === 'GET_ROUTER_STATUS') {
    try {
      const status = llmService.manager.getAllStatus()
      return { success: true, status } satisfies GetRouterStatusResponse
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } satisfies GetRouterStatusResponse
    }
  }

  if (request.type === 'ACQUIRE_MODEL') {
    const { purpose } = request.payload
    const model = llmService.manager.acquireModel(purpose) ?? llmService.manager.acquireModel('default')
    if (!model) {
      return {
        success: false,
        error: `No models available for purpose "${purpose}". Configure providers and routers in the Options page.`,
      } satisfies AcquireModelResponse
    }
    return { success: true, model } satisfies AcquireModelResponse
  }

  if (request.type === 'RECORD_MODEL_SUCCESS') {
    const { key, inputTokens, outputTokens } = request.payload
    llmService.manager.recordSuccess(key, inputTokens, outputTokens)
    return { success: true }
  }

  if (request.type === 'RECORD_MODEL_THROTTLE') {
    const { key, retryAfterMs } = request.payload
    llmService.manager.recordThrottle(key, retryAfterMs)
    return { success: true }
  }

  if (request.type === 'RECORD_MODEL_ERROR') {
    const { key, error } = request.payload
    llmService.manager.recordError(key, error)
    return { success: true }
  }

  // ── Proxy fetch ───────────────────────────────────────────────────────────

  if (request.type === 'PROXY_FETCH') {
    const { url, method, headers, body } = request.payload
    try {
      const res = await fetch(url, { method, headers, body })
      const responseBody = await res.text()
      return {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseBody,
      } satisfies ProxyFetchResponse
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      } satisfies Partial<ProxyFetchResponse>
    }
  }

  // ── Job capture ───────────────────────────────────────────────────────────

  if (request.type === 'CAPTURE_JOB') {
    const { jobInfo } = request.payload
    await capturedJobStorage.set(jobInfo)
    await broadcastCapturedJobChanged(jobInfo)
    return { success: true }
  }

  if (request.type === 'RELEASE_JOB') {
    await capturedJobStorage.clear()
    await broadcastCapturedJobChanged(null)
    return { success: true }
  }

  if (request.type === 'GET_CAPTURED_JOB') {
    const jobInfo = await capturedJobStorage.get()
    return { success: true, jobInfo } satisfies GetCapturedJobResponse
  }

  return { success: false, error: 'Unknown message type' }
}

async function broadcastCapturedJobChanged(jobInfo: JobPostingInfo | null) {
  const message: CapturedJobChangedMessage = { type: 'CAPTURED_JOB_CHANGED', payload: { jobInfo } }
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => { })
    }
  }
}

// Streaming fetch proxy — used by createStreamingProxiedFetch() in content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'proxy-stream') return

  port.onMessage.addListener(
    async (msg: {
      url: string
      method: string
      headers: Record<string, string>
      body?: string
    }) => {
      try {
        const res = await fetch(msg.url, {
          method: msg.method,
          headers: msg.headers,
          body: msg.body,
        })
        port.postMessage({
          type: 'response-headers',
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
        })

        const reader = res.body?.getReader()
        if (!reader) {
          port.postMessage({ type: 'done' })
          return
        }

        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          port.postMessage({ type: 'chunk', data: decoder.decode(value, { stream: true }) })
        }
        port.postMessage({ type: 'done' })
      } catch (error) {
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )
})

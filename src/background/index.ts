import { llmService } from '../llm/service'
import { providerRegistry } from '../llm/registry'
import { agentRegistry } from '../llm/agents/registry'
import { jobFitAgent } from '../llm/agents/job-fit'
import {
  CapturedJobChangedMessage,
  GetCapturedJobResponse,
  ListLLMProvidersResponse,
  LLMMessage,
  ProxyFetchResponse,
} from '../shared/messaging/types'
import { JobPostingInfo } from '../adapters/types'
import { capturedJobStorage } from '../shared/storage/capturedJob'
import './services/thread' // Initialize thread service

console.log('SuperFit background service worker started')

agentRegistry.register(jobFitAgent)

// Initialize service
llmService.initialize().catch((err) => console.error('LLM Service Init Error:', err))

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse)
  return true // Keep channel open for async response
})

async function handleMessage(request: LLMMessage): Promise<any> {
  if (request.type === 'LIST_LLM_PROVIDERS') {
    return {
      success: true,
      providers: providerRegistry.getAllProviders().map((provider) => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        configSchema: provider.getConfigSchema(),
      })),
    } satisfies ListLLMProvidersResponse
  }

  if (request.type === 'TEST_LLM_CONNECTION') {
    const { providerId, config } = request.payload
    const provider = providerRegistry.getProvider(providerId)

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` }
    }

    try {
      await provider.configure(config)
      const isAvailable = await provider.isAvailable()

      return isAvailable
        ? { success: true }
        : { success: false, error: 'Connection failed. Check URL and ensure server is running.' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  if (request.type === 'GET_LLM_MODELS') {
    const { providerId } = request.payload
    const provider = providerRegistry.getProvider(providerId)

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` }
    }

    try {
      if (request.payload.config) {
        await provider.configure(request.payload.config)
      }
      const models = await provider.getAvailableModels()
      return { success: true, models }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models',
      }
    }
  }

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
      chrome.tabs.sendMessage(tab.id, message).catch(() => {})
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

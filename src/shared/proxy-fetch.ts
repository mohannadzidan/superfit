import { ProxyFetchResponse } from './messaging/types'

/**
 * Creates a fetch-compatible function that proxies all HTTP requests through
 * the Chrome extension background service worker, bypassing CORS and CSP
 * restrictions imposed by the host page.
 *
 * Use this in content scripts when instantiating LangChain providers:
 *
 * ```ts
 * const proxiedFetch = createProxiedFetch()
 * const llm = new ChatOpenAI({ configuration: { baseURL: '...', fetch: proxiedFetch } })
 * ```
 */
export function createProxiedFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url

    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    const headers = Object.fromEntries(new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries())
    const body = init?.body != null ? await serializeBody(init.body) : undefined

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'PROXY_FETCH', payload: { url, method, headers, body } },
        (response: ProxyFetchResponse) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message))
          }
          if (response?.error) {
            return reject(new Error(response.error))
          }
          resolve(
            new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: new Headers(response.headers),
            }),
          )
        },
      )
    })
  }
}

/**
 * Creates a fetch-compatible function that proxies streaming HTTP requests
 * through the Chrome extension background service worker via a long-lived Port.
 *
 * Use this when the LangChain provider needs streaming responses (SSE / chunked transfer):
 *
 * ```ts
 * const streamFetch = createStreamingProxiedFetch()
 * const llm = new ChatOpenAI({ configuration: { baseURL: '...', fetch: streamFetch } })
 * ```
 */
export function createStreamingProxiedFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url

    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    const headers = Object.fromEntries(
      new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      ).entries(),
    )
    const body = init?.body != null ? await serializeBody(init.body) : undefined

    const port = chrome.runtime.connect({ name: 'proxy-stream' })

    return new Promise((resolve, reject) => {
      let resolved = false

      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          port.onMessage.addListener((msg) => {
            if (msg.type === 'chunk') {
              controller.enqueue(new TextEncoder().encode(msg.data as string))
            } else if (msg.type === 'done') {
              controller.close()
              port.disconnect()
            } else if (msg.type === 'error') {
              controller.error(new Error(msg.error as string))
              port.disconnect()
            }
          })
        },
      })

      function onHeaders(msg: any) {
        if (resolved) return
        if (msg.type === 'response-headers') {
          resolved = true
          port.onMessage.removeListener(onHeaders)
          resolve(
            new Response(readable, {
              status: msg.status as number,
              statusText: msg.statusText as string,
              headers: new Headers(msg.headers as Record<string, string>),
            }),
          )
        } else if (msg.type === 'error') {
          resolved = true
          port.onMessage.removeListener(onHeaders)
          reject(new Error(msg.error as string))
        }
      }

      port.onMessage.addListener(onHeaders)
      port.postMessage({ url, method, headers, body })
    })
  }
}

async function serializeBody(body: BodyInit): Promise<string> {
  if (typeof body === 'string') return body
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body)
  if (body instanceof Blob) return await body.text()
  if (body instanceof URLSearchParams) return body.toString()
  return String(body)
}

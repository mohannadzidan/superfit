# Phase 9: Streaming Refactor and Content Script Fetch Proxy

## Overview

Phase 9 makes two related improvements:

1. **True streaming** — the thread service now streams LLM output token-by-token to the UI instead of waiting for the full response.
2. **Content script fetch proxy** — the background service worker gains a network proxy capability so LangChain can be instantiated directly in content scripts, bypassing the CORS and CSP restrictions imposed by host pages.

---

## Problem: CORS in Content Scripts

Content scripts run in the context of the injected page. Any `fetch()` call from a content script inherits the page's origin and is therefore subject to:

- **CORS** — `localhost:11434` (Ollama) and `localhost:8080` (llama.cpp) do not send permissive CORS headers by default, so browser security blocks the request.
- **CSP** — some sites set strict `connect-src` policies that prevent connections to any origin not explicitly allowlisted.

The background service worker has **full network access** — it is not bound to any page's origin and can reach any URL covered by `host_permissions` in the manifest. It acts as a trusted network gateway.

---

## Architecture

```
Content Script (LangChain lives here — optional)
  │
  │  chrome.runtime.sendMessage({ type: 'PROXY_FETCH', ... })
  │  chrome.runtime.connect({ name: 'proxy-stream' })
  ▼
Background Service Worker (network proxy + thread orchestration)
  │
  │  fetch("http://localhost:11434/v1/...")
  ▼
Local LLM (Ollama / llama.cpp) or Cloud API (Gemini)
```

The background already held the LangChain thread service. The proxy makes it possible for content scripts to also use LangChain directly when needed, without duplicating the thread infrastructure.

---

## Changes

### 1. Streaming in `ThreadService`

**File:** `src/background/services/thread.ts`

Previously, `handleUserMessage` called `model.invoke()` and broadcast a single `STATE_UPDATE` after the full response was received. It now calls `model.stream()` and broadcasts a `STATE_UPDATE` after every token chunk:

```typescript
const assistantMsg: ThreadMessage = { role: 'assistant', content: '', timestamp: Date.now() }
thread.messages.push(assistantMsg)

const stream = await model.stream(langchainMessages)
for await (const chunk of stream) {
  assistantMsg.content += typeof chunk.content === 'string' ? chunk.content : ''
  this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
}

thread.status = 'idle'
this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
```

The UI receives a growing assistant message on every tick with no hook or component changes required — `useLLMThread` already re-renders on `STATE_UPDATE`.

---

### 2. Fetch Proxy in the Background

**File:** `src/background/index.ts`

Two new handlers were added alongside the existing message listener.

#### Non-streaming (`PROXY_FETCH` message)

```typescript
// Content script sends:
chrome.runtime.sendMessage(
  { type: 'PROXY_FETCH', payload: { url, method, headers, body } },
  callback,
)

// Background fetches and responds:
const res = await fetch(url, { method, headers, body })
sendResponse({ status, statusText, headers, body: await res.text() })
```

#### Streaming (`proxy-stream` port)

```typescript
// Content script opens a port:
const port = chrome.runtime.connect({ name: 'proxy-stream' })
port.postMessage({ url, method, headers, body })

// Background streams chunks back:
port.postMessage({ type: 'response-headers', status, statusText, headers })
// ... repeated:
port.postMessage({ type: 'chunk', data: '...' })
// when done:
port.postMessage({ type: 'done' })
```

---

### 3. `src/shared/proxy-fetch.ts` _(new)_

Two drop-in `fetch` replacements for use in content scripts.

#### `createProxiedFetch()`

Routes all HTTP requests through `PROXY_FETCH` messages. Use this for providers that do not stream (or when streaming is not needed).

```typescript
import { createProxiedFetch } from '../shared/proxy-fetch'

const proxiedFetch = createProxiedFetch()

const llm = new ChatOpenAI({
  configuration: {
    baseURL: 'http://localhost:11434/v1',
    fetch: proxiedFetch,
  },
  apiKey: 'ollama',
  model: 'llama3',
})
```

#### `createStreamingProxiedFetch()`

Opens a `proxy-stream` port and reconstructs a `ReadableStream` from the chunks. Use this for providers that stream responses (Ollama, llama.cpp).

```typescript
import { createStreamingProxiedFetch } from '../shared/proxy-fetch'

const streamFetch = createStreamingProxiedFetch()

const llm = new ChatOpenAI({
  configuration: {
    baseURL: 'http://localhost:11434/v1',
    fetch: streamFetch, // ← enables token-by-token streaming
  },
  apiKey: 'ollama',
  model: 'llama3',
})
```

---

### 4. LLM Providers — Custom Fetch Support

**Interface:** `src/llm/types.ts`

`createModel` now accepts an optional `fetch` override:

```typescript
createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): BaseChatModel
```

When called from the background (the normal case), no `fetch` is passed and the providers use the global `fetch` directly. When called from a content script, pass `createStreamingProxiedFetch()` to route through the proxy.

#### Ollama — switched from `ChatOllama` to `ChatOpenAI`

`ChatOllama` does not expose a `fetch` override. Ollama has served an OpenAI-compatible `/v1` endpoint since v0.1.24, so the provider was changed to use `ChatOpenAI` pointing at that endpoint instead:

```typescript
// Before
new ChatOllama({ model: modelId, baseUrl: this.serverUrl })

// After
new ChatOpenAI({
  model: modelId,
  apiKey: 'ollama',
  configuration: { baseURL: `${this.serverUrl}/v1`, fetch: options?.fetch },
})
```

`ChatOpenAI`'s `configuration` field accepts standard OpenAI `ClientOptions`, which includes `fetch`. This was verified against the LangChain JS documentation.

#### llama.cpp

Already used `ChatOpenAI`. Custom `fetch` is now threaded through `configuration` the same way.

#### Gemini

Signature updated to satisfy the interface. Custom `fetch` is not forwarded — Gemini's SDK does not expose that option, and `googleapis.com` is reachable directly from the background without a proxy.

---

### 5. Manifest — Broadened `host_permissions`

**File:** `src/manifest.ts`

The old manifest listed specific ports (`localhost:11434`, `localhost:8080`). Users who configure a non-default server URL would have their requests blocked by the browser even in the background. The permissions are now port-wildcard:

```json
"host_permissions": [
  "http://localhost:*/*",
  "https://localhost:*/*",
  "http://127.0.0.1:*/*",
  "https://generativelanguage.googleapis.com/*"
]
```

---

## Data Flow (Updated)

```
1. Content script detects job posting
2. useLLMThread connects to thread:{jobId} port → receives INIT_STATE
3. ScorePopup sends SEND_PROMPT with prompt + variables
4. ThreadService renders Mustache templates, builds LangChain messages
5. model.stream() opens a streaming connection to the LLM
6. For each token chunk:
     assistantMsg.content += chunk
     broadcast STATE_UPDATE → useLLMThread updates React state → UI re-renders
7. Stream ends → status = 'idle' → final STATE_UPDATE broadcast
```

---

## Using LangChain Directly in a Content Script

For cases where you want to run a LangChain agent or chain entirely within the content script (e.g., tools that interact with the page DOM), use the proxy fetch and bypass the thread service:

```typescript
import { createStreamingProxiedFetch } from '../shared/proxy-fetch'
import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const llm = new ChatOpenAI({
  model: 'llama3',
  apiKey: 'ollama',
  configuration: {
    baseURL: 'http://localhost:11434/v1',
    fetch: createStreamingProxiedFetch(),
  },
})

const highlightTool = tool(
  async ({ selector }) => {
    // Can directly access the page DOM — we're in the content script
    document.querySelector(selector)?.classList.add('superfit-highlight')
    return 'highlighted'
  },
  {
    name: 'highlight_element',
    description: 'Highlight a DOM element on the page',
    schema: z.object({ selector: z.string() }),
  },
)

const agent = createReactAgent({ llm, tools: [highlightTool] })
```

The full agent loop — tool calls, retries, memory — runs in the content script. Only the raw HTTP to the LLM routes through the background proxy.

---

## Verification

- **Streaming:** Send a prompt via `useLLMThread`. The assistant message should grow character-by-character in the UI rather than appearing all at once.
- **Proxy fetch:** Instantiate a `ChatOpenAI` in the content script with `createStreamingProxiedFetch()`. Confirm requests to `localhost:11434` succeed on a page that would normally block them (check the Network panel in DevTools — the request should appear as a message to the extension, not a direct XHR).
- **Ollama `/v1`:** Verify Ollama responds correctly by hitting `http://localhost:11434/v1/models` directly in the browser.

---

## Future Improvements

- **Content script agent pattern** — formalize a `ContentScriptLLMService` that creates the model with the proxy fetch, mirroring `LLMService` in the background.
- **Gemini proxy support** — route Gemini calls through the proxy too, for pages with restrictive CSP on external origins.
- **Proxy fetch for `isAvailable` / `getAvailableModels`** — the provider availability checks currently use the global `fetch` in the background. If providers are ever used from content scripts, these methods will also need the proxy.

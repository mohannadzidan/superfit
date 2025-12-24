import { llmService } from '../../llm/service'
import { ThreadState, ThreadPortMessage, ThreadMessage } from '../../shared/messaging/thread-types'
import { resumeStorage } from '../../shared/storage/resume'
import { llmStorage } from '../../shared/storage/llm'
import { parseAndValidateScore } from '../../shared/scoring/parser'
import { JobPostingInfo } from '../../adapters/types'
import { CompletionRequest } from '../../llm/types'

export class ThreadService {
  private threads = new Map<string, ThreadState>()
  private ports = new Map<string, Set<chrome.runtime.Port>>()

  constructor() {
    this.setupPortListener()
  }

  private setupPortListener() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name.startsWith('thread:')) {
        const threadId = port.name.split(':')[1]
        this.handleConnection(threadId, port)
      }
    })
  }

  private handleConnection(threadId: string, port: chrome.runtime.Port) {
    // Add port to active set
    if (!this.ports.has(threadId)) {
      this.ports.set(threadId, new Set())
    }
    this.ports.get(threadId)!.add(port)

    // Send initial state
    const thread = this.getOrCreateThread(threadId)
    port.postMessage({ type: 'INIT_STATE', thread })

    // Listen for messages from UI
    port.onMessage.addListener(async (msg: ThreadPortMessage) => {
      if (msg.type === 'SEND_PROMPT') {
        await this.handleUserMessage(threadId, msg.variables, msg.messages, msg.tools)
      }
    })

    // Cleanup on disconnect
    port.onDisconnect.addListener(() => {
      const ports = this.ports.get(threadId)
      if (ports) {
        ports.delete(port)
        if (ports.size === 0) {
          this.ports.delete(threadId)
          // Optional: Verify if we want to keep thread in memory when no listeners
          // For now, we keep it for persistence across popup closes
        }
      }
    })
  }

  private getOrCreateThread(id: string): ThreadState {
    if (!this.threads.has(id)) {
      this.threads.set(id, {
        id,
        messages: [],
        status: 'idle',
        currentStreamContent: '',
        inputTokens: 0,
        outputTokens: 0,
      })
    }
    return this.threads.get(id)!
  }

  private broadcast(threadId: string, message: ThreadPortMessage) {
    const ports = this.ports.get(threadId)
    if (ports) {
      ports.forEach((port) => {
        try {
          port.postMessage(message)
        } catch (e) {
          console.warn('Failed to post to port', e)
        }
      })
    }
  }

  async handleUserMessage(
    threadId: string,
    variables: Record<string, string>,
    messages: Omit<ThreadMessage, 'timestamp'>[],
    tools?: CompletionRequest['tools'],
  ) {
    const thread = this.getOrCreateThread(threadId)

    // 1. Add User Message
    thread.messages.push(...messages.map((msg) => ({ ...msg, timestamp: Date.now() })))
    thread.currentToolCalls = undefined
    thread.currentStreamContent = ''
    thread.status = 'streaming'
    this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
    // 2. Call LLM

    try {
      await llmService.streamCompletion(
        {
          messages: thread.messages,
          // temperature: 0.1,
          variables,
          tools,
        },
        (chunk) => {
          thread.currentStreamContent += chunk.text
          if (chunk.tool_calls) {
            thread.currentToolCalls = thread.currentToolCalls ?? []
            thread.currentToolCalls.push(...chunk.tool_calls)
          }
          if (chunk.inputTokens) thread.inputTokens = chunk.inputTokens - thread.outputTokens
          if (chunk.outputTokens) thread.outputTokens += chunk.outputTokens
          this.broadcast(threadId, {
            type: 'STREAM_UPDATE',
            content: thread.currentStreamContent,
            tool_calls: thread.currentToolCalls,
          })
        },
      )
      // 3. Finalize
      const assistantMsg: ThreadMessage = {
        role: 'assistant',
        content: thread.currentStreamContent,
        tool_calls: thread.currentToolCalls,
        timestamp: Date.now(),
      }

      thread.messages.push(assistantMsg)
      thread.currentStreamContent = ''
      thread.status = 'idle'

      this.broadcast(threadId, { type: 'STREAM_DONE', finalMessage: assistantMsg })
      this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
    } catch (error) {
      console.error('Thread processing error:', error)
      thread.status = 'error'
      this.broadcast(threadId, {
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
    }
  }
}

export const threadService = new ThreadService()

import { llmService } from '../../llm/service'
import { agentRegistry } from '../../llm/agents/registry'
import { AgentEvent } from '../../llm/agents/types'
import { ThreadState, ThreadPortMessage, ThreadMessage } from '../../shared/messaging/thread-types'
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import Mustache from 'mustache'

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
    if (!this.ports.has(threadId)) {
      this.ports.set(threadId, new Set())
    }
    this.ports.get(threadId)!.add(port)

    const thread = this.getOrCreateThread(threadId)
    port.postMessage({ type: 'INIT_STATE', thread } satisfies ThreadPortMessage)

    port.onMessage.addListener(async (msg: ThreadPortMessage) => {
      if (msg.type === 'SEND_PROMPT') {
        await this.handleUserMessage(threadId, msg.variables, msg.messages, msg.agentId)
      }
    })

    port.onDisconnect.addListener(() => {
      const ports = this.ports.get(threadId)
      if (ports) {
        ports.delete(port)
        if (ports.size === 0) this.ports.delete(threadId)
      }
    })
  }

  private getOrCreateThread(id: string): ThreadState {
    if (!this.threads.has(id)) {
      this.threads.set(id, { id, messages: [], status: 'idle', inputTokens: 0, outputTokens: 0 })
    }
    return this.threads.get(id)!
  }

  private broadcast(threadId: string, message: ThreadPortMessage) {
    this.ports.get(threadId)?.forEach((port) => {
      try {
        port.postMessage(message)
      } catch (e) {
        console.warn('Failed to post to port', e)
      }
    })
  }

  async handleUserMessage(
    threadId: string,
    variables: Record<string, string>,
    messages: Omit<ThreadMessage, 'timestamp'>[],
    agentId?: string,
  ) {
    const thread = this.getOrCreateThread(threadId)

    thread.messages.push(...messages.map((msg) => ({ ...msg, timestamp: Date.now() })))
    thread.status = 'thinking'
    this.broadcast(threadId, { type: 'STATE_UPDATE', thread })

    try {
      const builtinVariables = await llmService.loadVariables()
      const allVariables = { ...builtinVariables, ...variables }
      const model = llmService.getModel()

      const assistantMsg: ThreadMessage = { role: 'assistant', content: '', timestamp: Date.now() }
      thread.messages.push(assistantMsg)

      const agent = agentId ? agentRegistry.getAgent(agentId) : null

      if (agent) {
        const langchainMessages: BaseMessage[] = thread.messages
          .filter((m) => m.role !== 'assistant' || m.content)
          .slice(0, -1) // exclude the empty assistant placeholder
          .map((msg) => {
            const content = Mustache.render(msg.content, allVariables)
            switch (msg.role) {
              case 'system':    return new SystemMessage(content)
              case 'user':      return new HumanMessage(content)
              case 'assistant': return new AIMessage(content)
            }
          })

        const eventStream = agent.run({ messages: langchainMessages, variables: allVariables }, model)
        for await (const event of eventStream) {
          this.handleAgentEvent(threadId, thread, assistantMsg, event)
        }
      } else {
        const langchainMessages: BaseMessage[] = thread.messages
          .slice(0, -1) // exclude the empty assistant placeholder
          .map((msg) => {
            const content = Mustache.render(msg.content, allVariables)
            switch (msg.role) {
              case 'system':    return new SystemMessage(content)
              case 'user':      return new HumanMessage(content)
              case 'assistant': return new AIMessage(content)
            }
          })

        const stream = await model.stream(langchainMessages)
        for await (const chunk of stream) {
          const text = typeof chunk.content === 'string' ? chunk.content : ''
          assistantMsg.content += text
          this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
        }
      }

      thread.status = 'idle'
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

  private handleAgentEvent(
    threadId: string,
    thread: ThreadState,
    assistantMsg: ThreadMessage,
    event: AgentEvent,
  ) {
    if (event.type === 'text') {
      assistantMsg.content += event.content
      this.broadcast(threadId, { type: 'STATE_UPDATE', thread })
    } else if (event.type === 'tool_result') {
      this.broadcast(threadId, { type: 'TOOL_RESULT', toolName: event.toolName, result: event.result })
    }
  }
}

export const threadService = new ThreadService()

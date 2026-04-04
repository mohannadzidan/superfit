import { useState, useEffect, useRef, useCallback } from 'react'
import { ThreadMessage, ThreadStatus, ThreadPortMessage } from '../messaging/thread-types'

export interface ThreadToolResult {
  toolName: string
  result: unknown
}

export function useLLMThread(threadId: string) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [status, setStatus] = useState<ThreadStatus | 'loading'>('loading')
  const [inputTokens, setInputTokens] = useState(0)
  const [outputTokens, setOutputTokens] = useState(0)
  const [toolResults, setToolResults] = useState<ThreadToolResult[]>([])
  const portRef = useRef<chrome.runtime.Port | null>(null)

  useEffect(() => {
    setStatus('loading')
    try {
      const port = chrome.runtime.connect({ name: `thread:${threadId}` })
      portRef.current = port
      port.onMessage.addListener((msg: ThreadPortMessage) => {
        if (msg.type === 'INIT_STATE' || msg.type === 'STATE_UPDATE') {
          setMessages(msg.thread.messages)
          setStatus(msg.thread.status)
          if (typeof msg.thread.inputTokens === 'number') setInputTokens(msg.thread.inputTokens)
          if (typeof msg.thread.outputTokens === 'number') setOutputTokens(msg.thread.outputTokens)
        } else if (msg.type === 'TOOL_RESULT') {
          setToolResults((prev) => [...prev, { toolName: msg.toolName, result: msg.result }])
        }
      })

      return () => {
        port.disconnect()
        portRef.current = null
      }
    } catch (e) {
      console.error('Failed to connect to thread port', e)
    }
  }, [threadId])

  const sendMessage = useCallback(
    (
      variables: Record<string, string>,
      messages: Omit<ThreadMessage, 'timestamp'>[],
      agentId?: string,
    ) => {
      if (portRef.current) {
        portRef.current.postMessage({
          type: 'SEND_PROMPT',
          agentId,
          variables,
          messages,
        } satisfies ThreadPortMessage)
      }
    },
    [],
  )

  return {
    messages,
    status,
    sendMessage,
    inputTokens,
    outputTokens,
    toolResults,
  }
}

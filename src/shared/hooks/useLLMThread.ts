import { useState, useEffect, useRef, useCallback } from 'react'
import { ThreadMessage, ThreadStatus, ThreadPortMessage } from '../messaging/thread-types'
import { CompletionRequest } from '../../llm/types'

export function useLLMThread(threadId: string) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [status, setStatus] = useState<ThreadStatus | 'loading'>('loading')
  const [inputTokens, setInputTokens] = useState(0)
  const [outputTokens, setOutputTokens] = useState(0)
  const portRef = useRef<chrome.runtime.Port | null>(null)

  useEffect(() => {
    // Connect to specific thread channel
    setStatus('loading')
    try {
      const port = chrome.runtime.connect({ name: `thread:${threadId}` })
      portRef.current = port
      port.onMessage.addListener((msg: ThreadPortMessage) => {
        // console.log(msg)
        if (msg.type === 'INIT_STATE' || msg.type === 'STATE_UPDATE') {
          setMessages(msg.thread.messages)
          setStatus(msg.thread.status)
          if (msg.thread.status !== 'idle') setStreamingContent(msg.thread.currentStreamContent)
          if (typeof msg.thread.inputTokens === 'number') setInputTokens(msg.thread.inputTokens)
          if (typeof msg.thread.outputTokens === 'number') setOutputTokens(msg.thread.outputTokens)
        }
        if (msg.type === 'STREAM_UPDATE') {
          setStreamingContent(msg.content)
        }
        if (msg.type === 'STREAM_DONE') {
          // handled by STATE_UPDATE usually, but good to have
          // setStreamingContent(msg.finalMessage.content)
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
      tools?: CompletionRequest['tools'],
    ) => {
      if (portRef.current) {
        portRef.current.postMessage({
          type: 'SEND_PROMPT',
          variables,
          messages,
          tools,
        } satisfies ThreadPortMessage)
      }
    },
    [],
  )
  console.log('useLLMThread', {
    inputTokens,
    outputTokens,
  })
  return {
    messages,
    streamingContent,
    status,
    sendMessage,
    inputTokens,
    outputTokens,
  }
}

import type { ChatRequest, ToolCall } from 'ollama'

export interface ThreadMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: ToolCall[]
  timestamp: number
}

export type ThreadStatus = 'idle' | 'streaming' | 'error'

export interface ThreadState {
  id: string
  messages: ThreadMessage[]
  status: ThreadStatus
  currentStreamContent: string
  currentToolCalls?: ToolCall[]
  inputTokens: number
  outputTokens: number
}

// Messages exchanged over the Port
export type ThreadPortMessage =
  | { type: 'INIT_STATE'; thread: ThreadState }
  | { type: 'STATE_UPDATE'; thread: ThreadState }
  | { type: 'STREAM_UPDATE'; content: string; tool_calls?: ToolCall[] }
  | { type: 'STREAM_DONE'; finalMessage: ThreadMessage }
  | {
      type: 'SEND_PROMPT'
      messages: Omit<ThreadMessage, 'timestamp'>[]
      tools?: ChatRequest['tools']
      variables: Record<string, string>
    }
  | { type: 'FIT_RESULT'; result: any }
  | { type: 'ERROR'; error: string }

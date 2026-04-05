export interface ThreadMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export type ThreadStatus = 'idle' | 'thinking' | 'error'

export interface ThreadState {
  id: string
  messages: ThreadMessage[]
  status: ThreadStatus
  inputTokens: number
  outputTokens: number
}

export type ThreadPortMessage =
  | { type: 'INIT_STATE'; thread: ThreadState }
  | { type: 'STATE_UPDATE'; thread: ThreadState }
  | { type: 'SET_BADGE'; badge: { text: string } }
  | {
      type: 'SEND_PROMPT'
      /** Optional agent to use for this prompt. Omit for plain model chat. */
      agentId?: string
      messages: Omit<ThreadMessage, 'timestamp'>[]
      variables: Record<string, string>
    }
  | { type: 'TOOL_RESULT'; toolName: string; result: unknown }
  | { type: 'ERROR'; error: string }

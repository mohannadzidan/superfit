import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { StructuredTool } from '@langchain/core/tools'
import type { BaseMessage } from '@langchain/core/messages'
import type { AgentEvent } from './types'

/**
 * Creates a LangGraph ReAct agent and streams its events as AgentEvents.
 * Text tokens from the LLM and tool results are both yielded.
 */
export async function* runReactAgent(
  model: BaseChatModel,
  tools: StructuredTool[],
  systemPrompt: string,
  messages: BaseMessage[],
): AsyncGenerator<AgentEvent> {
  const agent = createReactAgent({ llm: model, tools, prompt: systemPrompt })

  const stream = (await agent.stream({ messages }, { streamMode: 'messages' })) as AsyncIterable<
    [AIMessageChunk | ToolMessage, Record<string, unknown>]
  >

  for await (const [chunk] of stream) {
    if (chunk instanceof AIMessageChunk) {
      if (typeof chunk.content === 'string' && chunk.content) {
        yield { type: 'text', content: chunk.content }
      }
    } else if (chunk instanceof ToolMessage) {
      try {
        const result = JSON.parse(chunk.content as string)
        yield { type: 'tool_result', toolName: chunk.name ?? 'unknown', result }
      } catch {
        // non-JSON tool result, skip
      }
    }
  }
}

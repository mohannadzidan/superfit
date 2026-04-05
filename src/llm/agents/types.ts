import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";

export interface AgentInput {
  /** Conversation messages (system prompt is owned by the agent, not included here) */
  messages: BaseMessage[];
  /** Template variables available to the agent's system prompt */
  variables: Record<string, string>;
}

export type AgentEvent =
  | { type: "text"; content: string }
  /** Emitted when the model successfully calls a tool and receives a result */
  | { type: "tool_result"; toolName: string; result: unknown };

export interface Agent {
  readonly agentId: string;
  readonly agentName: string;
  readonly tools: StructuredTool[];
  run(input: AgentInput, model: BaseChatModel): AsyncGenerator<AgentEvent>;
}

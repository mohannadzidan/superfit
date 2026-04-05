import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import Mustache from "mustache";
import type { Agent, AgentEvent, AgentInput } from "../types";
import { runReactAgent } from "../utils";
import { FILL_FIELD_SYSTEM_PROMPT } from "./prompts";
export interface FillFieldResult {
  value: string;
}

const suggestFieldValue = tool(async (input) => JSON.stringify(input), {
  name: "suggest_field_value",
  description: "Provide the text value to fill in the form field.",
  schema: z.object({
    value: z.string().describe("The text to fill in the form field"),
  }),
});

export class FillFieldAgent implements Agent {
  readonly agentId = "fill-field";
  readonly agentName = "Field Filler";
  readonly tools = [suggestFieldValue];

  async *run(input: AgentInput, model: BaseChatModel): AsyncGenerator<AgentEvent> {
    const systemPrompt = Mustache.render(FILL_FIELD_SYSTEM_PROMPT, input.variables);
    yield* runReactAgent(model, this.tools, systemPrompt, input.messages);
  }
}

export const fillFieldAgent = new FillFieldAgent();

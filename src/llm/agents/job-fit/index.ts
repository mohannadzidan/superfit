import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import Mustache from "mustache";
import type { Agent, AgentEvent, AgentInput } from "../types";
import { runReactAgent } from "../utils";
import { JOB_FIT_SYSTEM_PROMPT } from "./prompts";

export interface JobFitResult {
  score: number;
  reasoning: string;
  highlights: string[];
  gaps: string[];
}

const reportJobFit = tool(async (input) => JSON.stringify(input), {
  name: "report_job_fit",
  description:
    "Report the structured job fit result. Call this once after completing your analysis.",
  schema: z.object({
    score: z.number().min(0).max(100).describe("Fit score from 0 to 100"),
    reasoning: z.string().describe("One-sentence summary of the overall fit"),
    highlights: z.array(z.string()).describe("Specific skills or experiences that match the role"),
    gaps: z.array(z.string()).describe("Required skills or experience that are missing or weak"),
  }),
});

export class JobFitAgent implements Agent {
  readonly agentId = "job-fit";
  readonly agentName = "Job Fit Analyzer";
  readonly tools = [reportJobFit];

  async *run(input: AgentInput, model: BaseChatModel): AsyncGenerator<AgentEvent> {
    const systemPrompt = Mustache.render(JOB_FIT_SYSTEM_PROMPT, input.variables);
    yield* runReactAgent(model, this.tools, systemPrompt, input.messages);
  }
}

export const jobFitAgent = new JobFitAgent();

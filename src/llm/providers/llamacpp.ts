import { ChatOpenAI } from "@langchain/openai";
import { LangChainProvider, LLMModel, ProviderConfigSchema } from "./types";

interface OpenAIModelsResponse {
  data: Array<{ id: string; object: string }>;
}

export class LlamaCppProvider implements LangChainProvider {
  readonly providerId = "llamacpp";
  readonly providerName = "llama.cpp (Local)";
  private serverUrl = "http://localhost:8080";

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.serverUrl === "string") {
      this.serverUrl = config.serverUrl.replace(/\/$/, "");
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: "serverUrl",
          label: "Server URL",
          type: "url",
          required: true,
          defaultValue: "http://localhost:8080",
          description: "URL where llama.cpp server (llama-server) is running",
        },
      ],
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.serverUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.serverUrl}/v1/models`);
      if (!response.ok) throw new Error(`llama.cpp API error: ${response.statusText}`);
      const data = (await response.json()) as OpenAIModelsResponse;
      return data.data.map((m) => ({ modelId: m.id, displayName: m.id }));
    } catch (error) {
      console.error("Failed to fetch llama.cpp models:", error);
      return [];
    }
  }

  createModel(modelId: string, options?: { fetch?: typeof globalThis.fetch }): ChatOpenAI {
    return new ChatOpenAI({
      model: modelId,
      temperature: 0.7,
      apiKey: "not-needed",
      configuration: {
        baseURL: `${this.serverUrl}/v1`,
        ...(options?.fetch ? { fetch: options.fetch } : {}),
      },
    });
  }
}

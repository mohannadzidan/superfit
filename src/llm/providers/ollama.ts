import { LLMProvider, LLMModel, CompletionRequest, CompletionResponse, ProviderConfigSchema } from '../types';

interface OllamaConfig {
  serverUrl: string;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export class OllamaProvider implements LLMProvider {
  readonly providerId = 'ollama';
  readonly providerName = 'Ollama (Local)';
  
  private config: OllamaConfig = {
    serverUrl: 'http://localhost:11434'
  };

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.serverUrl === 'string') {
      // Remove trailing slash if present
      this.config.serverUrl = config.serverUrl.replace(/\/$/, '');
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'serverUrl',
          label: 'Server URL',
          type: 'url',
          required: true,
          defaultValue: 'http://localhost:11434',
          description: 'URL where Ollama is running locally'
        }
      ]
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for availability check

      const response = await fetch(`${this.config.serverUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
       console.log('Ollama isAvailable check failed:', error);
       return false;
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaTagsResponse;
      
      return data.models.map(model => ({
        modelId: model.name,
        displayName: model.name,
        description: `Size: ${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB`
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const body = {
        model: request.model,
        prompt: request.prompt,
        system: request.systemPrompt,
        stream: false,
        options: {
          temperature: request.temperature
        }
      };

      const response = await fetch(`${this.config.serverUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama generation error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaGenerateResponse;

      return {
        text: data.response,
        model: data.model,
        success: true
      };
    } catch (error) {
      return {
        text: '',
        model: request.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during generation'
      };
    }
  }
}

import { GoogleGenAI } from '@google/genai';
import { LLMProvider, LLMModel, CompletionRequest, CompletionResponse, ProviderConfigSchema } from '../types';

interface OllamaConfig {
 apiKey?: string,
}


interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export class GeminiProvider implements LLMProvider {
  readonly providerId = 'gemini';
  readonly providerName = 'Gemini';
  private  ai = new GoogleGenAI({ apiKey: '' });
  private config: OllamaConfig = {
    apiKey: undefined
  };

  async configure(config: Record<string, unknown>): Promise<void> {
    if (typeof config.apiKey === 'string') {
      // Remove trailing slash if present
      this.config.apiKey = config.apiKey.replace(/\/$/, '');
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });  
    }
  }

  getConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          defaultValue: '',
          description: 'API Key for Google GenAI'
        }
      ]
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }
     try {
      const response = await this.ai.models.list();
      return true ;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response = await this.ai.models.list();
      return response.page.map(model => ({
        modelId: model.name ?? "Unknown",
        displayName: model.name ?? "Unknown",
        description: model.description ?? ""
      }));
    } catch (error) {
      console.error('Failed to fetch gemini models:', error);
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
        format: request.format, // Pass format if specified
        options: {
          temperature: request.temperature
        }
      };

      const response = await this.ai.models.generateContent({
        model: request.model,
        contents:[ {
          role: 'model',
          parts: [{
            text: request.systemPrompt  
          }]
        }, {
          role: 'user',
          parts: [{
            text: request.prompt  
          }]
        }]
      });

      return {
        text: response.text ?? "",
        model: response.modelVersion ?? "",
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

export interface StoredLLMConfig {
  providerId: string;
  modelId: string;
  jsonStrategy: 'native' | 'extract' | 'two-stage'; // New field
  providerConfigs: {
    [providerId: string]: Record<string, unknown>;
  };
  updatedAt: string;
}

const LLM_CONFIG_KEY = 'llm_config';

export const llmStorage = {
  async getConfig(): Promise<StoredLLMConfig | null> {
    const result = await chrome.storage.local.get(LLM_CONFIG_KEY);
    return result[LLM_CONFIG_KEY] || null;
  },

  async saveConfig(config: StoredLLMConfig): Promise<void> {
    await chrome.storage.local.set({ [LLM_CONFIG_KEY]: config });
  },

  async updateProviderConfig(providerId: string, settings: Record<string, unknown>): Promise<void> {
    const current = await this.getConfig();
    const now = new Date().toISOString();
    
    if (current) {
      current.providerConfigs[providerId] = settings;
      current.updatedAt = now;
      await this.saveConfig(current);
    } else {
      await this.saveConfig({
        providerId: 'ollama', // Default
        modelId: '',
        jsonStrategy: 'extract', // Default strategy
        providerConfigs: {
          [providerId]: settings
        },
        updatedAt: now
      });
    }
  },

  async setActiveModel(providerId: string, modelId: string, jsonStrategy: 'native' | 'extract' | 'two-stage' = 'extract'): Promise<void> {
    const current = await this.getConfig();
    const now = new Date().toISOString();

    if (current) {
      current.providerId = providerId;
      current.modelId = modelId;
      current.jsonStrategy = jsonStrategy;
      current.updatedAt = now;
      await this.saveConfig(current);
    } else {
      await this.saveConfig({
        providerId,
        modelId,
        jsonStrategy,
        providerConfigs: {},
        updatedAt: now
      });
    }
  }
};

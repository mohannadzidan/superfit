import { llmService } from '../llm/service';
import { providerRegistry } from '../llm/registry';
import { OllamaProvider } from '../llm/providers/ollama';  // Import to ensure registration
import { LLMMessage } from '../shared/messaging/types';

console.log('SuperFit background service worker started');

// Ensure Ollama provider is registered (service imports registry which registers it, but explicit checks help)
if (!providerRegistry.getProvider('ollama')) {
  providerRegistry.register(new OllamaProvider());
}

// Initialize service
llmService.initialize().catch(err => console.error('LLM Service Init Error:', err));

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request: LLMMessage) {
  if (request.type === 'TEST_LLM_CONNECTION') {
    const { providerId, config } = request.payload;
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` };
    }

    try {
      // Temporarily configure a fresh instance or the existing one?
      // For testing connection settings *before* saving, we should probably check using the config provided.
      // However, our provider pattern updates the instance. 
      // Let's assume we update the singleton for the check, but maybe revert if we wanted strict purity.
      // For MVP, updating the instance is fine as long as the user intends to configure it.
      
      await provider.configure(config);
      const isAvailable = await provider.isAvailable();
      
      return isAvailable 
        ? { success: true }
        : { success: false, error: 'Connection failed. Check URL and ensure server is running.' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  if (request.type === 'GET_LLM_MODELS') {
    const { providerId } = request.payload;
    const provider = providerRegistry.getProvider(providerId);

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` };
    }

    try {
      // Ensure it is configured (it might have been initialized from storage)
      // If config passed in payload (optional), use it
      if (request.payload.config) {
        await provider.configure(request.payload.config);
      }

      const models = await provider.getAvailableModels();
      return { success: true, models };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch models' };
    }
  }

  return { success: false, error: 'Unknown message type' };
}

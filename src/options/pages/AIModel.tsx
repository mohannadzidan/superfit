import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, Snackbar, Alert, Typography, Divider } from '@mui/material';
import { ProviderSelector } from '../components/ProviderSelector';
import { ProviderConfigForm } from '../components/ProviderConfigForm';
import { ModelSelector } from '../components/ModelSelector';
import { ProviderRegistry } from '../../llm/registry';
import { OllamaProvider } from '../../llm/providers/ollama';
import { llmStorage } from '../../shared/storage/llm';
import { LLMModel, ProviderConfigSchema } from '../../llm/types';
import { TestConnectionResponse, GetModelsResponse } from '../../shared/messaging/types';

// Registry is singleton in context, but for Options page we might want 
// to re-instantiate or share state. Since this is a separate page entity from Background,
// we re-register providers here for UI helper purposes (like getting schema).
// The actual storage and connection tests go through BG or direct if simpler.
// Design doc said BG messages, but LLM Provider is also client-side compatible for localhost?
// "Phase 5: Background script message handlers" implies using messages.
// However, 'ollama' is local, so options page CAN reach it directly usually.
// But to respect valid architecture, let's try direct first for simplicity or messaging if blocked.
// Chrome extensions allow localhost fetch from options page.

const registry = new ProviderRegistry();
registry.register(new OllamaProvider());

export const AIModel = () => {
  const [providers, setProviders] = useState(registry.getAllProviders());
  const [selectedProviderId, setSelectedProviderId] = useState<string>('ollama');
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking' | 'idle'>('idle');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error' | null>(null);

  const activeProvider = registry.getProvider(selectedProviderId);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const stored = await llmStorage.getConfig();
    if (stored) {
      setSelectedProviderId(stored.providerId);
      setSelectedModelId(stored.modelId);
      if (stored.providerConfigs[stored.providerId]) {
         setConfigValues(stored.providerConfigs[stored.providerId]);
      }
      
      // If we have config, try to auto-fetch models
      if (stored.providerId) {
         // Don't auto-test connection to avoid flashing error on load, 
         // but maybe try silent fetch models
         refreshModels(stored.providerId, stored.providerConfigs[stored.providerId]);
      }
    } else {
        // Defaults
        const defaultProvider = providers[0];
        if (defaultProvider) {
            setSelectedProviderId(defaultProvider.providerId);
            // Function to get default config from schema? 
            const schema = defaultProvider.getConfigSchema();
            const defaults: Record<string, unknown> = {};
            schema.fields.forEach(f => {
                if(f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
            });
            setConfigValues(defaults);
        }
    }
  };

  const refreshModels = async (providerId: string, config: Record<string, unknown>) => {
    setModelsLoading(true);
    try {
        // Use messaging to background to ensure consistency
        const response = await chrome.runtime.sendMessage({
            type: 'GET_LLM_MODELS',
            payload: { providerId, config }
        }) as GetModelsResponse;

        if (response.success && response.models) {
            setModels(response.models);
            setConnectionStatus('connected');
        } else {
            setConnectionStatus('disconnected');
            setModels([]);
        }
    } catch (e) {
        console.error(e);
        setConnectionStatus('disconnected');
    } finally {
        setModelsLoading(false);
    }
  };

  const handleProviderSelect = (id: string) => {
    setSelectedProviderId(id);
    const provider = registry.getProvider(id);
    if (provider) {
       // Reset config to defaults if empty
       // In a real app we might load saved config for this specific provider if existed
    }
    setModels([]);
    setSelectedModelId('');
    setConnectionStatus('idle');
  };

  const handleTestConnection = async (): Promise<boolean> => {
    setConnectionStatus('checking');
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'TEST_LLM_CONNECTION',
            payload: { providerId: selectedProviderId, config: configValues }
        }) as TestConnectionResponse;

        if (response.success) {
            setConnectionStatus('connected');
            refreshModels(selectedProviderId, configValues);
            return true;
        } else {
            setConnectionStatus('disconnected');
            return false;
        }
    } catch (e) {
        setConnectionStatus('disconnected');
        return false;
    }
  };

  const handleSave = async () => {
    try {
        await llmStorage.updateProviderConfig(selectedProviderId, configValues);
        await llmStorage.setActiveModel(selectedProviderId, selectedModelId);
        setSaveStatus('saved');
    } catch (e) {
        setSaveStatus('error');
    }
  };

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h5" gutterBottom>AI Model Configuration</Typography>
      <Divider sx={{ mb: 4 }} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <ProviderSelector 
            providers={providers}
            selectedProviderId={selectedProviderId}
            onSelect={handleProviderSelect}
        />

        {activeProvider && (
            <ProviderConfigForm 
                schema={activeProvider.getConfigSchema()}
                values={configValues}
                onChange={setConfigValues}
                onTestConnection={handleTestConnection}
                connectionStatus={connectionStatus}
            />
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <ModelSelector 
            models={models}
            selectedModelId={selectedModelId}
            onSelect={setSelectedModelId}
            onRefresh={() => refreshModels(selectedProviderId, configValues)}
            isLoading={modelsLoading}
            disabled={connectionStatus !== 'connected'}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
                variant="contained" 
                size="large"
                onClick={handleSave}
                disabled={!selectedModelId || connectionStatus !== 'connected'}
            >
                Save Configuration
            </Button>
        </Box>
      </Paper>

      <Snackbar 
        open={saveStatus === 'saved'} 
        autoHideDuration={3000} 
        onClose={() => setSaveStatus(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success">Configuration saved successfully!</Alert>
      </Snackbar>
    </Box>
  );
};

import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, Snackbar, Alert, Typography, Divider, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, FormHelperText } from '@mui/material';
import { ProviderSelector } from '../components/ProviderSelector';
import { ProviderConfigForm } from '../components/ProviderConfigForm';
import { ModelSelector } from '../components/ModelSelector';
import { ProviderRegistry } from '../../llm/registry';
import { OllamaProvider } from '../../llm/providers/ollama';
import { llmStorage } from '../../shared/storage/llm';
import { LLMModel } from '../../llm/types';
import { TestConnectionResponse, GetModelsResponse } from '../../shared/messaging/types';

const registry = new ProviderRegistry();
registry.register(new OllamaProvider());

export const AIModel = () => {
  const [providers] = useState(registry.getAllProviders());
  const [selectedProviderId, setSelectedProviderId] = useState<string>('ollama');
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [jsonStrategy, setJsonStrategy] = useState<'native' | 'extract' | 'two-stage'>('extract');
  
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
      setJsonStrategy(stored.jsonStrategy || 'extract');
      if (stored.providerConfigs[stored.providerId]) {
         setConfigValues(stored.providerConfigs[stored.providerId]);
      }
      
      if (stored.providerId) {
         refreshModels(stored.providerId, stored.providerConfigs[stored.providerId]);
      }
    } else {
        const defaultProvider = providers[0];
        if (defaultProvider) {
            setSelectedProviderId(defaultProvider.providerId);
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
        await llmStorage.setActiveModel(selectedProviderId, selectedModelId, jsonStrategy);
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

        <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Output Strategy</Typography>
            <FormControl fullWidth disabled={connectionStatus !== 'connected'}>
                <InputLabel id="json-strategy-label">JSON Strategy</InputLabel>
                <Select
                    labelId="json-strategy-label"
                    value={jsonStrategy}
                    label="JSON Strategy"
                    onChange={(e: SelectChangeEvent) => setJsonStrategy(e.target.value as any)}
                >
                    <MenuItem value="native">
                        <Box>
                            <Typography variant="body1">Native (JSON Mode)</Typography>
                            <Typography variant="caption" color="text.secondary">Use provider's native JSON capability (e.g. Ollama format: "json")</Typography>
                        </Box>
                    </MenuItem>
                    <MenuItem value="extract">
                         <Box>
                            <Typography variant="body1">Extraction (Robust)</Typography>
                            <Typography variant="caption" color="text.secondary">Allow free text, then extract JSON block via regex</Typography>
                        </Box>
                    </MenuItem>
                    <MenuItem value="two-stage">
                         <Box>
                            <Typography variant="body1">Two-Stage (Think & Transform)</Typography>
                            <Typography variant="caption" color="text.secondary">Generate reasoning first, then transform to JSON (slower, higher quality)</Typography>
                        </Box>
                    </MenuItem>
                </Select>
                <FormHelperText>Choose how the model produces structured data</FormHelperText>
            </FormControl>
        </Box>
        
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

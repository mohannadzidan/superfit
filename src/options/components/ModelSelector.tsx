import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LLMModel } from '../../llm/types';

interface ModelSelectorProps {
  models: LLMModel[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelect,
  onRefresh,
  isLoading,
  disabled
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Model Selection
      </Typography>
      
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl fullWidth disabled={disabled || isLoading}>
          <InputLabel id="model-select-label">Model</InputLabel>
          <Select
            labelId="model-select-label"
            id="model-select"
            value={selectedModelId}
            label="Model"
            onChange={(e: SelectChangeEvent) => onSelect(e.target.value)}
          >
            {models.map((model) => (
              <MenuItem key={model.modelId} value={model.modelId}>
                <Box>
                  <Typography variant="body1">{model.displayName}</Typography>
                  {model.description && (
                    <Typography variant="caption" color="text.secondary">
                      {model.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          onClick={onRefresh}
          disabled={disabled || isLoading}
          sx={{ height: 56, minWidth: 56 }}
        >
          {isLoading ? <CircularProgress size={24} /> : <RefreshIcon />}
        </Button>
      </Stack>
      
      {disabled && !isLoading && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Connect to a provider to see available models.
        </Typography>
      )}
    </Box>
  );
};

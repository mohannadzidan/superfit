import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';
import { LLMProvider } from '../../llm/types';

interface ProviderSelectorProps {
  providers: LLMProvider[];
  selectedProviderId: string;
  onSelect: (providerId: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({ 
  providers, 
  selectedProviderId, 
  onSelect 
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onSelect(event.target.value as string);
  };

  return (
    <Box sx={{ minWidth: 120, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Provider Selection
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="provider-select-label">LLM Provider</InputLabel>
        <Select
          labelId="provider-select-label"
          id="provider-select"
          value={selectedProviderId}
          label="LLM Provider"
          onChange={handleChange}
        >
          {providers.map((provider) => (
            <MenuItem key={provider.providerId} value={provider.providerId}>
              {provider.providerName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

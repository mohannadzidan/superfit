import React, { useState, useEffect } from "react";
import { TextField, Button, Box, Typography, Alert, Stack } from "@mui/material";
import { ProviderConfigSchema } from "../../llm/types";

interface ProviderConfigFormProps {
  schema: ProviderConfigSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onTestConnection: () => Promise<boolean>;
  connectionStatus: "connected" | "disconnected" | "checking" | "idle";
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  schema,
  values,
  onChange,
  onTestConnection,
  connectionStatus,
}) => {
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleChange = (key: string, value: string) => {
    const newValues = { ...localValues, [key]: value };
    setLocalValues(newValues);
    onChange(newValues);
  };

  const handleTest = async () => {
    await onTestConnection();
  };

  return (
    <Box sx={{ mb: 4, p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
      <Typography variant="subtitle1" gutterBottom>
        Configuration
      </Typography>

      <Stack spacing={3}>
        {schema.fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            type={field.type}
            value={localValues[field.key] || field.defaultValue || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            helperText={field.description}
            fullWidth
            required={field.required}
            variant="outlined"
          />
        ))}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleTest}
            disabled={connectionStatus === "checking"}
          >
            {connectionStatus === "checking" ? "Checking..." : "Test Connection"}
          </Button>

          {connectionStatus === "connected" && (
            <Alert severity="success" sx={{ py: 0, px: 2 }}>
              Connected
            </Alert>
          )}
          {connectionStatus === "disconnected" && (
            <Alert severity="error" sx={{ py: 0, px: 2 }}>
              Connection Failed
            </Alert>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { routerStorage } from '../../shared/storage/router-storage'
import type { StoredProvider } from '../../shared/storage/router-storage'
import type { ProviderType } from '../../llm/router/router-types'
import type { ProviderConfigField } from '../../llm/types'

interface ProviderTypeInfo {
  type: ProviderType
  name: string
  configSchema: { fields: ProviderConfigField[] }
}

const PROVIDER_TYPES: ProviderType[] = ['ollama', 'llamacpp', 'gemini', 'groq', 'openai-compat']

const EMPTY_DIALOG: {
  open: boolean
  editing: StoredProvider | null
  id: string
  providerType: ProviderType
  config: Record<string, unknown>
  testStatus: 'idle' | 'checking' | 'ok' | 'fail'
  testError: string
} = {
  open: false,
  editing: null,
  id: '',
  providerType: 'ollama',
  config: {},
  testStatus: 'idle',
  testError: '',
}

export const ProvidersPage = () => {
  const [providers, setProviders] = useState<StoredProvider[]>([])
  const [providerTypeInfos, setProviderTypeInfos] = useState<ProviderTypeInfo[]>([])
  const [dialog, setDialog] = useState(EMPTY_DIALOG)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const stored = await routerStorage.getProviders()
    setProviders(stored)
  }, [])

  useEffect(() => {
    load()
    // Fetch provider type schemas from background
    chrome.runtime
      .sendMessage({ type: 'LIST_PROVIDER_TYPES' })
      .then((resp: { success: boolean; providerTypes?: ProviderTypeInfo[] }) => {
        if (resp?.success && resp.providerTypes) {
          setProviderTypeInfos(resp.providerTypes)
        }
      })
      .catch(console.error)
  }, [load])

  const openAdd = () =>
    setDialog({
      ...EMPTY_DIALOG,
      open: true,
      editing: null,
      providerType: 'ollama',
      config: {},
    })

  const openEdit = (p: StoredProvider) =>
    setDialog({
      open: true,
      editing: p,
      id: p.id,
      providerType: p.providerType,
      config: { ...p.config },
      testStatus: 'idle',
      testError: '',
    })

  const closeDialog = () => setDialog(EMPTY_DIALOG)

  const schemaForType = (type: ProviderType) =>
    providerTypeInfos.find((i) => i.type === type)?.configSchema ?? { fields: [] }

  const nameForType = (type: ProviderType) =>
    providerTypeInfos.find((i) => i.type === type)?.name ?? type

  const handleSave = async () => {
    if (!dialog.id.trim()) return
    const provider: StoredProvider = {
      id: dialog.id.trim(),
      providerType: dialog.providerType,
      config: dialog.config,
    }
    await routerStorage.upsertProvider(provider)
    await load()
    closeDialog()
  }

  const handleDelete = async (id: string) => {
    await routerStorage.deleteProvider(id)
    await load()
    setDeleteConfirm(null)
  }

  const handleTest = async () => {
    setDialog((d) => ({ ...d, testStatus: 'checking', testError: '' }))
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'TEST_PROVIDER_CONNECTION',
        payload: { providerType: dialog.providerType, config: dialog.config },
      })
      if (resp?.success) {
        setDialog((d) => ({ ...d, testStatus: 'ok' }))
      } else {
        setDialog((d) => ({ ...d, testStatus: 'fail', testError: resp?.error ?? 'Failed' }))
      }
    } catch (err) {
      setDialog((d) => ({ ...d, testStatus: 'fail', testError: String(err) }))
    }
  }

  const activeSchema = schemaForType(dialog.providerType)

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Providers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Provider
        </Button>
      </Box>

      {providers.length === 0 && (
        <Alert severity="info">
          No providers configured. Add a provider to get started.
        </Alert>
      )}

      <Stack spacing={2}>
        {providers.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {p.id}
                </Typography>
                <Chip label={nameForType(p.providerType)} size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Type: {p.providerType}
              </Typography>
            </CardContent>
            <CardActions>
              <IconButton size="small" onClick={() => openEdit(p)} title="Edit">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteConfirm(p.id)}
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Stack>

      {/* Add / Edit dialog */}
      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.editing ? `Edit Provider: ${dialog.editing.id}` : 'Add Provider'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Provider ID"
              value={dialog.id}
              onChange={(e) => setDialog((d) => ({ ...d, id: e.target.value }))}
              disabled={!!dialog.editing}
              required
              helperText={dialog.editing ? 'ID cannot be changed' : 'Unique name, e.g. "my-groq"'}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Provider Type</InputLabel>
              <Select
                value={dialog.providerType}
                label="Provider Type"
                onChange={(e) =>
                  setDialog((d) => ({
                    ...d,
                    providerType: e.target.value as ProviderType,
                    config: {},
                    testStatus: 'idle',
                  }))
                }
              >
                {PROVIDER_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {nameForType(t)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {activeSchema.fields.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2">Configuration</Typography>
                {activeSchema.fields.map((field) => (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={(dialog.config[field.key] as string) ?? ''}
                    onChange={(e) =>
                      setDialog((d) => ({
                        ...d,
                        config: { ...d.config, [field.key]: e.target.value },
                      }))
                    }
                    helperText={field.description}
                    required={field.required}
                    fullWidth
                  />
                ))}
              </>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleTest}
                disabled={dialog.testStatus === 'checking'}
                startIcon={dialog.testStatus === 'checking' ? <CircularProgress size={16} /> : undefined}
              >
                Test Connection
              </Button>
              {dialog.testStatus === 'ok' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2">Connected</Typography>
                </Box>
              )}
              {dialog.testStatus === 'fail' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
                  <ErrorIcon fontSize="small" />
                  <Typography variant="body2">{dialog.testError || 'Failed'}</Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!dialog.id.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Provider</DialogTitle>
        <DialogContent>
          <Typography>
            Delete provider <strong>{deleteConfirm}</strong>? This does not remove models or routers
            referencing it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

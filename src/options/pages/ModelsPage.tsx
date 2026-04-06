import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { routerStorage } from '../../shared/storage/router-storage'
import type { StoredModel, StoredProvider } from '../../shared/storage/router-storage'
import type { LLMModel } from '../../llm/types'

const EMPTY_DIALOG: {
  open: boolean
  editing: StoredModel | null
  id: string
  providerId: string
  modelId: string
  name: string
  fetchedModels: LLMModel[]
  fetchingModels: boolean
  supportsSearch: boolean
  modelInputValue: string
} = {
  open: false,
  editing: null,
  id: '',
  providerId: '',
  modelId: '',
  name: '',
  fetchedModels: [],
  fetchingModels: false,
  supportsSearch: false,
  modelInputValue: '',
}

export const ModelsPage = () => {
  const [models, setModels] = useState<StoredModel[]>([])
  const [providers, setProviders] = useState<StoredProvider[]>([])
  const [dialog, setDialog] = useState(EMPTY_DIALOG)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [m, p] = await Promise.all([routerStorage.getModels(), routerStorage.getProviders()])
    setModels(m)
    setProviders(p)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => setDialog({ ...EMPTY_DIALOG, open: true })
  const openEdit = (m: StoredModel) => {
    setDialog({
      open: true,
      editing: m,
      id: m.id,
      providerId: m.providerId,
      modelId: m.modelId,
      modelInputValue: m.modelId,
      name: m.name,
      fetchedModels: [],
      fetchingModels: false,
      supportsSearch: false,
    })
    fetchModels(m.providerId)
  }
  const closeDialog = () => setDialog(EMPTY_DIALOG)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchModels = async (providerId: string, query?: string) => {
    const provider = providers.find((p) => p.id === providerId)
    if (!provider) return
    setDialog((d) => ({ ...d, fetchingModels: true }))
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'GET_PROVIDER_MODELS',
        payload: { providerType: provider.providerType, config: provider.config, query },
      })
      if (resp?.success && resp.models) {
        setDialog((d) => ({
          ...d,
          fetchedModels: resp.models,
          fetchingModels: false,
          supportsSearch: resp.supportsSearch ?? d.supportsSearch,
        }))
      } else {
        setDialog((d) => ({ ...d, fetchingModels: false }))
      }
    } catch {
      setDialog((d) => ({ ...d, fetchingModels: false }))
    }
  }

  const handleProviderChange = (providerId: string) => {
    setDialog((d) => ({ ...d, providerId, modelId: '', modelInputValue: '', fetchedModels: [], supportsSearch: false }))
    if (providerId) fetchModels(providerId)
  }

  const handleModelInputChange = (_: unknown, value: string) => {
    setDialog((d) => ({ ...d, modelInputValue: value }))
    if (!dialog.supportsSearch) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      fetchModels(dialog.providerId, value)
    }, 400)
  }

  const handleSave = async () => {
    const effectiveModelId = dialog.modelId.trim() || dialog.modelInputValue.trim()
    if (!dialog.id.trim() || !dialog.providerId || !effectiveModelId) return
    const model: StoredModel = {
      id: dialog.id.trim(),
      providerId: dialog.providerId,
      modelId: effectiveModelId,
      name: dialog.name.trim() || effectiveModelId,
    }
    await routerStorage.upsertModel(model)
    await load()
    closeDialog()
  }

  const handleDelete = async (id: string) => {
    await routerStorage.deleteModel(id)
    await load()
    setDeleteConfirm(null)
  }

  const providerName = (id: string) => providers.find((p) => p.id === id)?.id ?? id

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Models</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Model
        </Button>
      </Box>

      {models.length === 0 && (
        <Alert severity="info">No models configured. Add a model to use in routers.</Alert>
      )}

      {models.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Model ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={providerName(m.providerId)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {m.modelId}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(m)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteConfirm(m.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.editing ? `Edit Model: ${dialog.editing.id}` : 'Add Model'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Model ID (storage key)"
              value={dialog.id}
              onChange={(e) => setDialog((d) => ({ ...d, id: e.target.value }))}
              disabled={!!dialog.editing}
              required
              helperText={dialog.editing ? 'ID cannot be changed' : 'Unique key, e.g. "gemini-flash-free"'}
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Provider</InputLabel>
              <Select
                value={dialog.providerId}
                label="Provider"
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {dialog.providerId && (
              <Box>
                <Autocomplete
                  freeSolo
                  options={dialog.fetchedModels}
                  getOptionLabel={(o) => typeof o === 'string' ? o : (o.displayName ?? o.modelId)}
                  value={dialog.fetchedModels.find((m) => m.modelId === dialog.modelId) ?? (dialog.modelId || null)}
                  inputValue={dialog.modelInputValue}
                  onInputChange={handleModelInputChange}
                  onChange={(_, val) => {
                    if (val && typeof val !== 'string') {
                      setDialog((d) => ({
                        ...d,
                        modelId: val.modelId,
                        modelInputValue: val.displayName ?? val.modelId,
                        name: d.name || val.displayName || val.modelId,
                      }))
                    } else if (typeof val === 'string') {
                      setDialog((d) => ({ ...d, modelId: val, modelInputValue: val }))
                    } else {
                      setDialog((d) => ({ ...d, modelId: '', modelInputValue: '' }))
                    }
                  }}
                  loading={dialog.fetchingModels}
                  filterOptions={dialog.supportsSearch ? (opts) => opts : undefined}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Model"
                      required
                      fullWidth
                      helperText={
                        dialog.fetchedModels.length === 0 && !dialog.fetchingModels
                          ? 'Could not fetch models — enter model ID manually'
                          : dialog.supportsSearch
                          ? 'Type to search available models'
                          : undefined
                      }
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {dialog.fetchingModels ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Box>
            )}

            <TextField
              label="Display Name"
              value={dialog.name}
              onChange={(e) => setDialog((d) => ({ ...d, name: e.target.value }))}
              helperText="User-facing name (defaults to model ID)"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!dialog.id.trim() || !dialog.providerId || !(dialog.modelId.trim() || dialog.modelInputValue.trim())}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Model</DialogTitle>
        <DialogContent>
          <Typography>
            Delete model <strong>{deleteConfirm}</strong>? Routers referencing this model will need
            to be updated.
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

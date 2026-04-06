import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
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
  Stack,
  Divider,
  Chip,
  Autocomplete,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import { routerStorage } from '../../shared/storage/router-storage'
import type { StoredRouter, StoredModel } from '../../shared/storage/router-storage'
import type { RouterModelEntry, RouterModelStatus } from '../../llm/router/router-types'
import { ROUTER_PURPOSES } from '../../llm/router/purposes'

const KNOWN_PURPOSES = ROUTER_PURPOSES.map((p) => ({ id: p.id, label: p.label }))

const EMPTY_ROUTER_DIALOG: {
  open: boolean
  editing: StoredRouter | null
  id: string
  name: string
  purpose: string
} = {
  open: false,
  editing: null,
  id: '',
  name: '',
  purpose: 'default',
}

function HealthIcon({ health, reason }: { health: RouterModelStatus['health']; reason?: string }) {
  if (health === 'available')
    return <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
  if (health === 'throttled')
    return (
      <Tooltip title={reason ?? 'Throttled'}>
        <WarningIcon fontSize="small" sx={{ color: 'warning.main' }} />
      </Tooltip>
    )
  return (
    <Tooltip title={reason ?? 'Error'}>
      <ErrorIcon fontSize="small" sx={{ color: 'error.main' }} />
    </Tooltip>
  )
}

function LimitField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  return (
    <TextField
      label={label}
      size="small"
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
      inputProps={{ min: 1 }}
      InputProps={{ endAdornment: <InputAdornment position="end">/min</InputAdornment> }}
      sx={{ width: 110 }}
    />
  )
}

export const RoutersPage = () => {
  const [routers, setRouters] = useState<StoredRouter[]>([])
  const [allModels, setAllModels] = useState<StoredModel[]>([])
  const [routerStatuses, setRouterStatuses] = useState<Record<string, RouterModelStatus[]>>({})
  const [routerDialog, setRouterDialog] = useState(EMPTY_ROUTER_DIALOG)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [modelPickDialog, setModelPickDialog] = useState<{
    open: boolean
    routerId: string
    selectedModelId: string
  }>({ open: false, routerId: '', selectedModelId: '' })

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([routerStorage.getRouters(), routerStorage.getModels()])
    setRouters(r)
    setAllModels(m)
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_ROUTER_STATUS' })
      if (resp?.success && resp.status) {
        setRouterStatuses(resp.status)
      }
    } catch {
      // background may not be ready
    }
  }, [])

  useEffect(() => {
    load()
    loadStatus()
  }, [load, loadStatus])

  // ── Router CRUD ────────────────────────────────────────────────────────────

  const openAddRouter = () =>
    setRouterDialog({ open: true, editing: null, id: '', name: '', purpose: 'default' })

  const openEditRouter = (r: StoredRouter) =>
    setRouterDialog({ open: true, editing: r, id: r.id, name: r.name, purpose: r.purpose })

  const closeRouterDialog = () => setRouterDialog(EMPTY_ROUTER_DIALOG)

  const saveRouter = async () => {
    if (!routerDialog.id.trim() || !routerDialog.name.trim()) return
    const existing = routers.find((r) => r.id === routerDialog.id.trim())
    const router: StoredRouter = existing
      ? { ...existing, name: routerDialog.name.trim(), purpose: routerDialog.purpose }
      : { id: routerDialog.id.trim(), name: routerDialog.name.trim(), purpose: routerDialog.purpose, models: [] }
    await routerStorage.upsertRouter(router)
    await load()
    closeRouterDialog()
  }

  const handleDeleteRouter = async (id: string) => {
    await routerStorage.deleteRouter(id)
    await load()
    setDeleteConfirm(null)
  }

  // ── Model entry management ─────────────────────────────────────────────────

  const updateRouterModels = async (routerId: string, models: RouterModelEntry[]) => {
    const router = routers.find((r) => r.id === routerId)
    if (!router) return
    await routerStorage.upsertRouter({ ...router, models })
    await load()
  }

  const moveModel = async (routerId: string, idx: number, dir: -1 | 1) => {
    const router = routers.find((r) => r.id === routerId)
    if (!router) return
    const models = [...router.models]
    const target = idx + dir
    if (target < 0 || target >= models.length) return
    ;[models[idx], models[target]] = [models[target], models[idx]]
    await updateRouterModels(routerId, models)
  }

  const removeModelEntry = async (routerId: string, idx: number) => {
    const router = routers.find((r) => r.id === routerId)
    if (!router) return
    const models = router.models.filter((_, i) => i !== idx)
    await updateRouterModels(routerId, models)
  }

  const updateLimit = async (
    routerId: string,
    idx: number,
    limitKey: keyof NonNullable<RouterModelEntry['limits']>,
    value: number | undefined,
  ) => {
    const router = routers.find((r) => r.id === routerId)
    if (!router) return
    const models = router.models.map((m, i) => {
      if (i !== idx) return m
      const limits = { ...m.limits, [limitKey]: value }
      // Remove undefined keys
      ;(Object.keys(limits) as (keyof typeof limits)[]).forEach((k) => {
        if (limits[k] === undefined) delete limits[k]
      })
      return { ...m, limits: Object.keys(limits).length > 0 ? limits : undefined }
    })
    await updateRouterModels(routerId, models)
  }

  const openModelPick = (routerId: string) =>
    setModelPickDialog({ open: true, routerId, selectedModelId: '' })

  const addModelToRouter = async () => {
    const { routerId, selectedModelId } = modelPickDialog
    const storedModel = allModels.find((m) => m.id === selectedModelId)
    if (!storedModel) return
    const router = routers.find((r) => r.id === routerId)
    if (!router) return
    const entry: RouterModelEntry = {
      providerId: storedModel.providerId,
      modelId: storedModel.modelId,
    }
    await updateRouterModels(routerId, [...router.models, entry])
    setModelPickDialog({ open: false, routerId: '', selectedModelId: '' })
  }

  const purposeLabel = (purpose: string) =>
    KNOWN_PURPOSES.find((p) => p.id === purpose)?.label ?? purpose

  const modelDisplayName = (entry: RouterModelEntry) => {
    const m = allModels.find(
      (m) => m.providerId === entry.providerId && m.modelId === entry.modelId,
    )
    return m ? m.name : `${entry.providerId}:${entry.modelId}`
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Routers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAddRouter}>
          Add Router
        </Button>
      </Box>

      {routers.length === 0 && (
        <Alert severity="info">
          No routers configured. Add a router and assign models to it.
        </Alert>
      )}

      <Stack spacing={3}>
        {routers.map((router) => {
          const statuses = routerStatuses[router.purpose] ?? []
          return (
            <Card key={router.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {router.name}
                    </Typography>
                    <Chip
                      label={`Purpose: ${purposeLabel(router.purpose)}`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={() => openEditRouter(router)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setDeleteConfirm(router.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {router.models.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No models — add one below.
                  </Typography>
                )}

                <Stack spacing={1}>
                  {router.models.map((entry, idx) => {
                    const status = statuses[idx]
                    return (
                      <Box
                        key={`${entry.providerId}:${entry.modelId}:${idx}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton
                            size="small"
                            onClick={() => moveModel(router.id, idx, -1)}
                            disabled={idx === 0}
                          >
                            <ArrowUpwardIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => moveModel(router.id, idx, 1)}
                            disabled={idx === router.models.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="inherit" />
                          </IconButton>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {status && (
                              <HealthIcon health={status.health} reason={status.unavailableReason} />
                            )}
                            <Typography variant="body2" fontWeight="medium" noWrap>
                              {modelDisplayName(entry)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({entry.providerId})
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <TextField
                              label="RPM"
                              size="small"
                              type="number"
                              value={entry.limits?.rpm ?? ''}
                              onChange={(e) =>
                                updateLimit(
                                  router.id,
                                  idx,
                                  'rpm',
                                  e.target.value === '' ? undefined : parseInt(e.target.value),
                                )
                              }
                              inputProps={{ min: 1 }}
                              sx={{ width: 90 }}
                            />
                            <TextField
                              label="RPD"
                              size="small"
                              type="number"
                              value={entry.limits?.rpd ?? ''}
                              onChange={(e) =>
                                updateLimit(
                                  router.id,
                                  idx,
                                  'rpd',
                                  e.target.value === '' ? undefined : parseInt(e.target.value),
                                )
                              }
                              inputProps={{ min: 1 }}
                              sx={{ width: 90 }}
                            />
                            <TextField
                              label="TPM"
                              size="small"
                              type="number"
                              value={entry.limits?.tpm ?? ''}
                              onChange={(e) =>
                                updateLimit(
                                  router.id,
                                  idx,
                                  'tpm',
                                  e.target.value === '' ? undefined : parseInt(e.target.value),
                                )
                              }
                              inputProps={{ min: 1 }}
                              sx={{ width: 90 }}
                            />
                            <TextField
                              label="TPD"
                              size="small"
                              type="number"
                              value={entry.limits?.tpd ?? ''}
                              onChange={(e) =>
                                updateLimit(
                                  router.id,
                                  idx,
                                  'tpd',
                                  e.target.value === '' ? undefined : parseInt(e.target.value),
                                )
                              }
                              inputProps={{ min: 1 }}
                              sx={{ width: 90 }}
                            />
                          </Box>
                        </Box>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeModelEntry(router.id, idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )
                  })}
                </Stack>

                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => openModelPick(router.id)}
                  sx={{ mt: 1 }}
                >
                  Add Model
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </Stack>

      {/* Add / Edit router dialog */}
      <Dialog open={routerDialog.open} onClose={closeRouterDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {routerDialog.editing ? `Edit Router: ${routerDialog.editing.id}` : 'Add Router'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Router ID"
              value={routerDialog.id}
              onChange={(e) => setRouterDialog((d) => ({ ...d, id: e.target.value }))}
              disabled={!!routerDialog.editing}
              required
              helperText={routerDialog.editing ? 'ID cannot be changed' : ''}
              fullWidth
            />
            <TextField
              label="Name"
              value={routerDialog.name}
              onChange={(e) => setRouterDialog((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
            />
            <Autocomplete
              freeSolo
              options={KNOWN_PURPOSES.map((p) => p.id)}
              getOptionLabel={(o) => {
                const known = KNOWN_PURPOSES.find((p) => p.id === o)
                return known ? `${known.id} — ${known.label}` : String(o)
              }}
              value={routerDialog.purpose}
              onChange={(_, val) => setRouterDialog((d) => ({ ...d, purpose: val ?? 'default' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Purpose"
                  required
                  helperText="e.g. default, job-fit, complete-fields"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRouterDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveRouter}
            disabled={!routerDialog.id.trim() || !routerDialog.name.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Model picker dialog */}
      <Dialog
        open={modelPickDialog.open}
        onClose={() => setModelPickDialog({ open: false, routerId: '', selectedModelId: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Model to Router</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={modelPickDialog.selectedModelId}
              label="Model"
              onChange={(e) =>
                setModelPickDialog((d) => ({ ...d, selectedModelId: e.target.value }))
              }
            >
              {allModels.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({m.providerId})
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {allModels.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No models configured. Go to the Models tab first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModelPickDialog({ open: false, routerId: '', selectedModelId: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addModelToRouter}
            disabled={!modelPickDialog.selectedModelId}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Router</DialogTitle>
        <DialogContent>
          <Typography>
            Delete router <strong>{deleteConfirm}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirm && handleDeleteRouter(deleteConfirm)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

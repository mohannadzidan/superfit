import type { LLMModel, ProviderConfigSchema } from '../../llm/types'
import type { JobPostingInfo } from '../../adapters/types'
import type { ScoredJob } from '../scoring/types'
import type { ProviderType, RouterModelStatus, AcquiredModelConfig } from '../../llm/router/router-types'

// ── Provider / Router management ──────────────────────────────────────────────

export interface ListProviderTypesMessage {
  type: 'LIST_PROVIDER_TYPES'
}

export interface ListProviderTypesResponse {
  success: boolean
  providerTypes?: Array<{
    type: ProviderType
    name: string
    configSchema: ProviderConfigSchema
  }>
  error?: string
}

export interface GetProviderModelsMessage {
  type: 'GET_PROVIDER_MODELS'
  payload: {
    providerType: ProviderType
    config: Record<string, unknown>
    query?: string
  }
}

export interface GetProviderModelsResponse {
  success: boolean
  models?: LLMModel[]
  supportsSearch?: boolean
  error?: string
}

export interface TestProviderConnectionMessage {
  type: 'TEST_PROVIDER_CONNECTION'
  payload: {
    providerType: ProviderType
    config: Record<string, unknown>
  }
}

export interface TestProviderConnectionResponse {
  success: boolean
  error?: string
}

export interface GetRouterStatusMessage {
  type: 'GET_ROUTER_STATUS'
}

export interface GetRouterStatusResponse {
  success: boolean
  status?: Record<string, RouterModelStatus[]>
  error?: string
}

// ── Job capture ────────────────────────────────────────────────────────────────

export interface AnalyzeJobFitMessage {
  type: 'ANALYZE_JOB_FIT'
  payload: {
    jobInfo: JobPostingInfo
  }
}

export interface AnalyzeJobFitResponse {
  success: boolean
  result?: ScoredJob
  error?: string
}

export interface ProxyFetchMessage {
  type: 'PROXY_FETCH'
  payload: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
  }
}

export interface ProxyFetchResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  error?: string
}

export interface CaptureJobMessage {
  type: 'CAPTURE_JOB'
  payload: {
    jobInfo: JobPostingInfo
  }
}

export interface ReleaseJobMessage {
  type: 'RELEASE_JOB'
}

export interface GetCapturedJobMessage {
  type: 'GET_CAPTURED_JOB'
}

export interface GetCapturedJobResponse {
  success: boolean
  jobInfo: JobPostingInfo | null
}

/** Sent from background → all content scripts when captured job changes */
export interface CapturedJobChangedMessage {
  type: 'CAPTURED_JOB_CHANGED'
  payload: {
    jobInfo: JobPostingInfo | null
  }
}

// ── Content-script model acquisition ─────────────────────────────────────────

export interface AcquireModelMessage {
  type: 'ACQUIRE_MODEL'
  payload: { purpose: string }
}

export interface AcquireModelResponse {
  success: boolean
  model?: AcquiredModelConfig
  error?: string
}

export interface RecordModelSuccessMessage {
  type: 'RECORD_MODEL_SUCCESS'
  payload: { key: string; inputTokens: number; outputTokens: number }
}

export interface RecordModelThrottleMessage {
  type: 'RECORD_MODEL_THROTTLE'
  payload: { key: string; retryAfterMs?: number }
}

export interface RecordModelErrorMessage {
  type: 'RECORD_MODEL_ERROR'
  payload: { key: string; error: string }
}

export type LLMMessage =
  | ListProviderTypesMessage
  | GetProviderModelsMessage
  | TestProviderConnectionMessage
  | GetRouterStatusMessage
  | AcquireModelMessage
  | RecordModelSuccessMessage
  | RecordModelThrottleMessage
  | RecordModelErrorMessage
  | AnalyzeJobFitMessage
  | ProxyFetchMessage
  | CaptureJobMessage
  | ReleaseJobMessage
  | GetCapturedJobMessage

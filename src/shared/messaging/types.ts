import { LLMModel } from '../../llm/types';
import { JobPostingInfo } from '../../adapters/types';
import { ScoredJob } from '../scoring/types';

export interface TestConnectionMessage {
  type: 'TEST_LLM_CONNECTION';
  payload: {
    providerId: string;
    config: Record<string, unknown>;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
}

export interface GetModelsMessage {
  type: 'GET_LLM_MODELS';
  payload: {
    providerId: string;
    config?: Record<string, unknown>;
  };
}

export interface GetModelsResponse {
  success: boolean;
  models?: LLMModel[];
  error?: string;
}

export interface AnalyzeJobFitMessage {
  type: 'ANALYZE_JOB_FIT';
  payload: {
      jobInfo: JobPostingInfo;
  };
}

export interface AnalyzeJobFitResponse {
    success: boolean;
    result?: ScoredJob;
    error?: string; // Simplification of AnalysisError for MVP
}

export type LLMMessage = 
    | TestConnectionMessage 
    | GetModelsMessage
    | AnalyzeJobFitMessage;

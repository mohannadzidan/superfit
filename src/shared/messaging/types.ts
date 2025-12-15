import { LLMModel } from '../../llm/types';

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
    config?: Record<string, unknown>; // Optional: try using provided config instead of saved
  };
}

export interface GetModelsResponse {
  success: boolean;
  models?: LLMModel[];
  error?: string;
}

export type LLMMessage = TestConnectionMessage | GetModelsMessage;

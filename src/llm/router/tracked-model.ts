import type {
  BaseChatModel,
  BaseChatModelCallOptions,
} from '@langchain/core/language_models/chat_models'
import { BaseChatModel as BaseChatModelBase } from '@langchain/core/language_models/chat_models'
import type { BaseMessage } from '@langchain/core/messages'
import type { ChatResult } from '@langchain/core/outputs'
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import type { Runnable } from '@langchain/core/runnables'
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import type { AIMessageChunk } from '@langchain/core/messages'
import type { BindToolsInput } from '@langchain/core/language_models/chat_models'
import type { QuotaTracker } from './quota-tracker'

function extractHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (typeof e['status'] === 'number') return e['status']
    if (typeof e['statusCode'] === 'number') return e['statusCode']
    // LangChain wraps HTTP errors in Error with message containing status
    if (e['message'] && typeof e['message'] === 'string') {
      const match = e['message'].match(/\b(429)\b/)
      if (match) return parseInt(match[1])
    }
  }
  return null
}

function extractRetryAfterMs(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    // Check headers on the error object
    const headers = e['headers'] as Record<string, string> | undefined
    if (headers) {
      const ra = headers['retry-after'] ?? headers['Retry-After']
      if (ra) {
        const seconds = parseFloat(ra)
        if (!isNaN(seconds)) return seconds * 1000
      }
    }
    // Check response property
    const response = e['response'] as { headers?: Record<string, string> } | undefined
    if (response?.headers) {
      const ra = response.headers['retry-after']
      if (ra) {
        const seconds = parseFloat(ra)
        if (!isNaN(seconds)) return seconds * 1000
      }
    }
  }
  return undefined
}

/**
 * Wraps a BaseChatModel to transparently track quota via QuotaTracker.
 * Handles 429 errors by marking the model throttled and retrying with
 * the next available model via the provided callback.
 */
export class TrackedModel extends BaseChatModelBase {
  lc_serializable = false

  constructor(
    private readonly inner: BaseChatModel,
    readonly providerKey: string,
    readonly modelKey: string,
    private readonly quotaTracker: QuotaTracker,
    /** Callback to get the next available model when this one is throttled */
    private readonly getNextModel: () => BaseChatModel,
    fields: Record<string, unknown> = {},
  ) {
    super(fields)
  }

  _llmType(): string {
    return (this.inner as unknown as { _llmType(): string })._llmType()
  }

  async _generate(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    this.quotaTracker.recordRequest(this.providerKey, this.modelKey)
    try {
      const inner = this.inner as unknown as {
        _generate(
          messages: BaseMessage[],
          options: BaseChatModelCallOptions,
          runManager?: CallbackManagerForLLMRun,
        ): Promise<ChatResult>
      }
      const result = await inner._generate(messages, options, runManager)
      const usage = (result.llmOutput?.usage ?? result.llmOutput?.tokenUsage ?? {}) as Record<
        string,
        number
      >
      this.quotaTracker.recordSuccess(
        this.providerKey,
        this.modelKey,
        usage.promptTokens ?? usage.input_tokens ?? 0,
        usage.completionTokens ?? usage.output_tokens ?? 0,
      )
      return result
    } catch (error) {
      if (extractHttpStatus(error) === 429) {
        const retryAfterMs = extractRetryAfterMs(error)
        this.quotaTracker.recordThrottle(this.providerKey, this.modelKey, undefined, retryAfterMs)
        // Retry with next available model
        const nextModel = this.getNextModel()
        const next = nextModel as unknown as {
          _generate(
            messages: BaseMessage[],
            options: BaseChatModelCallOptions,
            runManager?: CallbackManagerForLLMRun,
          ): Promise<ChatResult>
        }
        return next._generate(messages, options, runManager)
      }
      this.quotaTracker.recordError(
        this.providerKey,
        this.modelKey,
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  /**
   * Delegate bindTools to inner model so tool-calling agents work correctly.
   * Note: the returned runnable bypasses quota tracking; tracking occurs at
   * _generate level which is called internally by LangGraph agents.
   */
  bindTools(
    tools: BindToolsInput[],
    kwargs?: Partial<BaseChatModelCallOptions>,
  ): Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions> {
    return this.inner.bindTools!(tools, kwargs)
  }
}

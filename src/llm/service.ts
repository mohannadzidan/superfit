import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { RouterManager } from './router/router-manager'
import type { LLMRouter } from './router/router-engine'
import { resumeStorage } from '../shared/storage/resume'

export interface ILLMService {
  initialize(): Promise<void>
  getModel(purpose?: string): BaseChatModel
  getRouter(purpose?: string): LLMRouter
  loadVariables(): Promise<Record<string, string>>
}

export class LLMService implements ILLMService {
  private routerManager = new RouterManager()

  async initialize(): Promise<void> {
    await this.routerManager.initialize()
  }

  getModel(purpose?: string): BaseChatModel {
    return this.routerManager.getRouter(purpose ?? 'default').getModel().model
  }

  getRouter(purpose?: string): LLMRouter {
    return this.routerManager.getRouter(purpose ?? 'default')
  }

  async loadVariables(): Promise<Record<string, string>> {
    const resume = await resumeStorage.getResume()
    return { resume: resume?.markdownContent ?? '' }
  }

  get manager(): RouterManager {
    return this.routerManager
  }
}

export const llmService = new LLMService()

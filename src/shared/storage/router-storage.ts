import type { StoredProvider, StoredModel, StoredRouter } from '../../llm/router/router-types'

export type { StoredProvider, StoredModel, StoredRouter }

const PROVIDERS_KEY = 'llm_providers'
const MODELS_KEY = 'llm_models'
const ROUTERS_KEY = 'llm_routers'

export const routerStorage = {
  // ── Providers ──────────────────────────────────────────────────────────────

  async getProviders(): Promise<StoredProvider[]> {
    const result = await chrome.storage.local.get(PROVIDERS_KEY)
    return (result[PROVIDERS_KEY] as StoredProvider[]) || []
  },

  async saveProviders(providers: StoredProvider[]): Promise<void> {
    await chrome.storage.local.set({ [PROVIDERS_KEY]: providers })
  },

  async upsertProvider(provider: StoredProvider): Promise<void> {
    const providers = await this.getProviders()
    const idx = providers.findIndex((p) => p.id === provider.id)
    if (idx >= 0) providers[idx] = provider
    else providers.push(provider)
    await this.saveProviders(providers)
  },

  async deleteProvider(id: string): Promise<void> {
    const providers = await this.getProviders()
    await this.saveProviders(providers.filter((p) => p.id !== id))
  },

  // ── Models ─────────────────────────────────────────────────────────────────

  async getModels(): Promise<StoredModel[]> {
    const result = await chrome.storage.local.get(MODELS_KEY)
    return (result[MODELS_KEY] as StoredModel[]) || []
  },

  async saveModels(models: StoredModel[]): Promise<void> {
    await chrome.storage.local.set({ [MODELS_KEY]: models })
  },

  async upsertModel(model: StoredModel): Promise<void> {
    const models = await this.getModels()
    const idx = models.findIndex((m) => m.id === model.id)
    if (idx >= 0) models[idx] = model
    else models.push(model)
    await this.saveModels(models)
  },

  async deleteModel(id: string): Promise<void> {
    const models = await this.getModels()
    await this.saveModels(models.filter((m) => m.id !== id))
  },

  // ── Routers ────────────────────────────────────────────────────────────────

  async getRouters(): Promise<StoredRouter[]> {
    const result = await chrome.storage.local.get(ROUTERS_KEY)
    return (result[ROUTERS_KEY] as StoredRouter[]) || []
  },

  async saveRouters(routers: StoredRouter[]): Promise<void> {
    await chrome.storage.local.set({ [ROUTERS_KEY]: routers })
  },

  async upsertRouter(router: StoredRouter): Promise<void> {
    const routers = await this.getRouters()
    const idx = routers.findIndex((r) => r.id === router.id)
    if (idx >= 0) routers[idx] = router
    else routers.push(router)
    await this.saveRouters(routers)
  },

  async deleteRouter(id: string): Promise<void> {
    const routers = await this.getRouters()
    await this.saveRouters(routers.filter((r) => r.id !== id))
  },
}

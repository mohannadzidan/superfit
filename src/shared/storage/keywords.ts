const STORAGE_KEY = 'keyword_highlights';

export const keywordsStorage = {
  async get(): Promise<string[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as string[] | undefined) ?? [];
  },

  async set(keywords: string[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: keywords });
  },
};

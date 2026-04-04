import { ResumeData } from '../types/resume'

const RESUME_STORAGE_KEY = 'resume_data'

export const resumeStorage = {
  /**
   * Get stored resume data
   * @returns ResumeData or null if not set
   */
  async getResume(): Promise<ResumeData | null> {
    const result = await chrome.storage.local.get(RESUME_STORAGE_KEY)
    return result[RESUME_STORAGE_KEY] || null
  },

  /**
   * Save resume data
   * @param content - Markdown content to save
   */
  async saveResume(content: string): Promise<void> {
    const data: ResumeData = {
      markdownContent: content,
      lastModified: new Date().toISOString(),
      version: 1,
    }
    await chrome.storage.local.set({ [RESUME_STORAGE_KEY]: data })
  },

  /**
   * Clear stored resume
   */
  async clearResume(): Promise<void> {
    await chrome.storage.local.remove(RESUME_STORAGE_KEY)
  },

  /**
   * Check if resume exists
   */
  async hasResume(): Promise<boolean> {
    const resume = await this.getResume()
    return !!resume
  },
}

import { JobPostingInfo } from '../../adapters/types';

const CAPTURED_JOB_KEY = 'captured_job';

export const capturedJobStorage = {
  async get(): Promise<JobPostingInfo | null> {
    const result = await chrome.storage.local.get(CAPTURED_JOB_KEY);
    return (result[CAPTURED_JOB_KEY] as JobPostingInfo) ?? null;
  },

  async set(jobInfo: JobPostingInfo): Promise<void> {
    await chrome.storage.local.set({ [CAPTURED_JOB_KEY]: jobInfo });
  },

  async clear(): Promise<void> {
    await chrome.storage.local.remove(CAPTURED_JOB_KEY);
  },
};

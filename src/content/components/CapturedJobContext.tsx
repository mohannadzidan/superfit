import { createContext, useContext } from 'react'
import { JobPostingInfo } from '../../adapters/types'

export interface CapturedJobContextValue {
  capturedJob: JobPostingInfo | null
  capturedJobAdapterIcon?: string
}

export const CapturedJobContext = createContext<CapturedJobContextValue>({
  capturedJob: null,
})

export function useCapturedJob() {
  return useContext(CapturedJobContext)
}

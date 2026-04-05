import React, { useEffect, useState } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { CapturedJobContext, CapturedJobContextValue } from './CapturedJobContext'
import { PageContext, PageContextValue } from '../context/pageContext'
import { CapturedJobBubble } from './CapturedJobBubble'
import { ApplyButtonJobCapturer } from './ApplyButtonJobCapturer'
import { FocusedFieldOverlay } from './FocusedFieldOverlay'
import { AutoFillPopup } from './AutoFillPopup'
import { JobPostingInfo } from '../../adapters/types'
import { PlatformAdapter } from '../../adapters/platform-adapter'
import type { FocusedFieldInfo } from '../inputLabelWatcher'

// Escape hatch: lets external (non-React) code drive the context state
let _setState: ((value: CapturedJobContextValue) => void) | null = null
let _setAdapterState: ((value: { adapter: PlatformAdapter | null; pageKey: string }) => void) | null = null
let _setPageContext: ((value: PageContextValue) => void) | null = null
let _setFocusedField: ((value: FocusedFieldInfo | null) => void) | null = null
let _openAutoFill: ((field: FocusedFieldInfo) => void) | null = null

function ContentRootApp() {
  const [value, setValue] = useState<CapturedJobContextValue>({ capturedJob: null })
  const [adapterState, setAdapterState] = useState<{ adapter: PlatformAdapter | null; pageKey: string }>({
    adapter: null,
    pageKey: '',
  })
  const [focusedField, setFocusedField] = useState<FocusedFieldInfo | null>(null)
  const [pageContextValue, setPageContextValue] = useState<PageContextValue>({
    detectedJob: null,
    foundKeywords: [],
    focusedField: null,
  })
  const [autoFillTarget, setAutoFillTarget] = useState<FocusedFieldInfo | null>(null)

  useEffect(() => {
    _setState = setValue
    _setAdapterState = setAdapterState
    _setPageContext = setPageContextValue
    _setFocusedField = (field) => {
      setFocusedField(field)
      setPageContextValue((prev) => ({ ...prev, focusedField: field }))
    }
    _openAutoFill = (field) => setAutoFillTarget(field)
    return () => {
      _setState = null
      _setAdapterState = null
      _setPageContext = null
      _setFocusedField = null
      _openAutoFill = null
    }
  }, [])

  return (
    <PageContext.Provider value={pageContextValue}>
      <CapturedJobContext.Provider value={value}>
        <CapturedJobBubble />
        <ApplyButtonJobCapturer adapter={adapterState.adapter} pageKey={adapterState.pageKey} />
        <FocusedFieldOverlay focusedField={focusedField} />
        {autoFillTarget && (
          <AutoFillPopup
            focusedField={autoFillTarget}
            onClose={() => setAutoFillTarget(null)}
          />
        )}
      </CapturedJobContext.Provider>
    </PageContext.Provider>
  )
}

class ContentRootManager {
  private container: HTMLElement | null = null
  private root: Root | null = null

  init() {
    if (this.container) return

    this.container = document.createElement('div')
    this.container.id = 'superfit-root'
    this.container.style.position = 'fixed'
    this.container.style.left = '0'
    this.container.style.top = '0'
    this.container.style.width = '0'
    this.container.style.height = '0'
    this.container.style.overflow = 'visible'
    this.container.style.zIndex = '2147483647'
    this.container.style.pointerEvents = 'none'
    document.body.appendChild(this.container)

    const shadowRoot = this.container.attachShadow({ mode: 'open' })
    this.root = createRoot(shadowRoot)
    this.root.render(<ContentRootApp />)
  }

  setCapturedJob(job: JobPostingInfo | null, adapterIcon?: string) {
    _setState?.({ capturedJob: job, capturedJobAdapterIcon: adapterIcon })
  }

  setAdapter(adapter: PlatformAdapter | null, pageKey: string) {
    _setAdapterState?.({ adapter, pageKey })
  }

  setPageContext(detectedJob: JobPostingInfo | null, foundKeywords: string[]) {
    _setPageContext?.({ detectedJob, foundKeywords, focusedField: null })
  }

  setFocusedField(field: FocusedFieldInfo | null) {
    _setFocusedField?.(field)
  }

  openAutoFill(field: FocusedFieldInfo) {
    _openAutoFill?.(field)
  }
}

export const contentRoot = new ContentRootManager()

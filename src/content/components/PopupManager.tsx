import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import createCache, { EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { ScorePopup } from './ScorePopup'
import { FitScoreResult } from '../../shared/scoring/types'
import { createTheme, Theme, ThemeProvider } from '@mui/material'
import { theme } from '../../theme'

export class PopupManager {
  private container: HTMLElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private root: Root | null = null
  private cache: EmotionCache | null = null
  private theme!: Theme

  constructor() {
    this.createContainer()
  }

  private createContainer() {
    if (this.container) return

    // Create host element
    this.container = document.createElement('div')
    this.container.id = 'superfit-popup-host'
    this.container.style.position = 'fixed'
    this.container.style.left = '0'
    this.container.style.top = '0'
    this.container.style.zIndex = '999999'
    this.container.style.fontFamily = 'initial' // Reset inheritance

    document.body.appendChild(this.container)

    // Attach Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'open' })

    // Create Emotion Cache targeting the shadow root
    this.cache = createCache({
      key: 'superfit',
      prepend: true,
      container: this.shadowRoot,
    })

    // Let's create the React root
    this.root = createRoot(this.shadowRoot)
    this.theme = createTheme(theme)
  }

  showLoading() {
    this.render({ state: 'loading' })
  }

  showResult(result: FitScoreResult) {
    this.render({ state: 'success', result })
  }

  showError(error: string, canRetry: boolean = true) {
    this.render({
      state: 'error',
      error,
      onRetry: canRetry ? () => window.location.reload() : undefined, // Simple retry via reload or callback
      onOpenOptions: () => chrome.runtime.openOptionsPage(),
    })
  }

  startAnalysis(jobInfo: any) {
    this.render({
      state: 'loading',
      jobId: jobInfo.id,
      initialJobInfo: jobInfo,
    })
  }

  private render(props: any) {
    if (!this.root || !this.cache) this.createContainer()

    this.root!.render(
      <CacheProvider value={this.cache!}>
        <ThemeProvider theme={this.theme}>
          <ScorePopup {...props} />
        </ThemeProvider>
      </CacheProvider>,
    )
  }

  hide() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    this.cache = null // Reset cache
  }
}

export const popupManager = new PopupManager()

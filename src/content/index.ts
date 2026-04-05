import { adapterRegistry } from '../adapters/registry'
import { contentRoot } from './components/ContentRoot'
import { JobPostingInfo } from '../adapters/types'
import { PlatformAdapter } from '../adapters/platform-adapter'
import { keywordsStorage } from '../shared/storage/keywords'
import { highlightKeywords, clearHighlights } from './keywordHighlighter'
import { CapturedJobChangedMessage, GetCapturedJobResponse } from '../shared/messaging/types'
import { watchInputFocus, FocusedFieldInfo } from './inputLabelWatcher'

console.info('SuperFit: Content Script Loaded')

// Register Adapters

let currentJobInfo: JobPostingInfo | null = null

async function applyKeywordHighlights(adapter: PlatformAdapter, jobInfo: JobPostingInfo) {
  const keywords = await keywordsStorage.get()
  const container = document.body

  let foundKeywords: string[] = []
  if (container) {
    clearHighlights(container as HTMLElement)
  }
  if (container && keywords.length) {
    foundKeywords = highlightKeywords(container as HTMLElement, keywords)
  }

  contentRoot.setPageContext(jobInfo, foundKeywords)
}

class JobWatcher {
  private lastUrl: string = ''
  private checkTimeout: number | undefined
  private foundJobInfo: boolean = false
  constructor() {
    this.init()
  }

  private init() {
    // Initial check
    this.check()

    // Listen for URL changes via popstate (back/forward)
    window.addEventListener('popstate', () => this.check())

    // Listen for URL changes via DOM mutation (SPA navigation)
    // We observe the body for changes, but debounce the actual check
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.lastUrl || !this.foundJobInfo) {
        this.foundJobInfo = false;
        this.check()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private check() {
    window.clearTimeout(this.checkTimeout)
    this.checkTimeout = window.setTimeout(() => {
      this.performCheck()
    }, 100)
  }

  private async performCheck() {
    const currentUrl = window.location.href
    this.lastUrl = currentUrl

    const adapter = adapterRegistry.getAdapter(currentUrl)

    if (adapter) {
      console.log(`SuperFit: Matched adapter ${adapter.name}`)

      if (adapter.isJobPostingPage()) {
        console.log('SuperFit: Job posting page detected!')
        const jobInfo = adapter.extractJobInfo()
        currentJobInfo = jobInfo
        contentRoot.setAdapter(adapter, currentUrl)

        if (jobInfo) {
          console.log('SuperFit: Extracted Job Info:', jobInfo)
          await applyKeywordHighlights(adapter, jobInfo)
          this.foundJobInfo = true;
        } else {
          console.log('SuperFit: Failed to extract job info (or page not fully loaded yet)')
        }
      } else {
        console.log('SuperFit: Adapter matched, but not a job posting page.')
        currentJobInfo = null
        contentRoot.setAdapter(null, currentUrl)
        contentRoot.setPageContext(null, [])
      }
    } else {
      currentJobInfo = null
      contentRoot.setAdapter(null, currentUrl)
      contentRoot.setPageContext(null, [])
    }
  }
}

// Mount the always-on content root (bubble + future features)
contentRoot.init()

// Start watching
new JobWatcher()

// Track focused input fields and their labels
let currentFocusedField: FocusedFieldInfo | null = null
watchInputFocus((field) => {
  currentFocusedField = field
  contentRoot.setFocusedField(field)
})

// Keyboard shortcuts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.altKey && e.key === '/') {
    if (currentFocusedField) {
      e.preventDefault()
      contentRoot.openAutoFill(currentFocusedField)
    }
    return
  }

  if (e.altKey && e.key === '.') {
    if (!currentJobInfo) {
      console.log('SuperFit: No job info on this page to capture')
      return
    }
    chrome.runtime.sendMessage({ type: 'CAPTURE_JOB', payload: { jobInfo: currentJobInfo } })
  }

  if (e.altKey && e.key === '`') {
    chrome.runtime.sendMessage({ type: 'RELEASE_JOB' })
  }
})

// Listen for broadcast from background when captured job changes
chrome.runtime.onMessage.addListener((message: CapturedJobChangedMessage) => {
  if (message.type !== 'CAPTURED_JOB_CHANGED') return
  const { jobInfo } = message.payload
  const icon = jobInfo ? adapterRegistry.getAdapterByName(jobInfo.platform)?.icon : undefined
  contentRoot.setCapturedJob(jobInfo, icon)
})

// On load, restore any previously captured job
chrome.runtime
  .sendMessage({ type: 'GET_CAPTURED_JOB' })
  .then((response: GetCapturedJobResponse) => {
    if (response?.jobInfo) {
      const icon = adapterRegistry.getAdapterByName(response.jobInfo.platform)?.icon
      contentRoot.setCapturedJob(response.jobInfo, icon)
    }
  })

import { adapterRegistry } from '../adapters/registry';
import { LinkedInAdapter } from '../adapters/linkedin';
import { popupManager } from './components/PopupManager';
import { AnalyzeJobFitResponse } from '../shared/messaging/types';

console.info('SuperFit: Content Script Loaded');

// Register Adapters
adapterRegistry.register(new LinkedInAdapter());

class JobWatcher {
  private lastUrl: string = '';
  private checkTimeout: number | undefined;

  constructor() {
    this.init();
  }

  private init() {
    // Initial check
    this.check();

    // Listen for URL changes via popstate (back/forward)
    window.addEventListener('popstate', () => this.check());

    // Listen for URL changes via DOM mutation (SPA navigation)
    // We observe the body for changes, but debounce the actual check
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.lastUrl) {
        this.check();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private check() {
    // Debounce to prevent flashing or excessive checks
    if (this.checkTimeout) window.clearTimeout(this.checkTimeout);

    this.checkTimeout = window.setTimeout(() => {
      this.performCheck();
    }, 100);
  }

  private performCheck() {
    const currentUrl = window.location.href;
    this.lastUrl = currentUrl;

    const adapter = adapterRegistry.getAdapter(currentUrl);
    
    if (adapter) {
      console.log(`SuperFit: Matched adapter ${adapter.name}`);
      
      if (adapter.isJobPostingPage()) {
        console.log('SuperFit: Job posting page detected!');
        const jobInfo = adapter.extractJobInfo();
        
        if (jobInfo) {
          console.log('SuperFit: Extracted Job Info:', jobInfo);
          console.log('SuperFit: Extracted Job Info:', jobInfo);
          
          // Show loading popup
          popupManager.showLoading();

          // Send to background for analysis
          try {
            chrome.runtime.sendMessage(
              { type: 'ANALYZE_JOB_FIT', payload: { jobInfo } },
              (response: AnalyzeJobFitResponse) => {
                // Ensure response and check success
                if (chrome.runtime.lastError) {
                   console.error('SuperFit: Runtime Error:', chrome.runtime.lastError);
                   popupManager.showError('Extension context invalidated. Please reload.');
                   return;
                }

                if (response && response.success && response.result) {
                   popupManager.showResult(response.result);
                } else {
                   const err = response?.error || 'Analysis failed (no response)';
                   console.error('SuperFit: Analysis Error:', err);
                   // Map specific errors to user friendly messages if needed,
                   // or the PopupManager/ScorePopup handles generic strings.
                   let userMsg = err;
                   let canRetry = true;

                   if (err === 'NO_RESUME') {
                       userMsg = 'Please configure your resume in Extension Settings first.';
                       canRetry = false; // "Open Settings" handled by manager
                   } else if (err === 'LLM_NOT_CONFIGURED') {
                       userMsg = 'Please configure AI Model in Extension Settings.';
                       canRetry = false;
                   }

                   popupManager.showError(userMsg, canRetry);
                }
              }
            );
          } catch (e) {
             console.error('SuperFit: Message Send Error:', e);
             popupManager.showError('Extension error. Try reloading the page.');
          }
        } else {
          console.log('SuperFit: Failed to extract job info (or page not fully loaded yet)');
          // Use a retry mechanism? Or just wait for next mutation?
          // For now, let MutationObserver trigger another check if DOM updates
        }
      } else {
        console.log('SuperFit: Adapter matched, but not a job posting page.');
      }
    }
  }
}

// Start watching
new JobWatcher();

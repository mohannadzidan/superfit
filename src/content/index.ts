import { adapterRegistry } from '../adapters/registry';
import { LinkedInAdapter } from '../adapters/linkedin';

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
    }, 500);
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
          // TODO: Send to background script or show UI
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

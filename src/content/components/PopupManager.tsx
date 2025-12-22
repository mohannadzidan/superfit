import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import createCache, { EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ScorePopup } from './ScorePopup';
import { FitScoreResult } from '../../shared/scoring/types';

export class PopupManager {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private root: Root | null = null;
  private cache: EmotionCache | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    if (this.container) return;

    // Create host element
    this.container = document.createElement('div');
    this.container.id = 'superfit-popup-host';
    this.container.style.position = 'fixed';
    this.container.style.left = '0';
    this.container.style.top = '0';
    this.container.style.zIndex = '999999';
    this.container.style.fontFamily = 'initial'; // Reset inheritance

    document.body.appendChild(this.container);

    // Attach Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });
    
    // Create Emotion Cache targeting the shadow root
    this.cache = createCache({
      key: 'css',
      prepend: true,
      container: this.shadowRoot,
    });
    
    // Let's create the React root
    this.root = createRoot(this.shadowRoot);
  }

  showLoading() {
    this.render({ state: 'loading' });
  }

  showResult(result: FitScoreResult) {
    this.render({ state: 'success', result });
  }

  showError(error: string, canRetry: boolean = true) {
    this.render({ 
        state: 'error', 
        error,
        onRetry: canRetry ? () => window.location.reload() : undefined, // Simple retry via reload or callback
        onOpenOptions: () => chrome.runtime.openOptionsPage()
    });
  }

  private render(props: any) {
    if (!this.root || !this.cache) this.createContainer();
    
    this.root!.render(
      <CacheProvider value={this.cache!}>
        <ScorePopup 
          {...props} 
          onClose={() => this.hide()} 
        />
      </CacheProvider>
    );
  }

  hide() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.cache = null; // Reset cache
  }
}

export const popupManager = new PopupManager();

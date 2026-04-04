import { PlatformAdapter, JobPostingInfo } from '../types';
import { hash} from "ohash";

import TurndownService from "turndown";

const turndownService = new TurndownService();

export function htmlToMarkdown(html: string) {
  return turndownService
    .turndown(html)
    .replace(/\*\*\s*(.+?)\s*\*\*/g, "**$1**")
    .replace(/[\t ]*(\n)[\t ]+$/gm, "\n")
    .replace(/\n\s*\n+\s*/g, "\n\n")
    .replace(/\* {2,}/g, "* ");
}

const LINKEDIN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;

export class LinkedInAdapter implements PlatformAdapter {
  readonly name = 'linkedin';
  readonly icon = LINKEDIN_ICON_SVG;

  matches(url: string): boolean {
    return url.includes('linkedin.com');
  }

  isJobPostingPage(): boolean {
    // Check if URL pattern matches a job view or collections view
    const isJobUrl = window.location.pathname.includes('/jobs/view') ??
                     window.location.pathname.includes('/jobs/collections') ??
                     window.location.pathname.includes('/jobs/collections/recommended');
    // Also check if the job details container exists in the DOM
    const jobDetailsContainer = document.querySelector('.jobs-description-content') ??
                                document.querySelector('.jobs-details__main-content');
                                
    return isJobUrl || !!jobDetailsContainer;
  }

  extractJobInfo(): JobPostingInfo | null {
    try {
      // Selectors based on common LinkedIn structures (subject to change)
      // Title
      const titleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title') ?? 
                           document.querySelector('h1');
      const jobTitle = titleElement?.textContent?.trim() ?? '';

      // Company
      const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name') ?? 
                             document.querySelector('.jobs-unified-top-card__company-name');
      const companyName = companyElement?.textContent?.trim() ?? '';

      // Description
      // .jobs-description__content is a common container for the description
      const descriptionElement = document.querySelector('.jobs-description__content') ?? 
                                 document.querySelector('#job-details');
      
      // Get text content, maybe clean it up a bit
      const jobDescription = turndownService
        .turndown(descriptionElement?.innerHTML ?? '')
        .replace(/\*\*\s*(.+?)\s*\*\*/g, "**$1**")
        .replace(/[\t ]*(\n)[\t ]+$/gm, "\n")
        .replace(/\n\s*\n+\s*/g, "\n\n")
        .replace(/\* {2,}/g, "* ");
      // Alternatively, use innerHTML if we want to preserve some formatting, 
      // but purely text is usually safer for LLMs.

      // Location
      const locationElement = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .tvm__text:nth-child(1)');
      const location = locationElement?.textContent?.trim() ?? '';

      if (!jobTitle || !jobDescription) {
        console.warn('SuperFit: Failed to extract essential job info (Title or Description missing)');
        return null;
      }

      const id = this.extractJobId() || 'unknown';

      return {
        id,
        jobUrl: window.location.href,
        jobTitle,
        jobDescription,
        companyName,
        location,
        platform: this.name,
      };

    } catch (error) {
      console.error('SuperFit: Error extracting job info', error);
      return null;
    }
  }

  getApplyButton(): HTMLElement | null {
    return document.querySelector<HTMLElement>('#jobs-apply-button-id')
  }

  getJobDescriptionContainer(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('.jobs-description__content') ??
      document.querySelector<HTMLElement>('#job-details')
    );
  }

  private extractJobId(): string | null {
    // Try to extract from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentJobId = urlParams.get('currentJobId');
    if (currentJobId) return currentJobId;

    // Try regex on path
    const match = window.location.pathname.match(/view\/(\d+)/);
    if (match && match[1]) return match[1];

    return null;
  }


  private getBadgeId(badge:  { text: string; }): string {
    return `badge_${hash(badge)}`;
  }

  private createBadgeElement(props: { text: string; }): HTMLElement {
    const badge = document.createElement('div');
    badge.id = this.getBadgeId(props);
    badge.textContent = props.text;
    badge.style.padding = '4px 8px';
    badge.style.backgroundColor = '#0073b1';
    badge.style.color = 'white';
    badge.style.borderRadius = '4px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    badge.style.display = 'inline-block';
    badge.style.marginTop = '8px';
    return badge;
  }

  
    
  addBadge(postId: string, badge: { text: string; }): void {
    const badgeId = this.getBadgeId(badge);
    if(document.querySelector(`[data-job-id="${postId}"] #${badgeId}`)) return;
    document.querySelector(`[data-job-id="${postId}"] > div`)?.appendChild(this.createBadgeElement(badge));
  }
}

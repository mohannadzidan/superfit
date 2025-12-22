import { PlatformAdapter, JobPostingInfo } from '../types';
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

export class LinkedInAdapter implements PlatformAdapter {
  readonly name = 'linkedin';

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
        location
      };

    } catch (error) {
      console.error('SuperFit: Error extracting job info', error);
      return null;
    }
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
}

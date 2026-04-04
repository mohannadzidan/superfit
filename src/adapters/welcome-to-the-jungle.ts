import { PlatformAdapter, JobPostingInfo } from './types';
import { hash } from "ohash";

import TurndownService from "turndown";

const turndownService = new TurndownService();


const ICON_SVG = "https://static.otta.com/favicons/wttj-favicon.ico"

export class WelcomeToTheJungle implements PlatformAdapter {
  readonly name = 'welcome-to-the-jungle';
  readonly icon = ICON_SVG;

  matches(url: string): boolean {
    return url.includes('welcometothejungle.com');
  }

  isJobPostingPage(): boolean {
    // Check if URL pattern matches a job view or collections view
    return window.location.pathname.match(/\/jobs\/[^\/]+?$/) !== null;
  }

  extractJobInfo(): JobPostingInfo | null {
    try {
      // Selectors based on common LinkedIn structures (subject to change)
      // Title
      const titleElement = document.querySelector('[data-testid="job-title"]')
      const companyElement = document.querySelector('[data-testid="job-title"] a')
      const descriptionElement = document.querySelector('[data-testid="job-card-main"] h2 + div');
      const locationElement = document.querySelector('[data-testid="job-location-tag"]');

      const jobTitle = titleElement?.textContent?.trim() ?? '';

      // Company
      const companyName = companyElement?.textContent?.trim() ?? '';

      // Description
      // .jobs-description__content is a common container for the description

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
    return document.querySelector<HTMLElement>('[data-target="modal-apply"]')
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


  private getBadgeId(badge: { text: string; }): string {
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
    if (document.querySelector(`[data-job-id="${postId}"] #${badgeId}`)) return;
    document.querySelector(`[data-job-id="${postId}"] > div`)?.appendChild(this.createBadgeElement(badge));
  }
}

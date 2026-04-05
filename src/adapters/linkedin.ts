import { PlatformAdapter } from './platform-adapter';

const LINKEDIN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;

export class LinkedInAdapter extends PlatformAdapter {

  readonly name = 'linkedin';
  readonly icon = LINKEDIN_ICON_SVG;

  matches(url: string): boolean {
    return url.includes('linkedin.com');
  }

  getJobTitleElement() {
    return document.querySelector('.job-details-jobs-unified-top-card__job-title') ?? document.querySelector('h1');
  }

  getCompanyElement() {
    return (
      document.querySelector('.job-details-jobs-unified-top-card__company-name') ??
      document.querySelector('.jobs-unified-top-card__company-name')
    );
  }

  getJobDescriptionElement() {
    return document.querySelector<HTMLElement>('.jobs-description__content') ?? document.querySelector<HTMLElement>('#job-details');
  }

  getLocationElement() {
    return document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .tvm__text:nth-child(1)');
  }

  getApplyButton() {
    return document.querySelector<HTMLElement>('#jobs-apply-button-id');
  }

  getJobId() {
    // https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4391896716&discover=recommended&discoveryOrigin=JOBS_HOME_JYMBII
    const urlParams = new URLSearchParams(window.location.search);
    const currentJobId = urlParams.get('currentJobId');
    if (currentJobId) return currentJobId;
    return null;
  }
  
  isJobPostingPage(): boolean {
    // Check if URL pattern matches a job view or collections view
    const isJobUrl =
      window.location.pathname.includes('/jobs/view') ||
      window.location.pathname.includes('/jobs/collections') ||
      window.location.pathname.includes('/jobs/collections/recommended');
    // Also check if the job details container exists in the DOM
    const jobDetailsContainer = document.querySelector('.jobs-description-content') ??
      document.querySelector('.jobs-details__main-content');

    return isJobUrl || !!jobDetailsContainer;
  }
}

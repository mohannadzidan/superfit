export interface JobPostingInfo {
  /** Unique identifier for the job posting */
  id: string;
  /** Full URL of the job posting */
  jobUrl: string;
  /** Job title */
  jobTitle: string;
  /** Full job description text */
  jobDescription: string;
  /** Company name (optional for MVP) */
  companyName?: string;
  /** Location (optional) */
  location?: string;
  /** Platform/adapter name that extracted this job */
  platform: string;
}

export interface PlatformAdapter {
  /** Unique name identifier for the platform */
  readonly name: string;
  /** SVG string for the platform icon (used in the captured job bubble) */
  readonly icon?: string;
  
  /**
   * Check if this adapter can handle the given URL
   * @param url - Current page URL
   * @returns true if this adapter should be used
   */
  matches(url: string): boolean;
  
  /**
   * Check if current page is a job posting page
   * Assumes matches() has already returned true
   * @returns true if page contains a job posting
   */
  isJobPostingPage(): boolean;
  
  /**
   * Extract job information from the current page
   * Assumes isJobPostingPage() has returned true
   * @returns JobPostingInfo or null if extraction fails
   */
  extractJobInfo(): JobPostingInfo | null;

  /**
   * Returns the apply button element for this job posting, or null if not found.
   */
  getApplyButton?(): HTMLElement | null;

  /**
   * Returns the HTML element that contains the job description text.
   * Used for keyword highlighting and text analysis.
   */
  getJobDescriptionContainer?(): HTMLElement | null;

  addBadge?(postId: string, badge: {
    text: string;
  }): void; // Optional method to add a badge or indicator on the page
}

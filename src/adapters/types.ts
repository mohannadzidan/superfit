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
}

export interface PlatformAdapter {
  /** Unique name identifier for the platform */
  readonly name: string;
  
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
}

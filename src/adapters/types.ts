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

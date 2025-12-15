export interface ResumeData {
  /** Markdown content of the resume */
  markdownContent: string;
  
  /** ISO timestamp of last modification */
  lastModified: string;
  
  /** Data version for future migrations */
  version: number;
}

export const ROUTER_PURPOSES = [
  {
    id: 'default',
    label: 'Default',
    description: 'Fallback for all tasks with no specific router',
  },
  {
    id: 'complete-fields',
    label: 'Complete Fields',
    description: 'Auto-filling form fields',
  },
  {
    id: 'job-summary',
    label: 'Job Summary',
    description: 'Summarizing job postings',
  },
  {
    id: 'job-fit',
    label: 'Job Fit Analysis',
    description: 'Analyzing resume-job fit',
  },
] as const

export type KnownRouterPurpose = (typeof ROUTER_PURPOSES)[number]['id']

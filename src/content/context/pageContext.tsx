import { createContext, useContext } from "react";
import type { JobPostingInfo } from "../../adapters/types";
import type { FocusedFieldInfo } from "../inputLabelWatcher";

export interface PageContextValue {
  /** Job info currently detected on this page (auto-detected, not necessarily captured) */
  detectedJob: JobPostingInfo | null;
  /** Keywords/keyphrases found in the job description */
  foundKeywords: string[];
  /** The text input currently focused by the user, along with its detected label */
  focusedField: FocusedFieldInfo | null;
}

const defaultValue: PageContextValue = {
  detectedJob: null,
  foundKeywords: [],
  focusedField: null,
};

export const PageContext = createContext<PageContextValue>(defaultValue);

export function usePageContext() {
  return useContext(PageContext);
}

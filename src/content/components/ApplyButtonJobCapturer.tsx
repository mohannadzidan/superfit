import { useEffect } from "react";
import { PlatformAdapter } from "../../adapters/platform-adapter";

interface Props {
  adapter: PlatformAdapter | null;
  /** Changes whenever the page changes, forcing the effect to re-run */
  pageKey: string;
}

export function ApplyButtonJobCapturer({ adapter, pageKey }: Props) {
  useEffect(() => {
    if (!adapter?.getApplyButton) return;
    const button = adapter.getApplyButton();
    if (!button) return;

    const handleClick = () => {
      const jobInfo = adapter.extractJobInfo();
      if (jobInfo) {
        chrome.runtime.sendMessage({ type: "CAPTURE_JOB", payload: { jobInfo } });
      }
    };

    button.addEventListener("click", handleClick);
    return () => button.removeEventListener("click", handleClick);
  }, [adapter, pageKey]);

  return null;
}

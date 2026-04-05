import { PlatformAdapter } from "./platform-adapter";

const ICON_SVG = "https://static.otta.com/favicons/wttj-favicon.ico";

export class WelcomeToTheJungleAdapter extends PlatformAdapter {
  readonly name = "welcome-to-the-jungle";
  readonly icon = ICON_SVG;

  matches(url: string): boolean {
    return url.includes("welcometothejungle.com");
  }

  getJobTitleElement(): Element | null {
    return document.querySelector('[data-testid="job-metadata-block"] h2');
  }

  getCompanyElement(): Element | null {
    return document.querySelector('[data-testid="job-metadata-block"] a');
  }

  getJobDescriptionElement(): HTMLElement | null {
    return document.querySelector('[data-testid="job-section-description"] h4+div');
  }

  getLocationElement(): Element | null {
    return document.querySelector('[data-testid="job-metadata-block"] [alt="Location"]+span');
  }

  getApplyButton(): HTMLElement | null {
    return document.querySelector('[data-testid="job_header-button-apply"]');
  }

  getJobId(): string | null {
    const match = window.location.pathname.match(/\/jobs\/([^/]+)$/);
    return match ? match[1] : null;
  }

  isJobPostingPage(): boolean {
    // Check if URL pattern matches a job view or collections view
    return window.location.pathname.match(/\/jobs\/[^/]+?$/) !== null;
  }
}

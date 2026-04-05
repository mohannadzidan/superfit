import { PlatformAdapter } from './platform-adapter';


const ICON_SVG = "https://static.otta.com/favicons/wttj-favicon.ico"

export class AppWelcomeToTheJungleAdapter extends PlatformAdapter {
  readonly name = 'app-welcome-to-the-jungle';
  readonly icon = ICON_SVG;

  matches(url: string): boolean {
    return url.includes('app.welcometothejungle.com');
  }

  getJobTitleElement() {
    return document.querySelector('h1[data-testid="job-title"]');
  }

  getCompanyElement() {
    return document.querySelector('h1[data-testid="job-title"] a');
  }

  getJobDescriptionElement() {
    return document.querySelector('[data-testid="job-card-main"] h2 + div');
  }

  getLocationElement() {
    return document.querySelector('[data-testid="job-location-tag"]');
  }

  getApplyButton() {
    return document.querySelector('[data-testid="apply-button"]');
  }

  getJobId() {
    const match = window.location.pathname.match(/\/jobs\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  isJobPostingPage(): boolean {
    // Check if URL pattern matches a job view or collections view
    return window.location.pathname.match(/\/jobs\/[^\/]+?$/) !== null;
  }
}

import { hash } from "ohash";
import TurndownService from "turndown";
import { JobPostingInfo } from "./types";

const turndownService = new TurndownService();

export abstract class PlatformAdapter {
  abstract readonly name: string;
  readonly icon?: string;

  abstract matches(url: string): boolean;
  abstract isJobPostingPage(): boolean;
  abstract getJobTitleElement(): Element | null;
  abstract getJobDescriptionElement(): Element | null;
  abstract getCompanyElement(): Element | null;
  abstract getLocationElement(): Element | null;
  abstract getApplyButton(): Element | null;
  abstract getJobId(): string | null;

  extractJobInfo(): JobPostingInfo | null {
    try {
      const jobTitle = this.textFrom(this.getJobTitleElement());
      const companyName = this.textFrom(this.getCompanyElement());
      const descriptionElement = this.getJobDescriptionElement();
      const location = this.textFrom(this.getLocationElement());

      const jobDescription = this.htmlToMarkdown(descriptionElement?.innerHTML ?? "");

      if (!jobTitle) {
        console.warn("SuperFit: Failed to extract essential job info (Title missing)");
        return null;
      }

      if (!jobDescription) {
        console.warn("SuperFit: Failed to extract essential job info (Description missing)");
        return null;
      }

      return {
        id: this.getJobId() ?? "unknown",
        jobUrl: window.location.href,
        jobTitle,
        jobDescription,
        companyName,
        location,
        platform: this.name,
      };
    } catch (error) {
      console.error("SuperFit: Error extracting job info", error);
      return null;
    }
  }

  addBadge(postId: string, badge: { text: string }): void {
    const badgeId = this.getBadgeId(badge);
    if (document.querySelector(`[data-job-id="${postId}"] #${badgeId}`)) return;

    const badgeContainer = document.querySelector<HTMLElement>(`[data-job-id="${postId}"] > div`);
    if (!badgeContainer) return;

    badgeContainer.appendChild(this.createBadgeElement(badge));
  }

  protected htmlToMarkdown(html: string): string {
    return turndownService
      .turndown(html)
      .replace(/\*\*\s*(.+?)\s*\*\*/g, "**$1**")
      .replace(/[\t ]*(\n)[\t ]+$/gm, "\n")
      .replace(/\n\s*\n+\s*/g, "\n\n")
      .replace(/\* {2,}/g, "* ")
      .trim();
  }

  private textFrom(element: Element | null): string {
    return element?.textContent?.trim() ?? "";
  }

  private getBadgeId(badge: { text: string }): string {
    return `badge_${hash(badge)}`;
  }

  private createBadgeElement(props: { text: string }): HTMLElement {
    const badge = document.createElement("div");
    badge.id = this.getBadgeId(props);
    badge.textContent = props.text;
    badge.style.padding = "4px 8px";
    badge.style.backgroundColor = "#0073b1";
    badge.style.color = "white";
    badge.style.borderRadius = "4px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "bold";
    badge.style.display = "inline-block";
    badge.style.marginTop = "8px";
    return badge;
  }
}

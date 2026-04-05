#!/usr/bin/env node

import { chromium } from "playwright";
import { load } from "cheerio";
import { program } from "commander";

// Parse CLI arguments
program
  .argument("<url>", "URL to fetch and render")
  .option("-t, --truncate-ratio <number>", "Truncation ratio (0-1)", "1")
  .option("--min-length <number>", "Minimum text length", "30")
  .option("--max-length <number>", "Maximum text length", "3000")
  .parse(process.argv);

const url = program.args[0];
const options = program.opts();

const TRUNCATE_RATIO = parseFloat(options.truncateRatio);
const MIN_LENGTH = parseInt(options.minLength);
const MAX_LENGTH = parseInt(options.maxLength);

/**
 * Truncate text to a percentage of original length with bounds
 */
function truncateText(text) {
  if (!text || typeof text !== "string") return text;

  // Remove extra whitespace
  let cleaned = text.trim().replace(/\s+/g, " ");

  if (cleaned.length === 0) return cleaned;

  // Calculate target length as percentage of original
  let targetLength = Math.floor(cleaned.length * TRUNCATE_RATIO);

  // Apply bounds
  targetLength = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, targetLength));

  if (cleaned.length <= targetLength) return cleaned;

  // Truncate to target length, trying to break at word boundaries
  let truncated = cleaned.substring(0, targetLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > targetLength * 0.7) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + "...";
}

/**
 * Recursively process text nodes and truncate them
 */
function processNode($, element) {
  // Process text nodes directly
  if (element.type === "text") {
    const truncated = truncateText(element.data);
    if (truncated !== element.data) {
      element.data = truncated;
    }
    return;
  }

  // Process children
  $(element)
    .contents()
    .each((i, child) => {
      processNode($, child);
    });
}

/**
 * Remove unwanted tags from the DOM
 */
function removeUnwantedTags($) {
  const unwantedTags = [
    "svg",
    "img",
    "picture",
    "figure",
    "figcaption",
    "script",
    "link",
    "style",
    "head",
    "meta",
    "noscript",
    "iframe",
    "canvas",
    "video",
    "audio",
    "source",
    "button",
    "input",
    "select",
    "textarea",
    "form",
    "nav",
    "footer",
    "header",
    "aside",
    "menu",
    "menuitem",
  ];

  unwantedTags.forEach((tag) => {
    $(tag).remove();
  });

  // Also remove elements with common media/icon classes
  $(
    '[class*="icon"], [class*="svg"], [class*="image"], [class*="media"], [class*="social"]',
  ).remove();
  $('[class*="ad-"], [class*="advertisement"], [class*="banner"]').remove();
  $('[role="img"], [role="navigation"]').remove();
  let removed;
  do {
    removed = false;

    $("*").each((_, element) => {
      const tagName = element.tagName?.toLowerCase();
      if (!tagName) return;

      const $el = $(element);
      if ($el.text().trim() === "") {
        $el.remove();
        removed = true;
      }
    });
  } while (removed);
}

/**
 * Main function
 */
async function fetchAndProcessPage(url) {
  let browser = null;

  try {
    console.error(`Fetching URL: ${url}`);

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    // Navigate and wait for network to be idle
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Get fully rendered HTML
    const html = await page.content();

    console.error("Page loaded, processing HTML...");

    // Parse with cheerio
    const $ = load(html);

    // Remove unwanted tags
    removeUnwantedTags($);

    // Process text nodes recursively
    $("body")
      .contents()
      .each((i, element) => {
        processNode($, element);
      });

    // Get the cleaned HTML
    const cleanedHtml = $.html();

    // Output the result
    console.log(cleanedHtml);

    console.error("\n--- Statistics ---");
    console.error(`Original HTML size: ${(html.length / 1024).toFixed(2)} KB`);
    console.error(`Cleaned HTML size: ${(cleanedHtml.length / 1024).toFixed(2)} KB`);
    console.error(`Reduction: ${((1 - cleanedHtml.length / html.length) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script
if (!url) {
  console.error("Please provide a URL as argument");
  console.error("Usage: node script.js <url> [options]");
  console.error("Options:");
  console.error("  --truncate-ratio <number>  Truncation ratio (default: 0.1)");
  console.error("  --min-length <number>      Minimum text length (default: 30)");
  console.error("  --max-length <number>      Maximum text length (default: 100)");
  process.exit(1);
}

fetchAndProcessPage(url);

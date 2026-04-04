const HIGHLIGHT_CLASS = 'superfit-keyword-highlight'
const STYLE_ID = 'superfit-highlight-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = /* css */ `.${HIGHLIGHT_CLASS} {
    background: linear-gradient(
        90deg,
        rgba(0, 200, 255, 0.5),    /* vibrant cyan */
        rgba(255, 80, 120, 0.5),   /* lively coral pink */
        rgba(255, 200, 50, 0.5),   /* sunny yellow */
        rgba(0, 255, 180, 0.5),    /* mint green */
        rgba(200, 80, 255, 0.5)    /* electric purple */
    );
    background-size: 300% 200%;
    animation: superfit-highlight-gradient 3s ease-in-out infinite;
    border-radius: 4px;
    padding: 0px 4px;
    color: #242424;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.3);
    transition: all 0.2s ease;
}

@keyframes superfit-highlight-gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

/* Optional hover effect for extra vibrancy */
.${HIGHLIGHT_CLASS}:hover {
    background-size: 400% 200%;
    box-shadow: 0 0 14px rgba(255, 80, 120, 0.6);
    filter: brightness(1.05);
}`
  document.head.appendChild(style)
}

function removeHighlights(container: HTMLElement) {
  container.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    const text = document.createTextNode(el.textContent ?? '')
    el.parentNode?.replaceChild(text, el)
  })
  // Merge adjacent text nodes left behind
  container.normalize()
}

/**
 * Highlights all occurrences of the given keywords inside the container element.
 * Returns the list of keywords that were actually found (deduplicated).
 */
export function highlightKeywords(container: HTMLElement, keywords: string[]): string[] {
  injectStyles()
  removeHighlights(container)

  if (!keywords.length) return []

  const found = new Set<string>()

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  let node = walker.nextNode()
  while (node) {
    textNodes.push(node as Text)
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? ''
    if (!text.trim()) continue

    const lowerText = text.toLowerCase()

    // Collect all non-overlapping matches sorted by position
    const matches: { start: number; end: number; original: string }[] = []

    for (const keyword of keywords) {
      const lower = keyword.toLowerCase()
      let idx = lowerText.indexOf(lower)
      while (idx !== -1) {
        matches.push({ start: idx, end: idx + keyword.length, original: keyword })
        idx = lowerText.indexOf(lower, idx + keyword.length)
      }
    }

    if (!matches.length) continue

    matches.sort((a, b) => a.start - b.start)

    const fragment = document.createDocumentFragment()
    let pos = 0

    for (const match of matches) {
      if (match.start < pos) continue // skip overlapping

      if (match.start > pos) {
        fragment.appendChild(document.createTextNode(text.slice(pos, match.start)))
      }

      const span = document.createElement('span')
      span.className = HIGHLIGHT_CLASS
      span.textContent = text.slice(match.start, match.end)
      fragment.appendChild(span)

      found.add(match.original)
      pos = match.end
    }

    if (pos < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(pos)))
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return [...found]
}

/** Removes all keyword highlights from the container. */
export function clearHighlights(container: HTMLElement) {
  removeHighlights(container)
}

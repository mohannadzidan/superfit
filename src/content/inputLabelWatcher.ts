export interface FocusedFieldInfo {
  labelElement: Element | null
  inputElement: HTMLElement
  label?: string
  placeholder?: string
}

const INPUT_SELECTOR =
  'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset])' +
  ':not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])' +
  ':not([type=image]):not([type=color]), textarea, [contenteditable="true"], [contenteditable=""]'

function findLabel(input: HTMLElement): { text: string; element: Element | null } | null {
  // 1. aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby')
  if (labelledBy) {
    // may be a space-separated list of IDs
    const el = document.getElementById(labelledBy.split(' ')[0])
    if (el) return { text: el.textContent?.trim() ?? '', element: el }
  }

  // 2. <label for="id">
  const id = input.id
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
    if (label) return { text: label.textContent?.trim() ?? '', element: label }
  }

  // 3. Wrapping <label>
  const closestLabel = input.closest('label')
  if (closestLabel) return { text: closestLabel.textContent?.trim() ?? '', element: closestLabel }

  // 4. aria-label (text only, no DOM element)
  const ariaLabel = input.getAttribute('aria-label')
  if (ariaLabel) return { text: ariaLabel, element: null }

  // 5. placeholder (text only, no DOM element)
  const placeholder = input.getAttribute('placeholder')
  if (placeholder) return { text: placeholder, element: null }

  return null
}

type Callback = (field: FocusedFieldInfo | null) => void

export function watchInputFocus(callback: Callback): () => void {
  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (!target || !target.matches?.(INPUT_SELECTOR)) return

    const labelInfo = findLabel(target)
    console.log('SuperFit: Focused input field detected', { input: target, label: labelInfo })
    callback({
      label: labelInfo?.text ?? undefined,
      labelElement: labelInfo?.element ?? null,
      inputElement: target,
      placeholder: target.getAttribute('placeholder') ?? undefined,
    })
  }

  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (!target || !target.matches?.(INPUT_SELECTOR)) return
    callback(null)
  }

  document.addEventListener('focus', handleFocus, true)
  document.addEventListener('blur', handleBlur, true)

  return () => {
    document.removeEventListener('focus', handleFocus, true)
    document.removeEventListener('blur', handleBlur, true)
  }
}

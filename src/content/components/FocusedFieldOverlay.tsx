import React, { useEffect, useState } from 'react'
import type { FocusedFieldInfo } from '../inputLabelWatcher'

interface Positions {
  input: { x: number; y: number }
  label: { x: number; y: number } | null
}

function computePositions(info: FocusedFieldInfo): Positions {
  const inputRect = info.inputElement.getBoundingClientRect()
  const labelRect = info.labelElement?.getBoundingClientRect() ?? null
  return {
    input: { x: inputRect.left, y: inputRect.top },
    label: labelRect ? { x: labelRect.left, y: labelRect.top } : null,
  }
}

const DOT_R = 4
const COLOR = '#1fb15483'

export function FocusedFieldOverlay({ focusedField }: { focusedField: FocusedFieldInfo | null }) {
  const [positions, setPositions] = useState<Positions | null>(null)

  useEffect(() => {
    if (!focusedField) {
      setPositions(null)
      return
    }

    const update = () => setPositions(computePositions(focusedField))
    update()

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    const ro = new ResizeObserver(update)
    ro.observe(focusedField.inputElement)
    if (focusedField.labelElement) ro.observe(focusedField.labelElement as Element)

    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [focusedField])

  if (!positions) return null

  const { input, label } = positions

  return (
    <svg
      style={{
        position: 'fixed',
        top: 10,
        left: -10,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {label && (
        <>
          <line
            x1={label.x}
            y1={label.y}
            x2={input.x}
            y2={input.y}
            stroke={COLOR}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <circle cx={label.x} cy={label.y} r={DOT_R} fill={COLOR} />
        </>
      )}
      <circle cx={input.x} cy={input.y} r={DOT_R} fill={COLOR} />
    </svg>
  )
}

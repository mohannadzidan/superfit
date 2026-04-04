import React, { useRef, useState } from 'react'
import { useCapturedJob } from './CapturedJobContext'

export function CapturedJobBubble() {
  const { capturedJob, capturedJobAdapterIcon } = useCapturedJob()
  const [pos, setPos] = useState({ right: 20, bottom: 20 })
  const dragState = useRef<{
    startMouse: { x: number; y: number }
    startPos: { right: number; bottom: number }
  } | null>(null)

  if (!capturedJob) return null

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { ...pos },
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const { startMouse, startPos } = dragState.current
    const dx = e.clientX - startMouse.x
    const dy = e.clientY - startMouse.y
    setPos({
      right: Math.max(0, startPos.right - dx),
      bottom: Math.max(0, startPos.bottom - dy),
    })
  }

  const onPointerUp = () => {
    dragState.current = null
  }

  const label = [capturedJob.jobTitle, capturedJob.companyName].filter(Boolean).join(' @ ')

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={`Captured: ${label}\nPress Alt+\` to release`}
      style={{
        position: 'fixed',
        right: `${pos.right}px`,
        bottom: `${pos.bottom}px`,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#0A66C2',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        userSelect: 'none',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
    >
      {capturedJobAdapterIcon ? (
        <img
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(capturedJobAdapterIcon)}`}
          width={28}
          height={28}
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <span
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'none',
          }}
        >
          {capturedJob.platform[0].toUpperCase()}
        </span>
      )}
    </div>
  )
}

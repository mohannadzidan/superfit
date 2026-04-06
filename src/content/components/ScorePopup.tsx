import React, { useEffect, useRef } from 'react'
import { Box, Paper, Typography, CircularProgress, Button, SxProps, Theme } from '@mui/material'
import { match } from 'ts-pattern'
import { EmojiEvents, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material'
import matchingLevelEvaluatorUserPrompt from '../../prompts/matching-level-evaluator.user.md?raw'
import { Output, Prompt } from './MessageCard'
import { ThreadHeader } from './ThreadHeader'
import { createProxiedFetch } from '../../shared/proxy-fetch'
import { createProxiedModel, is429Error } from '../../llm/content-model'
import { resumeStorage } from '../../shared/storage/resume'
import type { AcquireModelResponse } from '../../shared/messaging/types'
import { HumanMessage } from '@langchain/core/messages'
import Mustache from 'mustache'

interface ScorePopupProps {
  error?: string
  onClose: () => void
  onRetry?: () => void
  jobId?: string
  initialJobInfo?: any
}

type RunStatus = 'idle' | 'thinking' | 'done' | 'error'

interface ThreadMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function ScorePopup({
  error: propError,
  onClose,
  onRetry,
  jobId,
  initialJobInfo,
}: ScorePopupProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [status, setStatus] = React.useState<RunStatus>('idle')
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const [inputTokens, setInputTokens] = React.useState(0)
  const [outputTokens, setOutputTokens] = React.useState(0)
  const [runError, setRunError] = React.useState<string | undefined>()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    runAnalysis()
  }, [jobId])

  async function runAnalysis() {
    setStatus('thinking')

    let lastKey: string | undefined

    const attempt = async (retryCount: number): Promise<void> => {
      const resp = (await chrome.runtime.sendMessage({
        type: 'ACQUIRE_MODEL',
        payload: { purpose: 'job-summary' },
      })) as AcquireModelResponse

      if (!resp.success || !resp.model) {
        throw new Error(resp.error ?? 'No models available')
      }

      lastKey = resp.model.key
      const model = createProxiedModel(resp.model, createProxiedFetch())

      try {
        const resume = await resumeStorage.getResume()
        const variables = { ...(initialJobInfo ?? {}), resume: resume?.markdownContent ?? '' }
        const renderedPrompt = Mustache.render(matchingLevelEvaluatorUserPrompt, variables)
        const userTimestamp = Date.now()

        const result = await model.invoke([new HumanMessage(renderedPrompt)])
        const assistantContent =
          typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

        const usage = (result.response_metadata?.tokenUsage ?? result.response_metadata?.usage ?? {}) as Record<string, number>
        setInputTokens(usage.promptTokens ?? usage.input_tokens ?? 0)
        setOutputTokens(usage.completionTokens ?? usage.output_tokens ?? 0)

        setMessages([
          { role: 'user', content: renderedPrompt, timestamp: userTimestamp },
          { role: 'assistant', content: assistantContent, timestamp: Date.now() },
        ])

        chrome.runtime.sendMessage({
          type: 'RECORD_MODEL_SUCCESS',
          payload: { key: lastKey!, inputTokens: inputTokens, outputTokens: outputTokens },
        }).catch(() => {})

        setStatus('done')
      } catch (err) {
        if (is429Error(err) && retryCount < 2) {
          chrome.runtime.sendMessage({ type: 'RECORD_MODEL_THROTTLE', payload: { key: lastKey! } }).catch(() => {})
          return attempt(retryCount + 1)
        }
        chrome.runtime.sendMessage({ type: 'RECORD_MODEL_ERROR', payload: { key: lastKey!, error: String(err) } }).catch(() => {})
        throw err
      }
    }

    try {
      await attempt(0)
    } catch (err) {
      console.error('SuperFit: score popup error:', err)
      setStatus('error')
      setRunError(err instanceof Error ? err.message : String(err))
    }
  }

  const style = match<{ state: string; level: string | undefined }, SxProps<Theme>>({
    level: 'SUPER_FIT', // TODO: change the static value
    state: status === 'thinking' ? 'loading' : status,
  })
    .with({ state: 'loading' }, () => ({ backgroundColor: '#ffffffff' }))
    .with({ level: 'SUPER_FIT' }, () => ({ backgroundColor: '#98ff94ff' }))
    .with({ level: 'LIKELY_MATCHING' }, () => ({ backgroundColor: '#fdcd85ff' }))
    .otherwise(() => ({ backgroundColor: '#ac1c31ff' }))

  const headline = match('SUPER_FIT' as string) // TODO: change the static value
    .with('SUPER_FIT', () => ({ icon: <EmojiEvents sx={{ fontSize: 16 }} />, text: 'Super Fit' }))
    .with('LIKELY_MATCHING', () => ({
      icon: <ThumbUpAlt sx={{ fontSize: 16 }} />,
      text: 'Likely Matching',
    }))
    .otherwise(() => ({ icon: <ThumbDownAlt sx={{ fontSize: 16 }} />, text: 'Not Matching' }))

  return (
    <Paper
      elevation={4}
      sx={{
        width: isExpanded ? 320 : 120,
        pt: 0,
        borderRadius: isExpanded ? 2 : 4,
        backgroundColor: '#fff',
        position: 'absolute',
        left: '50vw',
        top: '100vh',
        transform: 'translate(-50%, calc(-8px - 100%))',
        transition: 'all 0.2s ease-in-out',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',

        ...style,
      }}
    >
      <ThreadHeader
        title="Job Match Analysis"
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        onToggleMinimize={() => setIsExpanded((p) => !p)}
        isMinimized={!isExpanded}
      />
      <Box sx={{ p: 1 }}>
        {match({ state: status, isExpanded })
          .with(
            { state: 'idle', isExpanded: false },
            { state: 'thinking', isExpanded: false },
            () => (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  gap: 2,
                }}
                onClick={() => setIsExpanded(true)}
              >
                <CircularProgress size={16} />
                <Typography variant="body2" noWrap>
                  {status === 'thinking' ? 'Thinking...' : 'Analyzing job match...'}
                </Typography>
              </Box>
            ),
          )
          .with({ state: 'done', isExpanded: false }, () => (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                gap: 2,
              }}
              onClick={() => setIsExpanded(true)}
            >
              <Typography variant="body2" noWrap>
                Job analysis ready
              </Typography>
            </Box>
          ))
          .with({ isExpanded: true }, () => (
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {messages.map(({ content, role, timestamp }, index) =>
                role === 'assistant' ? (
                  <Output key={index} message={content} />
                ) : (
                  <Prompt
                    key={index}
                    message={content}
                    time={
                      index + 1 < messages.length
                        ? messages[index + 1].timestamp - timestamp
                        : undefined
                    }
                  />
                ),
              )}
              {status === 'thinking' && (
                <Typography color="text.secondary" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                  Thinking...
                </Typography>
              )}
            </Box>
          ))
          .otherwise(() => (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                gap: 2,
              }}
            >
              <CircularProgress size={16} />
              <Button size="small" onClick={onRetry} />
              <Typography variant="body2" noWrap>
                {runError || propError || 'Something went wrong'}
              </Typography>
            </Box>
          ))}
      </Box>
    </Paper>
  )
}

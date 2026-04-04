import React, { useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Button, SxProps, Theme } from '@mui/material'
import { match } from 'ts-pattern'
import { EmojiEvents, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material'
import { useLLMThread } from '../../shared/hooks/useLLMThread'
import matchingLevelEvaluatorUserPrompt from '../../prompts/matching-level-evaluator.user.md?raw'
import { Output, Prompt } from './MessageCard'
import { ThreadHeader } from './ThreadHeader'

interface ScorePopupProps {
  error?: string
  onClose: () => void
  onRetry?: () => void
  jobId?: string
  initialJobInfo?: any
}

export function ScorePopup({
  error: propError,
  onClose,
  onRetry,
  jobId,
  initialJobInfo,
}: ScorePopupProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const {
    inputTokens,
    outputTokens,
    messages,
    status: threadStatus,
    sendMessage,
  } = useLLMThread(jobId || '')

  useEffect(() => {
    if (messages.length === 0 && threadStatus === 'idle') {
      sendMessage(initialJobInfo, [
        {
          role: 'user',
          content: matchingLevelEvaluatorUserPrompt,
        },
      ])
    }
  }, [jobId, messages.length, threadStatus])

  const style = match<{ state: string; level: string | undefined }, SxProps<Theme>>({
    level: 'SUPER_FIT', // TODO: change the static value
    state: 'loading',
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
        {match({ state: threadStatus, isExpanded })
          .with(
            { state: 'loading', isExpanded: false },
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
                  {threadStatus === 'thinking' ? 'Thinking...' : 'Analyzing job match...'}
                </Typography>
              </Box>
            ),
          )
          .with({ state: 'idle', isExpanded: false }, () => (
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
              {threadStatus === 'thinking' && (
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
                {propError || 'Something went wrong'}
              </Typography>
            </Box>
          ))}
      </Box>
    </Paper>
  )
}

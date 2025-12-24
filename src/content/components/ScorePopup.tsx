import React, { useEffect } from 'react'
import { Box, Paper, Typography, CircularProgress, Button, SxProps, Theme } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import CancelIcon from '@mui/icons-material/Cancel'
import { FitScoreResult } from '../../shared/scoring/types'
import { match } from 'ts-pattern'
import { EmojiEvents, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material'
import { useLLMThread } from '../../shared/hooks/useLLMThread'
import matchingLevelEvaluatorUserPrompt from '../../prompts/matching-level-evaluator.user.md?raw'
import { Output, Prompt } from './MessageCard'
import { ThreadHeader } from './ThreadHeader'

// Embedded theme to ensure consistent look within Shadow DOM
// const theme = createTheme({
//   palette: {
//     mode: 'light',
//   },
//   typography: {
//     fontFamily: 'Roboto, Arial, sans-serif',
//   },
// })

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

  // Thread Hook
  const {
    inputTokens,
    outputTokens,
    messages,
    streamingContent,
    status: threadStatus,
    sendMessage,
  } = useLLMThread(jobId || '')

  // Determine active state/data
  // specific logic: if jobId is present, use thread data. fallback to props.
  const isThreadActive = !!jobId

  // If parsing fitResult fails or is pending, we might be 'loading' or 'success' from props?
  // Let's rely on threadStatus.
  // Start analysis if needed
  useEffect(() => {
    // if (jobId && initialJobInfo && messages.length === 0 && threadStatus === 'idle') {
    if (messages.length === 0 && threadStatus === 'idle') {
      sendMessage(initialJobInfo, [
        {
          role: 'user',
          content: matchingLevelEvaluatorUserPrompt,
        },
      ])
    } else if (messages.length == 2 && threadStatus === 'idle') {
      sendMessage(
        initialJobInfo,
        [
          {
            role: 'user',
            content: 'Use the `submit_fit_score` to submit the user score',
          },
        ],
        [
          {
            type: 'function',
            function: {
              name: 'submit_fit_score',
              description: 'Submit the fit score of the candidate',
              parameters: {
                type: 'object',
                properties: {
                  level: {
                    type: 'string',
                    description:
                      'an enum describes the fit level of the candidate, one of SUPER_FIT | LIKELY_MATCHING | BARELY_MATCHING | NOT_MATCHING',
                  },
                },
                required: ['level'],
              },
            },
          },
        ],
      )
    }
    // startAnalysis(initialJobInfo)
    // }
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
            { state: 'streaming', isExpanded: false },
            () => (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  gap: 2,
                }}
                onClick={() => setIsExpanded(true)} // Allow expanding to see stream
              >
                <CircularProgress size={16} />
                <Typography variant="body2" noWrap>
                  {threadStatus === 'streaming' ? 'Thinking...' : 'Analyzing job match...'}
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
              onClick={() => setIsExpanded(true)} // Allow expanding to see stream
            >
              <Typography variant="body2" noWrap>
                Job analysis ready
              </Typography>
            </Box>
          ))
          // Loading + Expanded = Streaming View
          .with({ isExpanded: true }, () => (
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {messages.map(({ content, role, tool_calls, timestamp }, index) =>
                match({ role, isCallingTool: !!tool_calls, call: tool_calls?.[0] })
                  .with({ role: 'assistant', isCallingTool: false }, () => (
                    <Output key={index} message={content} />
                  ))
                  .with({ role: 'assistant', isCallingTool: true }, () => (
                    <Output key={index} message={JSON.stringify(tool_calls)} />
                  ))
                  .otherwise(() => (
                    <Prompt
                      key={index}
                      message={content}
                      time={
                        index + 1 < messages.length
                          ? messages[index + 1].timestamp - timestamp
                          : undefined
                      }
                    />
                  )),
              )}
              {threadStatus === 'streaming' && !streamingContent && (
                <Typography
                  // variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  Thinking...
                </Typography>
              )}
              {streamingContent && <Output message={streamingContent} />}
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
              {/* If error, try to show error message if available */}
              <CircularProgress size={16} />
              <Button size="small" onClick={onRetry}>
                {/* <Refresh /> */}
              </Button>
              <Typography variant="body2" noWrap>
                {propError || 'Something went wrong'}
              </Typography>
            </Box>
          ))}
      </Box>
    </Paper>
  )
}

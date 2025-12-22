import React, { useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  ThemeProvider,
  createTheme,
  SxProps,
  Theme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import CancelIcon from '@mui/icons-material/Cancel'
import { FitScoreResult } from '../../shared/scoring/types'
import { match } from 'ts-pattern'
import { Egg, EmojiEvents, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material'

// Embedded theme to ensure consistent look within Shadow DOM
const theme = createTheme({
  palette: {
    mode: 'light',
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
})

interface ScorePopupProps {
  state: 'loading' | 'success' | 'error'
  result?: FitScoreResult
  error?: string
  onClose: () => void
  onRetry?: () => void
  onOpenOptions?: () => void
}

const ScorePopupContent: React.FC<ScorePopupProps> = ({
  state,
  result,
  error,
  onClose,
  onRetry,
  onOpenOptions,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const style = match<
    { state: typeof state; level: Exclude<typeof result, undefined>['level'] | undefined },
    SxProps<Theme>
  >({
    level: result?.level,
    state,
  })
    .with({ state: 'loading' }, () => ({ backgroundColor: '#ffffffff' }))
    .with({ level: 'SUPER_FIT' }, () => ({ backgroundColor: '#98ff94ff' }))
    .with({ level: 'LIKELY_MATCHING' }, () => ({ backgroundColor: '#fdcd85ff' }))
    // .with({ level: 'BARELY_MATCHING' }, () => ({ backgroundColor: '#fdcd85ff' }))
    // .with({ level: 'NOT_MATCHING' }, { state: 'error' }, () => ({ backgroundColor: '#ac1c31ff' }))
    .otherwise(() => ({ backgroundColor: '#ac1c31ff' }))

  useEffect(() => {
    setIsExpanded(false)
  }, [result])

  const headline = match(result?.level)
    .with('SUPER_FIT', () => ({
      icon: <EmojiEvents sx={{ fontSize: 16 }} />,
      text: 'Super Fit',
    }))
    .with('LIKELY_MATCHING', () => ({
      icon: <ThumbUpAlt sx={{ fontSize: 16 }} />,
      text: 'Likely Matching',
    }))
    // .with('NEUTRAL_MATCHING', () => ({
    //   icon: <Egg sx={{ fontSize: 16 }} />,
    //   text: 'Neutral Matching',
    // }))
    // .with('BARELY_MATCHING', () => ({
    //   icon: <Egg sx={{ fontSize: 16 }} />,
    //   text: 'Barely Matching',
    // }))
    .otherwise(() => ({
      icon: <ThumbDownAlt sx={{ fontSize: 16 }} />,
      text: 'Not Matching',
    }))

  return (
    <Paper
      elevation={4}
      sx={{
        width: isExpanded ? 320 : 120,
        p: 1,
        borderRadius: isExpanded ? 2 : 4,
        backgroundColor: '#fff',
        position: 'absolute',
        left: '50vw',
        top: '100vh',
        transform: 'translate(-50%, calc(-8px - 100%))',
        transition: 'all 0.2s ease-in-out',
        border: '1px solid #00000036',
        ...style,
      }}
    >
      {match({ state, isExpanded })
        .with({ state: 'loading', isExpanded: false }, () => (
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
            <Typography variant="body2" noWrap>
              Analyzing job match...
            </Typography>
          </Box>
        ))
        .with({ state: 'success', isExpanded: false }, () => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'start',
              alignItems: 'center',
              height: '100%',
              gap: 1,
            }}
            onClick={() => setIsExpanded(true)}
          >
            {headline.icon}
            <Typography variant="body2" noWrap>
              {headline.text}
            </Typography>
          </Box>
        ))
        .with({ state: 'success', isExpanded: true }, () => (
          <>
            <Typography
              variant="body2"
              noWrap
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {headline.icon}
              {headline.text}
            </Typography>

            {result!.missingSkills && result!.missingSkills.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography fontWeight="bold">You are missing the following skills</Typography>
                <Typography component="ul" color="text.secondary">
                  {result!.missingSkills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </Typography>
              </Box>
            )}

            {result!.matchingSkills && result!.matchingSkills.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="success.main">
                  Matching:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {result!.matchingSkills.join(', ')}
                </Typography>
              </Box>
            )}
          </>
        ))
        .with({ state: 'success' }, () => (
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
              {result?.level}
            </Typography>
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
            <Button size="small" onClick={onRetry}>
              {/* <Refresh /> */}
            </Button>
            <Typography variant="body2" noWrap>
              Something went wrong
            </Typography>
          </Box>
        ))}
      {/* 
     
      {state === 'loading' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <CircularProgress size={30} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">Analyzing job match...</Typography>
        </Box>
      )}

      {state === 'error' && (
        <Box>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="caption" display="block">{error || 'Analysis failed'}</Typography>
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
             {onRetry && <Button size="small" onClick={onRetry}>Retry</Button>}
             {onOpenOptions && <Button size="small" color="primary" onClick={onOpenOptions}>Settings</Button>}
          </Box>
        </Box>
      )}

      {state === 'success' && result && (
        <Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 2, 
            p: 1.5, 
            borderRadius: 1, 
            backgroundColor: getBgColor(result.level),
            color: getColor(result.level)
           }}>
             {getIcon(result.level)}
             <Box>
                <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
                  {result.headline}
                </Typography>
             </Box>
          </Box>

          <Typography variant="body2" paragraph sx={{ maxHeight: 100, overflowY: 'auto' }}>
            {result.explanation}
          </Typography>

          {result.missingSkills && result.missingSkills.length > 0 && (
             <Box sx={{ mt: 1 }}>
                <Typography variant="caption" fontWeight="bold" color="error">Missing:</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                   {result.missingSkills.join(', ')}
                </Typography>
             </Box>
          )}

           {result.matchingSkills && result.matchingSkills.length > 0 && (
             <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="success.main">Matching:</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                   {result.matchingSkills.join(', ')}
                </Typography>
             </Box>
          )}

        </Box>
      )}
 */}
    </Paper>
  )
}

// Helper for styles
function getBgColor(level: string) {
  switch (level) {
    case 'SUPER_FIT':
      return '#e8f5e9'
    case 'LIKELY_MATCHING':
      return '#e3f2fd'
    case 'BARELY_MATCHING':
      return '#fff3e0'
    case 'NOT_MATCHING':
      return '#ffebee'
    default:
      return '#f5f5f5'
  }
}

function getColor(level: string) {
  switch (level) {
    case 'SUPER_FIT':
      return '#2e7d32'
    case 'LIKELY_MATCHING':
      return '#1565c0'
    case 'BARELY_MATCHING':
      return '#ef6c00'
    case 'NOT_MATCHING':
      return '#c62828'
    default:
      return '#757575'
  }
}

function getIcon(level: string) {
  switch (level) {
    case 'SUPER_FIT':
      return <CheckCircleIcon />
    case 'LIKELY_MATCHING':
      return <InfoIcon />
    case 'BARELY_MATCHING':
      return <WarningIcon />
    case 'NOT_MATCHING':
      return <CancelIcon />
    default:
      return <InfoIcon />
  }
}

export const ScorePopup: React.FC<ScorePopupProps> = (props) => (
  <ThemeProvider theme={theme}>
    <ScorePopupContent {...props} />
  </ThemeProvider>
)

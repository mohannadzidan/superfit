import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Options'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from '../theme'

const muiTheme = createTheme(theme)
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

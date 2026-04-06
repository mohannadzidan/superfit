import { useState } from 'react'
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Divider,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import LabelIcon from '@mui/icons-material/Label'
import CloudIcon from '@mui/icons-material/Cloud'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { MyInfo } from './pages/MyInfo'
import { Keywords } from './pages/Keywords'
import { ProvidersPage } from './pages/ProvidersPage'
import { ModelsPage } from './pages/ModelsPage'
import { RoutersPage } from './pages/RoutersPage'

const drawerWidth = 240

type Page = 'info' | 'keywords' | 'providers' | 'models' | 'routers'

export const Options = () => {
  const [activePage, setActivePage] = useState<Page>('info')

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            SuperFit Configuration
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton selected={activePage === 'info'} onClick={() => setActivePage('info')}>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="My Information" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePage === 'keywords'}
                onClick={() => setActivePage('keywords')}
              >
                <ListItemIcon>
                  <LabelIcon />
                </ListItemIcon>
                <ListItemText primary="Keywords" />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider />
          <List
            subheader={
              <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                LLM ROUTING
              </Typography>
            }
          >
            <ListItem disablePadding>
              <ListItemButton
                selected={activePage === 'providers'}
                onClick={() => setActivePage('providers')}
              >
                <ListItemIcon>
                  <CloudIcon />
                </ListItemIcon>
                <ListItemText primary="Providers" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePage === 'models'}
                onClick={() => setActivePage('models')}
              >
                <ListItemIcon>
                  <SmartToyIcon />
                </ListItemIcon>
                <ListItemText primary="Models" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                selected={activePage === 'routers'}
                onClick={() => setActivePage('routers')}
              >
                <ListItemIcon>
                  <AccountTreeIcon />
                </ListItemIcon>
                <ListItemText primary="Routers" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: '100vh', overflow: 'auto' }}>
        <Toolbar />
        {activePage === 'info' && <MyInfo />}
        {activePage === 'keywords' && <Keywords />}
        {activePage === 'providers' && <ProvidersPage />}
        {activePage === 'models' && <ModelsPage />}
        {activePage === 'routers' && <RoutersPage />}
      </Box>
    </Box>
  )
}

export default Options

import { useState } from 'react';
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
  Typography 
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TuneIcon from '@mui/icons-material/Tune';
import { MyInfo } from './pages/MyInfo';
import { AIModel } from './pages/AIModel';

const drawerWidth = 240;

export const Options = () => {
  const [activePage, setActivePage] = useState<'info' | 'model'>('info');

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
              <ListItemButton 
                selected={activePage === 'info'} 
                onClick={() => setActivePage('info')}
              >
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="My Information" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={activePage === 'model'}
                onClick={() => setActivePage('model')}
              >
                <ListItemIcon>
                  <TuneIcon />
                </ListItemIcon>
                <ListItemText primary="AI Model" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: '100vh', overflow: 'hidden' }}>
        <Toolbar />
        {activePage === 'info' && <MyInfo />}
        {activePage === 'model' && <AIModel />}
      </Box>
    </Box>
  );
};

export default Options;

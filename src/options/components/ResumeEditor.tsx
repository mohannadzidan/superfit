import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Typography, 
  Button, 
  Stack, 
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import Markdown from 'react-markdown';

interface ResumeEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ initialContent, onSave }) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [initialContent]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setHasUnsavedChanges(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Failed to save resume:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Resume Editor</Typography>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Stack>
      
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Editor Pane */}
        <Paper elevation={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2">Markdown Input</Typography>
          </Box>
          <TextField
            multiline
            fullWidth
            maxRows={Infinity}
            placeholder="Paste your resume here in Markdown format..."
            value={content}
            onChange={handleChange}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                height: '100%',
                alignItems: 'start',
                p: 2,
                overflow: 'auto',
              },
              '& textarea': {
                height: '100% !important',
                overflow: 'auto !important',
              }
            }}
            variant="standard"
            InputProps={{ disableUnderline: true }}
          />
        </Paper>

        {/* Preview Pane */}
        <Paper elevation={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2">Preview</Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            overflow: 'auto', 
            typography: 'body1',
            '& h1': { typography: 'h4', mb: 2 },
            '& h2': { typography: 'h5', mt: 3, mb: 2 },
            '& h3': { typography: 'h6', mt: 2, mb: 1 },
            '& p': { mb: 2 },
            '& ul, & ol': { mb: 2, pl: 3 },
            '& li': { mb: 0.5 },
          }}>
             {content ? (
                <Markdown>{content}</Markdown>
             ) : (
               <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                 Preview will appear here...
               </Typography>
             )}
          </Box>
        </Paper>
      </Box>

      <Snackbar 
        open={showSuccess} 
        autoHideDuration={3000} 
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Resume saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

import React, { useEffect, useState, KeyboardEvent } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { keywordsStorage } from '../../shared/storage/keywords';

export const Keywords = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    keywordsStorage.get().then((saved) => {
      setKeywords(saved);
      setIsLoading(false);
    });
  }, []);

  const addKeyword = async () => {
    const trimmed = input.trim();
    if (!trimmed || keywords.includes(trimmed)) {
      setInput('');
      return;
    }
    const updated = [...keywords, trimmed];
    setKeywords(updated);
    setInput('');
    await keywordsStorage.set(updated);
  };

  const removeKeyword = async (keyword: string) => {
    const updated = keywords.filter((k) => k !== keyword);
    setKeywords(updated);
    await keywordsStorage.set(updated);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Keyword Highlights
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Keywords and phrases you add here will be highlighted in job descriptions automatically.
        Useful for spotting things like remote work, relocation support, visa sponsorship, etc.
      </Typography>

      <TextField
        fullWidth
        label="Add keyword or phrase"
        placeholder='e.g. "remote", "relocation support"'
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={addKeyword} edge="end" disabled={!input.trim()}>
                  <AddIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {keywords.length === 0 && (
          <Typography variant="body2" color="text.disabled">
            No keywords added yet.
          </Typography>
        )}
        {keywords.map((keyword) => (
          <Chip
            key={keyword}
            label={keyword}
            onDelete={() => removeKeyword(keyword)}
          />
        ))}
      </Box>
    </Box>
  );
};

import React from "react";
import { Box, Typography, IconButton, Stack, Paper } from "@mui/material";
import MinimizeIcon from "@mui/icons-material/Minimize";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

interface ThreadHeaderProps {
  title: string;
  inputTokens: number;
  outputTokens: number;
  onToggleMinimize: () => void;
  isMinimized: boolean;
}

export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  title,
  inputTokens,
  outputTokens,
  onToggleMinimize,
  isMinimized,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: isMinimized ? "space-between" : "start",
        px: 1,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {!isMinimized && (
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }} noWrap>
          {title}
        </Typography>
      )}

      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.5,
          mr: 1,
          borderRadius: 8,
          bgcolor: "action.hover",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ color: "success.main" }}>
          <Typography fontSize="inherit" fontWeight="bold">
            {inputTokens}
          </Typography>
          <ArrowUpwardIcon fontSize="inherit" />
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ color: "primary.main" }}>
          <Typography fontSize="inherit" fontWeight="bold">
            {outputTokens}
          </Typography>
          <ArrowDownwardIcon fontSize="inherit" />
        </Stack>
      </Paper>

      <IconButton
        size="small"
        onClick={onToggleMinimize}
        aria-label="minimize"
        sx={{ borderRadius: 1 }}
      >
        {isMinimized ? <FullscreenIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
};

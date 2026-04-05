import { useState } from "react";
import { Typography, Button, Collapse, Stack } from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import Markdown from "react-markdown";

export function Prompt({ message, time }: { message: string; time?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // formating time to minutes and seconds into a string, showing minutes only if more than 1 minute
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    if (minutes === 0) {
      return `${seconds} seconds`;
    }
    if (minutes > 1 && seconds === 0) {
      return `${minutes} minutes`;
    }
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Stack direction="column" gap={1} sx={{ py: 1, color: "gray" }}>
      <Button
        size="small"
        variant="text"
        sx={{
          pl: 1,
          textAlign: "start",
          textTransform: "none",
          justifyContent: "start",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography variant="body2" noWrap sx={{ maxWidth: "calc(max(50%,120px))" }}>
          {message}
        </Typography>
        &nbsp;
        {time && <span>{formatTime(time)}</span>}
        &nbsp;
        {isExpanded ? (
          <ChevronLeft sx={{ rotate: "-90deg" }} />
        ) : (
          <ChevronLeft sx={{ rotate: "180deg" }} />
        )}
      </Button>

      <Collapse in={isExpanded} unmountOnExit>
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            pl: 1,
            borderLeft: "1px solid",
            borderColor: "divider",
          }}
        >
          {message}
        </Typography>
      </Collapse>
    </Stack>
  );
}

export function Output({ message }: { message: string }) {
  return (
    // <Card component={Stack} direction="column" gap={1} variant="outlined" sx={{ p: 1 }}>
    <Typography
      variant="body2"
      sx={{
        lineHeight: 1.6,
        "& p": { mb: 1.5, "&:last-child": { mb: 0 } },
        "& ul, & ol": { pl: 2.5, mb: 1.5 },
        "& li": { mb: 0.5 },
        "& h1, & h2, & h3, & h4, & h5, & h6": { mb: 1.5 },
        "& a": { color: "blue", textDecoration: "underline" },
      }}
    >
      <Markdown>{message}</Markdown>
    </Typography>
    // </Card>
  );
}

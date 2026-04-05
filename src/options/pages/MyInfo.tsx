import React, { useEffect, useState } from "react";
import { Box, Tabs, Tab, CircularProgress } from "@mui/material";
import { ResumeEditor } from "../components/ResumeEditor";
import { resumeStorage } from "../../shared/storage/resume";

export const MyInfo = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [resumeContent, setResumeContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await resumeStorage.getResume();
        if (data) {
          setResumeContent(data.markdownContent);
        }
      } catch (error) {
        console.error("Failed to load resume:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSaveResume = async (content: string) => {
    await resumeStorage.saveResume(content);
    setResumeContent(content); // Update local state confirmation
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Resume" />
          <Tab label="Profile (Coming Soon)" disabled />
        </Tabs>
      </Box>

      {activeTab === 0 && <ResumeEditor initialContent={resumeContent} onSave={handleSaveResume} />}
    </Box>
  );
};

import { llmService } from '../llm/service';
import { providerRegistry } from '../llm/registry';
import { OllamaProvider } from '../llm/providers/ollama';  // Import to ensure registration
import { LLMMessage } from '../shared/messaging/types';

console.log('SuperFit background service worker started');

// Ensure Ollama provider is registered (service imports registry which registers it, but explicit checks help)
if (!providerRegistry.getProvider('ollama')) {
  providerRegistry.register(new OllamaProvider());
}

// Initialize service
llmService.initialize().catch(err => console.error('LLM Service Init Error:', err));

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

// Initialize service
llmService.initialize().catch(err => console.error('LLM Service Init Error:', err));

// Add resume storage for context retrieval
import { resumeStorage } from '../shared/storage/resume';
import { llmStorage } from '../shared/storage/llm';
import { parseAndValidateScore, extractJsonFromText } from '../shared/scoring/parser';
import { AnalyzeJobFitResponse } from '../shared/messaging/types';

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request: LLMMessage): Promise<any> {
  if (request.type === 'TEST_LLM_CONNECTION') {
    const { providerId, config } = request.payload;
    const provider = providerRegistry.getProvider(providerId);
    
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` };
    }

    try {
      await provider.configure(config);
      const isAvailable = await provider.isAvailable();
      
      return isAvailable 
        ? { success: true }
        : { success: false, error: 'Connection failed. Check URL and ensure server is running.' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  if (request.type === 'GET_LLM_MODELS') {
    const { providerId } = request.payload;
    const provider = providerRegistry.getProvider(providerId);

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` };
    }

    try {
      if (request.payload.config) {
        await provider.configure(request.payload.config);
      }
      const models = await provider.getAvailableModels();
      return { success: true, models };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch models' };
    }
  }

  if (request.type === 'ANALYZE_JOB_FIT') {
    try {
        const { jobInfo } = request.payload;
        
        // 1. Get Resume
        const resume = await resumeStorage.getResume();
        if (!resume) {
            return { success: false, error: 'NO_RESUME' }; // Client should show "Configure Resume"
        }

        // 2. Get LLM Config
        const llmConfig = await llmStorage.getConfig();
        if (!llmConfig || !llmConfig.providerId || !llmConfig.modelId) {
            return { success: false, error: 'LLM_NOT_CONFIGURED' };
        }

        // Ensure service is initialized with latest config settings (it usually loads from storage on init, 
        // but explicit re-init ensures active model is set if changed in options without reload)
        // Also simpler: LLMService automatically reads storage if not forced.
        // But let's just force the specific model we know is in storage to be safe.
        // Note: LLMService.initialize() doesn't take JSON strategy, that's meta-logic here in BG.
        await llmService.initialize(llmConfig.providerId, llmConfig.modelId);

        const strategy = llmConfig.jsonStrategy || 'extract';

        // 3. Construct Prompts
        const systemPrompt = `You are a job-resume matching assistant. Your task is to evaluate how well a candidate's resume matches a job description. 
Output MUST be a valid JSON object with the following structure:
{
  "level": "NOT_MATCHING" | "BARELY_MATCHING" | "LIKELY_MATCHING" | "SUPER_FIT",
  "headline": "Short summary",
  "explanation": "Detailed explanation",
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"]
}`;

        const userPrompt = `Evaluate this match.

## Job Title
${jobInfo.jobTitle}

## Job Description
${jobInfo.jobDescription}

## Candidate Resume
${resume.markdownContent}

Respond with JSON only.`;

        let rawResponseText = '';

        if (strategy === 'native') {
             const completion = await llmService.generateCompletion({
                 prompt: userPrompt,
                 systemPrompt: systemPrompt,
                 temperature: 0.1,
                 format: 'json'
             });
             if (!completion.success) throw new Error(completion.error);
             rawResponseText = completion.text;

        } else if (strategy === 'two-stage') {
             // Stage 1: Think
             const thinkPrompt = `Analyze the match between this resume and job description. Think step-by-step about skills, experience, and requirements.
             
Job: ${jobInfo.jobTitle}
Desc: ${jobInfo.jobDescription}
Resume: ${resume.markdownContent}`;

             const thinkCompletion = await llmService.generateCompletion({
                 prompt: thinkPrompt,
                 systemPrompt: "You are an expert recruiter. Analyze the candidate fit in detail.",
                 temperature: 0.7
             });
             
             if (!thinkCompletion.success) throw new Error(thinkCompletion.error);
             
             // Stage 2: Transform
             const transformPrompt = `Based on your analysis below, create the final JSON score.
             
Analysis:
${thinkCompletion.text}

Output JSON matching the schema: { level, headline, explanation, matchingSkills, missingSkills }`;

             const jsonCompletion = await llmService.generateCompletion({
                 prompt: transformPrompt,
                 systemPrompt: systemPrompt, // Reuse JSON system prompt
                 temperature: 0.1,
                 format: 'json' // Try native if provider supports it, otherwise text
             });
             
              if (!jsonCompletion.success) throw new Error(jsonCompletion.error);
              rawResponseText = jsonCompletion.text;

        } else {
            // Strategy: 'extract' (Default)
             const completion = await llmService.generateCompletion({
                 prompt: userPrompt,
                 systemPrompt: systemPrompt,
                 temperature: 0.1
             });
             if (!completion.success) throw new Error(completion.error);
             rawResponseText = completion.text;
        }

        // 4. Parse & Validate
        const scoreResult = parseAndValidateScore(rawResponseText);
        
        return {
            success: true,
            result: {
                ...scoreResult,
                jobId: jobInfo.id || 'unknown', // Adapter should provide ID or hash
                analyzedAt: new Date().toISOString()
            }
        };

    } catch (e) {
        console.error('Analysis failed:', e);
        return { 
            success: false, 
            error: e instanceof Error ? e.message : 'Unknown analysis error' 
        };
    }
  }

  return { success: false, error: 'Unknown message type' };
}

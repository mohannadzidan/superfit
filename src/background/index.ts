import { llmService } from '../llm/service'
import { providerRegistry } from '../llm/registry'
import { OllamaProvider } from '../llm/providers/ollama' // Import to ensure registration
import { ListLLMProvidersResponse, LLMMessage } from '../shared/messaging/types'
import { resumeStorage } from '../shared/storage/resume'
import { llmStorage } from '../shared/storage/llm'
import { parseAndValidateScore, extractJsonFromText } from '../shared/scoring/parser'
import { GeminiProvider } from '../llm/providers/gemini'
import './services/thread' // Initialize thread service

console.log('SuperFit background service worker started')

// Ensure Ollama provider is registered (service imports registry which registers it, but explicit checks help)
providerRegistry.register(new GeminiProvider())
providerRegistry.register(new OllamaProvider())

// Initialize service
llmService.initialize().catch((err) => console.error('LLM Service Init Error:', err))

chrome.runtime.onMessage.addListener((request: LLMMessage, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse)
  return true // Keep channel open for async response
})

async function handleMessage(request: LLMMessage): Promise<any> {
  if (request.type === 'LIST_LLM_PROVIDERS') {
    return {
      success: true,
      providers: providerRegistry.getAllProviders().map((provider) => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        configSchema: provider.getConfigSchema(),
      })),
    } satisfies ListLLMProvidersResponse
  }

  if (request.type === 'TEST_LLM_CONNECTION') {
    const { providerId, config } = request.payload
    const provider = providerRegistry.getProvider(providerId)

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` }
    }

    try {
      await provider.configure(config)
      const isAvailable = await provider.isAvailable()

      return isAvailable
        ? { success: true }
        : { success: false, error: 'Connection failed. Check URL and ensure server is running.' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  if (request.type === 'GET_LLM_MODELS') {
    const { providerId } = request.payload
    const provider = providerRegistry.getProvider(providerId)

    if (!provider) {
      return { success: false, error: `Provider ${providerId} not found` }
    }

    try {
      if (request.payload.config) {
        await provider.configure(request.payload.config)
      }
      const models = await provider.getAvailableModels()
      return { success: true, models }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models',
      }
    }
  }

  //   if (request.type === 'ANALYZE_JOB_FIT') {
  //     try {
  //       const { jobInfo } = request.payload

  //       // 1. Get Resume
  //       const resume = await resumeStorage.getResume()
  //       if (!resume) {
  //         return { success: false, error: 'NO_RESUME' } // Client should show "Configure Resume"
  //       }

  //       // 2. Get LLM Config
  //       const llmConfig = await llmStorage.getConfig()
  //       if (
  //         !llmConfig ||
  //         !llmConfig.providerId ||
  //         !llmConfig.providerConfigs[llmConfig.providerId].modelId
  //       ) {
  //         return { success: false, error: 'LLM_NOT_CONFIGURED' }
  //       }

  //       // Ensure service is initialized with latest config settings (it usually loads from storage on init,
  //       // but explicit re-init ensures active model is set if changed in options without reload)
  //       // Also simpler: LLMService automatically reads storage if not forced.
  //       // But let's just force the specific model we know is in storage to be safe.
  //       // Note: LLMService.initialize() doesn't take JSON strategy, that's meta-logic here in BG.
  //       await llmService.initialize(
  //         llmConfig.providerId,
  //         llmConfig.providerConfigs[llmConfig.providerId].modelId,
  //       )

  //       const strategy = llmConfig.jsonStrategy || 'extract'

  //       // 3. Construct Prompts

  //       const systemPrompt = `You are a job-resume matching assistant. Analyze the candidate's resume against the job description and output ONLY a JSON object with two keys: \`missingSkills\` (array of strings) and \`level\` (one of "NOT_MATCHING", "BARELY_MATCHING", "NEUTRAL_MATCHING", "LIKELY_MATCHING", "SUPER_FIT").

  // **Scoring Rules:**
  // - "SUPER_FIT": Matches all key requirements
  // - "LIKELY_MATCHING": Missing ≤1 critical requirement
  // - "BARELY_MATCHING": Missing 2-3 critical requirements
  // - "NOT_MATCHING": Missing ≥4 critical requirements

  // **Analysis Criteria:** Focus only on:
  // 1. Required hard skills/tools
  // 2. Required experience duration
  // 3. Required domain/industry expertise

  // Ignore: Company culture, mission statements, vague requirements.
  // You must start reasoning and think and analyze the job description and candidate experience carefully to be able to tell how much does the user fit the job
  // then at the end of your output when you have full image, output the result as a valid JSON object with the following structure:

  // **Output Format:**
  // \`\`\`json
  // {
  //   "missingSkills": ["specific missing skill or requirement"],
  //   "level": "Not Matching"
  // }
  // \`\`\`
  // `

  //       const userPrompt = `Evaluate this match.
  // ------
  // ## Candidate Experience
  // ${resume.markdownContent}
  // ------
  // ## Job Description
  // ${jobInfo.jobTitle}
  // ${jobInfo.jobDescription}

  // `

  //       let rawResponseText = ''

  //       if (strategy === 'native') {
  //         const completion = await llmService.generateCompletion({
  //           prompt: userPrompt,
  //           systemPrompt: systemPrompt,
  //           temperature: 0.1,
  //           format: 'json',
  //         })
  //         if (!completion.success) throw new Error(completion.error)
  //         rawResponseText = completion.text
  //       } else if (strategy === 'two-stage') {
  //         // Stage 1: Think
  //         const thinkPrompt = `Analyze the match between this resume and job description. Think step-by-step about skills, experience, and requirements.

  // Job: ${jobInfo.jobTitle}
  // Desc: ${jobInfo.jobDescription}
  // Resume: ${resume.markdownContent}`

  //         const thinkCompletion = await llmService.generateCompletion({
  //           prompt: thinkPrompt,
  //           systemPrompt: 'You are an expert recruiter. Analyze the candidate fit in detail.',
  //           temperature: 0.7,
  //         })

  //         if (!thinkCompletion.success) throw new Error(thinkCompletion.error)

  //         // Stage 2: Transform
  //         const transformPrompt = `Based on your analysis below, create the final JSON score.

  // Analysis:
  // ${thinkCompletion.text}

  // Output JSON matching the schema: { level, headline, explanation, matchingSkills, missingSkills }`

  //         const jsonCompletion = await llmService.generateCompletion({
  //           prompt: transformPrompt,
  //           systemPrompt: systemPrompt, // Reuse JSON system prompt
  //           temperature: 0.1,
  //           format: 'json', // Try native if provider supports it, otherwise text
  //         })

  //         if (!jsonCompletion.success) throw new Error(jsonCompletion.error)
  //         rawResponseText = jsonCompletion.text
  //       } else {
  //         // Strategy: 'extract' (Default)
  //         const completion = await llmService.generateCompletion({
  //           prompt: userPrompt,
  //           systemPrompt: systemPrompt,
  //           temperature: 0.1,
  //         })
  //         if (!completion.success) throw new Error(completion.error)
  //         rawResponseText = completion.text
  //       }

  //       // 4. Parse & Validate
  //       const scoreResult = parseAndValidateScore(rawResponseText)

  //       return {
  //         success: true,
  //         result: {
  //           ...scoreResult,
  //           jobId: jobInfo.id || 'unknown', // Adapter should provide ID or hash
  //           analyzedAt: new Date().toISOString(),
  //         },
  //       }
  //     } catch (e) {
  //       console.error('Analysis failed:', e)
  //       return {
  //         success: false,
  //         error: e instanceof Error ? e.message : 'Unknown analysis error',
  //       }
  //     }
  //   }

  return { success: false, error: 'Unknown message type' }
}

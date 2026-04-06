import { useState, useEffect, useRef, useCallback } from "react";
import type { FocusedFieldInfo } from "../inputLabelWatcher";
import { capturedJobStorage } from "../../shared/storage/capturedJob";
import { resumeStorage } from "../../shared/storage/resume";
import type { JobPostingInfo } from "../../adapters/types";
import { FILL_FIELD_SYSTEM_PROMPT } from "../../llm/agents/fill-field/prompts";
import { fillFieldAgent } from "../../llm/agents/fill-field";
import { usePageContext } from "../context/pageContext";
import Mustache from "mustache";
import { createProxiedFetch } from "../../shared/proxy-fetch";
import { createProxiedModel, is429Error } from "../../llm/content-model";
import type { AcquireModelResponse } from "../../shared/messaging/types";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import z from "zod";

// ---------------------------------------------------------------------------
// Field filling — triggers React/Angular/Vue synthetic events correctly
// ---------------------------------------------------------------------------

const suggestFieldValue = (setValue: (value: string) => void) =>
  tool(async (input) => setValue(input.value), {
    name: "suggest_field_value",
    description: "Provide the text value to fill in the form field.",
    schema: z.object({
      value: z.string().describe("The text to fill in the form field"),
    }),
  });

function fillInputField(el: HTMLElement, value: string) {
  if (el instanceof HTMLInputElement) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el instanceof HTMLTextAreaElement) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el.isContentEditable) {
    el.focus();
    document.execCommand("selectAll", false, undefined);
    document.execCommand("insertText", false, value);
  }
}

// ---------------------------------------------------------------------------
// Inline SVG spinner (no CSS keyframes needed)
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: "block" }}>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M 7 2 A 5 5 0 0 1 12 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 7 7"
          to="360 7 7"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Context badge
// ---------------------------------------------------------------------------

interface BadgeProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

function ContextBadge({ label, active, onToggle }: BadgeProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        border: active ? "1px solid rgba(31,177,84,0.4)" : "1px solid rgba(255,255,255,0.15)",
        background: active ? "rgba(31,177,84,0.12)" : "transparent",
        color: active ? "#4ade80" : "#71717a",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
        transition: "all 0.15s",
        pointerEvents: "auto",
      }}
    >
      {label}
      <span style={{ opacity: 0.7, fontSize: 10 }}>{active ? "×" : "+"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main popup
// ---------------------------------------------------------------------------

interface AutoFillPopupProps {
  focusedField: FocusedFieldInfo;
  onClose: () => void;
}

type AgentStatus = "idle" | "running" | "error";

export function AutoFillPopup({ focusedField, onClose }: AutoFillPopupProps) {
  const { detectedJob } = usePageContext();

  const [prompt, setPrompt] = useState("");
  const [capturedJob, setCapturedJob] = useState<JobPostingInfo | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [agentError, setAgentError] = useState<string | undefined>();

  const [inclLabel, setInclLabel] = useState(true);
  const [inclResume, setInclResume] = useState(true);
  const [inclJob, setInclJob] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputEl = focusedField.inputElement;

  // Fetch available context on mount
  useEffect(() => {
    capturedJobStorage.get().then(setCapturedJob);
    resumeStorage.hasResume().then(setHasResume);
  }, []);

  // Auto-focus the prompt textarea
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Dismiss on Escape (capture phase so we beat the page)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  // Disable/re-enable the target field while generating
  useEffect(() => {
    if (!(inputEl instanceof HTMLInputElement || inputEl instanceof HTMLTextAreaElement)) return;
    inputEl.disabled = agentStatus === "running";
    return () => {
      inputEl.disabled = false;
    };
  }, [agentStatus, inputEl]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || agentStatus === "running") return;

    const variables: Record<string, string> = {};
    const fieldLabel = focusedField.label || focusedField.placeholder;
    if (inclLabel && fieldLabel) variables.fieldLabel = fieldLabel;
    if (inclJob && (capturedJob ?? detectedJob)) {
      const job = capturedJob ?? detectedJob;
      if (job) {
        variables.jobDescription = [
          `${job.jobTitle}${job.companyName ? ` at ${job.companyName}` : ""}`,
          job.jobDescription,
        ].join("\n\n");
      }
    }
    if (inclResume && hasResume) {
      const resume = await resumeStorage.getResume();
      if (resume) variables.resume = resume.markdownContent;
    }

    const systemPrompt = Mustache.render(FILL_FIELD_SYSTEM_PROMPT, variables);

    setAgentStatus("running");
    setAgentError(undefined);

    let lastKey: string | undefined;

    const attemptRun = async (attempt: number): Promise<void> => {
      const resp = (await chrome.runtime.sendMessage({
        type: "ACQUIRE_MODEL",
        payload: { purpose: "complete-fields" },
      })) as AcquireModelResponse;

      if (!resp.success || !resp.model) {
        throw new Error(resp.error ?? "No models available");
      }
      lastKey = resp.model.key;
      const agent = createAgent({
        model: createProxiedModel(resp.model, createProxiedFetch()),
        tools: [suggestFieldValue((value: string) => fillInputField(inputEl, value))],
      });

        try {

          const response = await agent.invoke({
            messages: [new SystemMessage(systemPrompt), new HumanMessage(prompt)],
          })

          console.log(response);

          // for await (const event of fillFieldAgent.run(
          //   { messages: langchainMessages, variables },
          //   model,
          // )) {
          //   if (event.type === "tool_result" && event.toolName === "suggest_field_value") {
          //     const result = event.result as { value?: string };
          //     if (result?.value && inputEl) {
          //       fillInputField(inputEl, result.value);
          //       chrome.runtime
          //         .sendMessage({
          //           type: "RECORD_MODEL_SUCCESS",
          //           payload: { key: lastKey!, inputTokens: 0, outputTokens: 0 },
          //         })
          //         .catch(() => {});
          //       onClose();
          //       return;
          //     }
          //   }
          // }
          // chrome.runtime
          //   .sendMessage({
          //     type: "RECORD_MODEL_SUCCESS",
          //     payload: { key: lastKey!, inputTokens: 0, outputTokens: 0 },
          //   })
          //   .catch(() => {});
          setAgentStatus("idle");
        } catch (err) {
          if (is429Error(err) && attempt < 2) {
            chrome.runtime
              .sendMessage({ type: "RECORD_MODEL_THROTTLE", payload: { key: lastKey! } })
              .catch(() => {});
            return attemptRun(attempt + 1);
          }
          chrome.runtime
            .sendMessage({
              type: "RECORD_MODEL_ERROR",
              payload: { key: lastKey!, error: String(err) },
            })
            .catch(() => {});
          throw err;
        }
    };

    try {
      await attemptRun(0);
    } catch (err) {
      console.error("SuperFit: fill field error:", err);
      setAgentStatus("error");
      setAgentError(err instanceof Error ? err.message : String(err));
    }
  }, [
    prompt,
    agentStatus,
    inclLabel,
    inclJob,
    inclResume,
    capturedJob,
    detectedJob,
    hasResume,
    focusedField,
    inputEl,
    onClose,
  ]);

  const isGenerating = agentStatus === "running";
  const fieldLabel = focusedField.label || focusedField.placeholder;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: 520,
        maxWidth: "calc(100vw - 48px)",
        background: "#18181b",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        padding: "10px 12px 12px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13,
        color: "#e4e4e7",
        pointerEvents: "auto",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#52525b",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          SuperFit · Auto Fill
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#52525b",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            pointerEvents: "auto",
          }}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {isGenerating ? (
        /* Generating state */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#4ade80",
            padding: "10px 0",
          }}
        >
          <Spinner />
          <span>Filling field…</span>
        </div>
      ) : agentStatus === "error" ? (
        /* Error state */
        <div style={{ color: "#f87171", padding: "10px 0", fontSize: 12 }}>
          <div style={{ marginBottom: 6 }}>Failed to fill field.</div>
          {agentError && <div style={{ opacity: 0.7, wordBreak: "break-word" }}>{agentError}</div>}
          <button
            onClick={() => setAgentStatus("idle")}
            style={{
              marginTop: 8,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 6,
              color: "#f87171",
              cursor: "pointer",
              fontSize: 12,
              padding: "4px 10px",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Context badges */}
          {(fieldLabel || hasResume || capturedJob) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {fieldLabel && (
                <ContextBadge
                  label={`field: ${fieldLabel}`}
                  active={inclLabel}
                  onToggle={() => setInclLabel((v) => !v)}
                />
              )}
              {hasResume && (
                <ContextBadge
                  label="resume"
                  active={inclResume}
                  onToggle={() => setInclResume((v) => !v)}
                />
              )}
              {capturedJob && (
                <ContextBadge
                  label={[capturedJob.jobTitle, capturedJob.companyName]
                    .filter(Boolean)
                    .join(" @ ")}
                  active={inclJob}
                  onToggle={() => setInclJob((v) => !v)}
                />
              )}
            </div>
          )}

          {/* Prompt input */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe what to write…"
            rows={2}
            style={{
              width: "100%",
              background: "#27272a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "#e4e4e7",
              fontSize: 13,
              fontFamily: "inherit",
              padding: "8px 10px",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#3f3f46" }}>
              Enter ↵ to fill · Shift+Enter for new line
            </span>
          </div>
        </>
      )}
    </div>
  );
}

# Messaging and Events

## Purpose

Because SuperFit is a browser extension (Manifest V3), its UI components (the popup on a job page, the options page) run in separate memory spaces from the long-running background service worker. This messaging architecture outlines how these isolated parts communicate to test LLM connections, list models, and synchronize streaming data.

## Two Types of Communication

The system utilizes two distinct Chrome messaging interfaces:

1. **Long-lived Port connections (`chrome.runtime.connect`)**: Used for real-time, threaded job analysis and reading streaming LLM output.
2. **One-off Runtime Messages (`chrome.runtime.sendMessage`)**: Used for quick request/response actions, like listing providers in the Options UI.

## Threaded Port Messaging

This covers continuous streaming functionality. The background holds the thread state, and any number of connected UI components can sync that state or send new prompts.

Contracts are defined in [src/shared/messaging/thread-types.ts](src/shared/messaging/thread-types.ts). The UI interacts via [src/shared/hooks/useLLMThread.ts](src/shared/hooks/useLLMThread.ts), and the background processes them in [src/background/services/thread.ts](src/background/services/thread.ts).

### Port Events and Payloads

- `INIT_STATE`: Dispatched by the background immediately after a new UI component connects to a port. Provides the complete **ThreadState** (history, streaming state, tokens) so the UI can catch up.
- `SEND_PROMPT`: Sent by the UI to start an analysis or a chat follow-up. Contains user/system messages, prompt variables, and available tools.
- `STREAM_UPDATE`: Broadcasted by the background service repeatedly during LLM generation. Contains incremental chunks of text or tool calls to display a live "typing" effect.
- `STATE_UPDATE`: Broadcasted by the background to fully overwrite the thread state across all listeners. Used when generation begins, or when changing from streaming to idle status.
- `STREAM_DONE`: A concluding signal sent by the background when generation finishes, containing the finalized assistant message.
- `ERROR`: Indicates a failure in the LLM service layer (e.g., model crashed, timeout) so the UI can display an alert.

## One-off Runtime Messages

For UI actions that do not require state preservation or streaming, the extension relies on single-fire messages. These are primarily used by the model configuration page.

Contracts are defined in [src/shared/messaging/types.ts](src/shared/messaging/types.ts). The background handles them via a central listener in [src/background/index.ts](src/background/index.ts).

### Message Action Types

- `LIST_LLM_PROVIDERS`: Asks the background for a list of all registered **LLMProvider** classes and their required config schemas.
- `TEST_LLM_CONNECTION`: Sends a user's typed server URL or API key to the background to verify the endpoint is reachable.
- `GET_LLM_MODELS`: Queries the background (and subsequently the selected AI provider) for a catalog of usable model IDs (e.g., returning "llama3.2" or "gemini").

## Extensibility

The messaging contracts act as the strict boundary between UI and backend. Adding a new interaction type (say, logging analytics) requires defining a new static type in the shared messaging interfaces and implementing a matching handler in the background message listener.

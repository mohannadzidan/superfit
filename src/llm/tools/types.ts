// Re-export LangChain tool primitives so agent files import from one place
export { StructuredTool, tool } from '@langchain/core/tools'
export type { ToolDefinition } from '@langchain/core/language_models/base'

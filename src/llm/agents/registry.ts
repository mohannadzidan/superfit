import { Agent } from "./types";

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  register(agent: Agent): void {
    if (this.agents.has(agent.agentId)) {
      console.warn(`Agent ${agent.agentId} is already registered.`);
      return;
    }
    this.agents.set(agent.agentId, agent);
  }

  getAgent(agentId: string): Agent | null {
    return this.agents.get(agentId) ?? null;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new AgentRegistry();

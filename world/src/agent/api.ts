import { AgentBridge, COMMAND_HELP, type AgentCommand, type AgentHost } from './bridge';
import { describeObservation, type Observation } from './observation';

export const AGENT_API_VERSION = 1;

/** The object published as `window.catchDavel` for agents, test harnesses, and the MCP server. */
export interface CatchDavelAgentApi {
  readonly version: number;
  /** Command reference, for putting into a prompt. */
  readonly help: string;
  /** Structured view of the game right now (also drains the event log). */
  observe(): Observation;
  /** The same as a short text briefing. */
  describe(): string;
  /** Runs commands in lockstep; the world is frozen between calls. */
  act(commands: AgentCommand | readonly AgentCommand[]): { results: string[]; observation: Observation; briefing: string };
  /** Gives control back to a human: the game runs in real time again. */
  release(): void;
}

export function createAgentApi(host: AgentHost): CatchDavelAgentApi {
  const bridge = new AgentBridge(host);
  return {
    version: AGENT_API_VERSION,
    help: COMMAND_HELP,
    observe: () => bridge.observe(),
    describe: () => bridge.describe(),
    act: (commands) => {
      const { results, observation } = bridge.act(commands);
      return { results, observation, briefing: describeObservation(observation) };
    },
    release: () => bridge.release(),
  };
}

import { createAgentApi } from './agent/api';
import { Game } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#view');
if (canvas === null) throw new Error('Missing #view canvas');
const game = new Game(canvas);
game.start();
// Always available, in development and in the published game: lets LLM agents and scripts play (see AGENTS.md).
(window as unknown as { zamaSniper: unknown }).zamaSniper = createAgentApi(game.agentHost());
if (import.meta.env.DEV) (window as unknown as { zamaSniperWorld: unknown }).zamaSniperWorld = game.debug();

import { createAgentApi } from './agent/api';
import { Game } from './game';
import { setupInstallPrompt } from './ui/install-prompt';
import { isTouchDevice } from './ui/touch-controls';

const canvas = document.querySelector<HTMLCanvasElement>('#view');
if (canvas === null) throw new Error('Missing #view canvas');
const game = new Game(canvas);
game.start();
// Always available, in development and in the published game: lets LLM agents and scripts play (see AGENTS.md).
(window as unknown as { zamaSniper: unknown }).zamaSniper = createAgentApi(game.agentHost());
if (import.meta.env.DEV) (window as unknown as { zamaSniperWorld: unknown }).zamaSniperWorld = game.debug();

// Installable app: the service worker lets it start and play offline (published builds only; development serves
// fresh files), and phones and tablets are offered an Install / Later / No thanks sheet on the menu.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}
setupInstallPrompt({ mobile: isTouchDevice(), canShow: () => !document.body.classList.contains('playing') });

import { Game } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#view');
if (canvas === null) throw new Error('Missing #view canvas');
const game = new Game(canvas);
game.start();
if (import.meta.env.DEV) (window as unknown as { catchDavelWorld: unknown }).catchDavelWorld = game.debug();

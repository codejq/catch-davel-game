import './style.css';
import { startBrowserGame } from './runtime/browser-runtime';

void startBrowserGame().catch((error: unknown) => {
  document.body.dataset.workerStatus = 'error';
  console.error('Catch Davel failed to start', error);
});

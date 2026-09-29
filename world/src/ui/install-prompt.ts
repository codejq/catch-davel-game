/**
 * Offers to install the game as an app on phones and tablets: a sheet that slides up over the menu with
 * Install, Later, and No thanks. The answer is remembered: "No thanks" is never asked again, "Later" waits a few
 * days, and an installed game (or one already running as an app) is never asked at all.
 *
 * Android and other Chromium browsers hand us the real install dialog (`beforeinstallprompt`), so Install opens
 * it. iPhone and iPad Safari have no such dialog, so the sheet shows the two taps that add it to the home screen.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Stored = { readonly state: 'never' } | { readonly state: 'installed' } | { readonly state: 'later'; readonly until: number };

const KEY = 'zama-sniper-install';
/** How long "Later" waits before asking again. */
export const LATER_DAYS = 3;
/** How long after the page opens before the first offer, so it doesn't jump at the player straight away. */
const FIRST_DELAY_MS = 3500;

export function readChoice(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Stored | null {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? 'null') as Stored | null;
    return parsed !== null && ['never', 'installed', 'later'].includes(parsed.state) ? parsed : null;
  } catch {
    return null;
  }
}

function remember(choice: Stored): void {
  try { safeStorage()?.setItem(KEY, JSON.stringify(choice)); } catch { /* storage blocked: we may ask again next time */ }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

/** Whether to offer installing now, given what the player answered before. */
export function shouldOffer(choice: Stored | null, now = Date.now()): boolean {
  if (choice === null) return true;
  if (choice.state === 'later') return now >= choice.until;
  return false;
}

function runningAsApp(): boolean {
  return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Starts listening. `canShow` says whether the sheet may appear right now (the game only allows it on the menu,
 * never in the middle of a fight); the offer waits until it may.
 */
export function setupInstallPrompt(options: { readonly mobile: boolean; readonly canShow: () => boolean }): void {
  if (!options.mobile || runningAsApp()) return;
  let deferred: InstallPromptEvent | null = null;
  let shown = false;
  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
  });
  addEventListener('appinstalled', () => { remember({ state: 'installed' }); close(); });
  if (!shouldOffer(readChoice())) return;

  let sheet: HTMLElement | null = null;
  const close = (): void => {
    if (sheet === null) return;
    const closing = sheet;
    sheet = null;
    closing.classList.remove('open');
    setTimeout(() => closing.remove(), 350);
  };
  const later = (): void => { remember({ state: 'later', until: Date.now() + LATER_DAYS * 86_400_000 }); close(); };
  const never = (): void => { remember({ state: 'never' }); close(); };

  const open = (): void => {
    shown = true;
    const ios = isIos();
    const native = deferred !== null;
    sheet = document.createElement('div');
    sheet.className = 'install-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'install-title');
    const how = native ? '' : ios
      ? '<ol class="install-steps"><li>Tap <b>Share</b> <span class="glyph">⬆︎</span> in Safari’s toolbar</li><li>Choose <b>Add to Home Screen</b> <span class="glyph">＋</span></li></ol>'
      : '<ol class="install-steps"><li>Open the browser menu <span class="glyph">⋮</span></li><li>Choose <b>Install app</b> or <b>Add to Home screen</b></li></ol>';
    sheet.innerHTML = `
      <div class="install-card">
        <img src="./icons/icon-192.png" alt="" width="64" height="64" />
        <div class="install-text">
          <h2 id="install-title">Install Zama Sniper</h2>
          <p>Play full screen from your home screen, start faster, and keep playing offline.</p>
          ${how}
        </div>
        <div class="install-actions">
          <button type="button" class="primary" data-choice="install">${native ? 'Install' : 'Got it'}</button>
          <button type="button" data-choice="later">Later</button>
          <button type="button" data-choice="never">No thanks</button>
        </div>
      </div>`;
    sheet.addEventListener('click', (event) => {
      const choice = (event.target as HTMLElement).closest<HTMLElement>('[data-choice]')?.dataset.choice;
      if (choice === 'later') later();
      else if (choice === 'never') never();
      else if (choice === 'install') {
        if (deferred === null) { later(); return; }
        const prompt = deferred;
        deferred = null;
        void prompt.prompt().then(() => prompt.userChoice).then(({ outcome }) => {
          if (outcome === 'accepted') { remember({ state: 'installed' }); close(); } else later();
        }).catch(later);
      } else if (event.target === sheet) later();
    });
    sheet.addEventListener('keydown', (event) => { if (event.key === 'Escape') later(); });
    document.body.append(sheet);
    // Never stand in the way of play: if a game starts while the sheet is up, step aside (asking again next visit).
    const watch = setInterval(() => {
      if (sheet === null) clearInterval(watch);
      else if (!options.canShow()) { clearInterval(watch); close(); }
    }, 300);
    requestAnimationFrame(() => {
      sheet?.classList.add('open');
      sheet?.querySelector<HTMLButtonElement>('.primary')?.focus();
    });
  };

  // Wait a moment after the page opens (and for Chromium's install event), then offer as soon as the menu is up.
  const started = Date.now();
  const timer = setInterval(() => {
    if (shown) { clearInterval(timer); return; }
    const waited = Date.now() - started;
    if (waited < FIRST_DELAY_MS || !options.canShow()) return;
    // Chromium usually fires its install event within a few seconds; give it a little longer before falling back
    // to instructions.
    if (deferred === null && !isIos() && waited < FIRST_DELAY_MS + 3000) return;
    clearInterval(timer);
    open();
  }, 500);
}

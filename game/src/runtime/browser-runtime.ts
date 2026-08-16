import { WorkerAgentController } from '../agent/worker-api';
import { createRendererHost } from '../render/renderer-host';
import type { RenderGameState, RenderPresentationSettings } from '../render/render-model';
import { DEFAULT_LEVEL_SEED, LOOK_SCALE } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { createPlatformProfileRepository } from '../storage/platform';
import { createDefaultProfile, updateProfile, type ProfileV1 } from '../storage/profile';
import { exportProfileFile, importProfileFile } from '../storage/profile-transfer';
import type { DecodedGameEvent } from '../transport/event-channel';
import { SimulationWorkerClient } from './simulation-worker-client';
import {
  CAMPAIGN_LEVEL_1_WEAPON_MASK, normalizeWeaponUpgradeLevels, TRAINING_WEAPON_MASK,
  type WeaponId, type WeaponUpgradeId,
} from '../sim/weapons';
import { purchaseWeaponUpgrade, weaponUpgradeCost } from '../storage/economy';
import { chapter01Level } from '../content/levels/chapter-01';
import { CHAPTER_01_LEVEL_IDS, isChapter01LevelId } from '../content/level-ids';
import {
  completeCampaignLevel, recordCampaignAttempt, recordCampaignDefeat, recordCampaignRobotDefeat,
} from '../campaign/progression';
import { nextUnlockedWeapon, virtualStickVector } from './touch-input';
import { ProceduralAudio, type AudioCue } from '../audio/procedural-audio';
import { audioRuntimeProfile, musicRuntimeProfile } from '../content/runtime-manifests';
import { presentationFeedback } from './presentation-feedback';
import { ProceduralMusicSequencer } from '../audio/music-sequencer';
import { freezeDanceWindow } from '../sim/level-mechanics';
import { localizedContentString, releaseLocalizationCatalog } from '../content/localization/catalogs';
import { runtimeUiText, type RuntimeUiKey } from '../content/localization/runtime-ui';

const WEAPON_UI_KEYS: Readonly<Record<WeaponId, RuntimeUiKey>> = {
  pulse: 'pulse', sword: 'sword', bomb: 'bomb', laser: 'laser',
};

const UPGRADE_UI_KEYS: Readonly<Record<WeaponUpgradeId, {
  readonly name: RuntimeUiKey;
  readonly description: RuntimeUiKey;
}>> = {
  pulseDamage: { name: 'pulseDamageName', description: 'pulseDamageDescription' },
  pulseEfficiency: { name: 'pulseEfficiencyName', description: 'pulseEfficiencyDescription' },
  swordCooling: { name: 'swordCoolingName', description: 'swordCoolingDescription' },
  bombCapacity: { name: 'bombCapacityName', description: 'bombCapacityDescription' },
  laserCooling: { name: 'laserCoolingName', description: 'laserCoolingDescription' },
};

function requireCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>('#game');
  if (element === null) throw new Error('Game canvas is missing');
  return element;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Required HUD element ${selector} is missing`);
  return element;
}

export async function startBrowserGame(): Promise<void> {
  const parameters = new URLSearchParams(location.search);
  const bossTraining = parameters.get('encounter') === 'boss-training';
  const trainingMode = parameters.get('arsenal') === 'training' || bossTraining;
  const requestedLevelId = parameters.get('level');
  let activeLevelId = requestedLevelId !== null && isChapter01LevelId(requestedLevelId)
    ? requestedLevelId : bossTraining ? 'level-010' : 'level-001';
  let activeLevel = chapter01Level(activeLevelId);
  let canvas = requireCanvas();
  const renderer = await createRendererHost(canvas, {
    forceMainThread: parameters.get('renderer') === 'main',
    onError: (error) => console.warn('Offscreen renderer issue', error),
  });
  canvas = renderer.canvas;
  document.body.dataset.rendererMode = renderer.mode;
  const healthHud = requireElement<HTMLElement>('#health');
  const energyHud = requireElement<HTMLElement>('#energy');
  const coinsHud = requireElement<HTMLElement>('#coins');
  const remainingHud = requireElement<HTMLElement>('#remaining');
  const objectiveTitle = requireElement<HTMLElement>('#objective-title');
  const crosshair = requireElement<HTMLElement>('#crosshair');
  const combatMessage = requireElement<HTMLElement>('#combat-message');
  const weaponStatus = requireElement<HTMLElement>('#weapon-status');
  const shop = requireElement<HTMLElement>('#shop');
  const shopCoins = requireElement<HTMLElement>('#shop-coins');
  const campaignButton = requireElement<HTMLButtonElement>('#campaign-button');
  const campaignMap = requireElement<HTMLElement>('#campaign-map');
  const campaignClose = requireElement<HTMLButtonElement>('#campaign-close');
  const campaignLevels = requireElement<HTMLElement>('#campaign-levels');
  const profileExport = requireElement<HTMLButtonElement>('#profile-export');
  const profileImport = requireElement<HTMLButtonElement>('#profile-import');
  const profileTransferStatus = requireElement<HTMLOutputElement>('#profile-transfer-status');
  const settingsPanel = requireElement<HTMLDetailsElement>('#settings-panel');
  const settingLanguage = requireElement<HTMLSelectElement>('#setting-language');
  const settingSensitivity = requireElement<HTMLInputElement>('#setting-sensitivity');
  const settingMaster = requireElement<HTMLInputElement>('#setting-master');
  const settingMusic = requireElement<HTMLInputElement>('#setting-music');
  const settingEffects = requireElement<HTMLInputElement>('#setting-effects');
  const settingReducedMotion = requireElement<HTMLInputElement>('#setting-reduced-motion');
  const settingHighContrast = requireElement<HTMLInputElement>('#setting-high-contrast');
  const settingsStatus = requireElement<HTMLOutputElement>('#settings-status');
  const levelName = requireElement<HTMLElement>('#level-name');
  const movePad = requireElement<HTMLElement>('#move-pad');
  const moveStick = requireElement<HTMLElement>('#move-stick');
  const touchFire = requireElement<HTMLButtonElement>('#touch-fire');
  const touchAlt = requireElement<HTMLButtonElement>('#touch-alt');
  const touchWeapon = requireElement<HTMLButtonElement>('#touch-weapon');
  document.body.dataset.loadout = trainingMode ? 'training' : 'campaign';
  document.body.dataset.encounter = bossTraining ? 'boss-training' : 'campaign';
  const profileStorage = createPlatformProfileRepository();
  const profileRepository = profileStorage.repository;
  document.body.dataset.profileStorage = profileStorage.backend;
  let activeProfile: ProfileV1;
  try {
    const loadedProfile = await profileRepository.load('default');
    activeProfile = loadedProfile ?? createDefaultProfile();
    if (loadedProfile === null) await profileRepository.save(activeProfile);
    document.body.dataset.profileReady = 'true';
  } catch (error) {
    activeProfile = createDefaultProfile();
    document.body.dataset.profileReady = 'error';
    console.warn('Catch Davel profile load failed; continuing without durable persistence', error);
  }
  if (!trainingMode && !activeProfile.unlockedLevelIds.includes(activeLevelId)) {
    activeLevelId = 'level-001';
    activeLevel = chapter01Level(activeLevelId);
  }
  document.body.dataset.levelId = activeLevelId;
  let renderState: RenderGameState | null = null;
  let renderPresentationSettings: RenderPresentationSettings = { reducedMotion: false };
  let messageTimeout = 0;
  let audio: ProceduralAudio | null = null;
  let music: ProceduralMusicSequencer | null = null;
  let profileWrite: Promise<void> = Promise.resolve();
  let humanSessionStarted = false;
  let agentController: WorkerAgentController;
  const feedbackTimers = new Map<string, number>();

  const localized = (key: string): string => localizedContentString(activeProfile.settings.language, key);
  const ui = (key: RuntimeUiKey, parameters?: Readonly<Record<string, string | number>>): string => (
    runtimeUiText(activeProfile.settings.language, key, parameters)
  );
  const applyProfileSettings = (): void => {
    const catalog = releaseLocalizationCatalog(activeProfile.settings.language);
    document.documentElement.lang = catalog.locale;
    document.documentElement.dir = catalog.direction;
    document.body.classList.toggle('reduced-motion', activeProfile.settings.reducedMotion);
    document.body.classList.toggle('high-contrast', activeProfile.settings.highContrast);
    renderPresentationSettings = { reducedMotion: activeProfile.settings.reducedMotion };
    document.title = ui('documentTitle');
    for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]')) {
      element.textContent = ui(element.dataset.uiText as RuntimeUiKey);
    }
    for (const element of document.querySelectorAll<HTMLElement>('[data-ui-aria]')) {
      element.setAttribute('aria-label', ui(element.dataset.uiAria as RuntimeUiKey));
    }
    levelName.textContent = `${ui('level')} ${activeLevelId.slice(-2)} · ${localized(activeLevel.nameKey).toLocaleUpperCase(catalog.locale)}`;
    objectiveTitle.textContent = localized(activeLevel.objectives[0]!.titleKey);
    settingLanguage.value = catalog.locale;
    settingSensitivity.value = String(activeProfile.settings.mouseSensitivity);
    settingMaster.value = String(activeProfile.settings.masterVolume);
    settingMusic.value = String(activeProfile.settings.musicVolume);
    settingEffects.value = String(activeProfile.settings.effectsVolume);
    settingReducedMotion.checked = activeProfile.settings.reducedMotion;
    settingHighContrast.checked = activeProfile.settings.highContrast;
    audio?.setOutputGain(activeProfile.settings.masterVolume * activeProfile.settings.effectsVolume);
    music?.setOutputGain(activeProfile.settings.masterVolume * activeProfile.settings.musicVolume);
    if (renderState !== null) renderer.present(renderState, renderPresentationSettings);
  };
  applyProfileSettings();

  const renderCampaignMap = (): void => {
    campaignLevels.replaceChildren(...CHAPTER_01_LEVEL_IDS.map((levelId, index) => {
      const button = document.createElement('button');
      const progress = activeProfile.levelProgress.find((entry) => entry.levelId === levelId);
      const unlocked = activeProfile.unlockedLevelIds.includes(levelId);
      button.type = 'button';
      button.className = `level-card${levelId === activeLevelId ? ' active' : ''}${progress?.completed ? ' completed' : ''}`;
      button.dataset.levelId = levelId;
      button.disabled = !unlocked;
      const number = document.createElement('b');
      number.textContent = `${ui('level')} ${String(index + 1).padStart(2, '0')}`;
      const title = document.createElement('span');
      title.textContent = localized(chapter01Level(levelId).nameKey);
      const status = document.createElement('small');
      status.textContent = !unlocked ? ui('locked') : progress?.completed
        ? ui('clearedBest', { ticks: progress.bestTicks ?? '—' })
        : levelId === activeLevelId ? ui('currentMission') : ui('ready');
      button.append(number, title, status);
      return button;
    }));
  };
  renderCampaignMap();

  const persistProfile = (profile: ProfileV1): void => {
    activeProfile = profile;
    if (trainingMode) return;
    profileWrite = profileWrite.then(() => profileRepository.save(profile)).catch((error: unknown) => {
      console.warn('Catch Davel profile save failed', error);
    });
  };

  settingsPanel.addEventListener('change', () => {
    const nextSettings = {
      language: settingLanguage.value === 'ar' ? 'ar' : 'en',
      mouseSensitivity: Number(settingSensitivity.value),
      masterVolume: Number(settingMaster.value),
      musicVolume: Number(settingMusic.value),
      effectsVolume: Number(settingEffects.value),
      reducedMotion: settingReducedMotion.checked,
      highContrast: settingHighContrast.checked,
    };
    persistProfile(updateProfile(activeProfile, { settings: nextSettings }));
    applyProfileSettings();
    renderCampaignMap();
    renderShop();
    updateHud(renderState ?? undefined);
    settingsStatus.textContent = ui('settingsSaved');
  });

  const beginHumanSession = (): void => {
    if (humanSessionStarted || agentController?.isAgentControlled()) return;
    humanSessionStarted = true;
    shop.classList.remove('open');
    persistProfile(recordCampaignAttempt(activeProfile, activeLevelId));
  };

  const ensureAudio = (): ProceduralAudio => {
    if (audio === null) {
      const context = new AudioContext();
      audio = new ProceduralAudio(
        context, audioRuntimeProfile(activeLevel.audio.presetId), activeLevel.audio.presetId,
        activeProfile.settings.masterVolume * activeProfile.settings.effectsVolume,
      );
      music = new ProceduralMusicSequencer(
        context, activeLevel.dance.bpm, musicRuntimeProfile(activeLevel.dance.presetId),
        activeProfile.settings.masterVolume * activeProfile.settings.musicVolume,
      );
    }
    return audio;
  };

  const sound = (cue: AudioCue, robotId?: number): void => {
    if (audio === null) return;
    const robot = robotId === undefined ? undefined : renderState?.robots.find((candidate) => candidate.id === robotId);
    const pan = robot === undefined || renderState === null
      ? 0 : Math.max(-1, Math.min(1, (robot.x - renderState.player.x) / 9));
    audio.play(cue, pan);
  };

  const showMessage = (text: string): void => {
    combatMessage.textContent = text;
    combatMessage.classList.add('show');
    window.clearTimeout(messageTimeout);
    messageTimeout = window.setTimeout(() => combatMessage.classList.remove('show'), 650);
  };

  function updateHud(state?: RenderGameState): void {
    if (state === undefined) return;
    healthHud.textContent = String(Math.ceil(state.player.health));
    energyHud.textContent = String(Math.floor(state.player.energy));
    coinsHud.textContent = String(state.player.coins);
    const remaining = state.robots.filter((robot) => robot.active).length;
    remainingHud.textContent = state.victory ? ui('mazeClear')
      : state.level.objectiveComplete ? ui('reachExit')
      : bossTraining
        ? ui('bossHealth', { health: Math.ceil(state.robots[0]?.health ?? 0), phase: state.robots[0]?.bossPhase ?? 1 })
        : state.level.encounter.pendingTicks > 0
          ? ui('shift', {
            wave: state.level.encounter.waveIndex + 2,
            waves: state.level.encounter.waveCount,
            ticks: state.level.encounter.pendingTicks,
          })
          : ui('remain', { count: remaining });
    const resource = state.player.selectedWeapon === 'bomb' ? ` · ${ui('bombs', { count: state.player.bombs })}`
      : state.player.selectedWeapon === 'sword' ? ` · ${ui('heat', { value: Math.ceil(state.player.swordHeat) })}`
      : state.player.selectedWeapon === 'laser'
        ? ` · ${ui('heat', { value: Math.ceil(state.player.laserHeat) })}${state.player.laserOverheated ? ` · ${ui('overheated')}` : ''}` : '';
    weaponStatus.textContent = `${ui(WEAPON_UI_KEYS[state.player.selectedWeapon])}${resource}`;
    touchWeapon.textContent = ui(WEAPON_UI_KEYS[state.player.selectedWeapon]);
    document.body.dataset.weapon = state.player.selectedWeapon;
  }

  const persistDurableState = (state: RenderGameState): void => {
    if (!humanSessionStarted || agentController.isAgentControlled()) return;
    if (state.player.coins > activeProfile.spendableCoins) {
      const earned = state.player.coins - activeProfile.spendableCoins;
      persistProfile(updateProfile(activeProfile, {
        totalCoins: activeProfile.totalCoins + earned,
        spendableCoins: state.player.coins,
      }));
    }
  };

  const processEvent = (event: DecodedGameEvent): void => {
    const feedback = presentationFeedback(event.type);
    if (feedback !== null) {
      if (!activeProfile.settings.reducedMotion) {
        for (const className of feedback.classes) {
          document.body.classList.remove(className);
          void document.body.offsetWidth;
          document.body.classList.add(className);
          window.clearTimeout(feedbackTimers.get(className));
          feedbackTimers.set(className, window.setTimeout(() => document.body.classList.remove(className), feedback.durationMs));
        }
      }
      if (feedback.vibration !== null && typeof navigator.vibrate === 'function') {
        navigator.vibrate(feedback.vibration as number | number[]);
      }
    }
    if (event.type === 'pulse-fired') sound('pulse');
    if (event.type === 'sword-swung' || event.type === 'sword-charged') sound(event.type === 'sword-charged' ? 'charged-sword' : 'sword');
    if (event.type === 'projectile-deflected') sound('deflect');
    if (event.type === 'bomb-thrown') sound('bomb-throw');
    if (event.type === 'bomb-detonated') { showMessage(ui('bombDetonated')); sound('bomb-detonate'); }
    if (event.type === 'laser-fired' && event.tick % 4 === 0) sound('laser');
    if (event.type === 'robot-hit') {
      crosshair.classList.add('hit');
      window.setTimeout(() => crosshair.classList.remove('hit'), 90);
      sound('robot-impact', event.robotId);
    }
    if (event.type === 'robot-fired') sound('robot-shot', event.robotId);
    if (event.type === 'robot-telegraph') sound('robot-telegraph', event.robotId);
    if (event.type === 'robot-melee') sound('robot-melee', event.robotId);
    if (event.type === 'robot-buff') { showMessage(ui('djBeat')); sound('dj-buff', event.robotId); }
    if (event.type === 'boss-phase') { showMessage(ui('bossPhase', { phase: event.value ?? 1 })); sound('boss-phase', event.robotId); }
    if (event.type === 'player-hit') {
      document.body.classList.add('hurt');
      window.setTimeout(() => document.body.classList.remove('hurt'), 130);
      sound('player-hit', event.robotId);
    }
    if (event.type === 'key-collected') {
      showMessage(ui('keyAcquired'));
      sound('key');
    }
    if (event.type === 'ambush-triggered') {
      showMessage(ui('ambush'));
      sound('ambush');
    }
    if (event.type === 'health-collected') {
      showMessage(ui('repair', { value: event.value ?? 0 }));
      sound('health');
    }
    if (event.type === 'energy-collected') {
      showMessage(ui('energyCell', { value: event.value ?? 0 }));
      sound('energy');
    }
    if (event.type === 'coin-collected') {
      showMessage(ui('cache', { value: event.value ?? 0 }));
      sound('coin');
    }
    if (event.type === 'door-opened') { showMessage(ui('doorOpened')); sound('door'); }
    if (event.type === 'checkpoint-activated') {
      showMessage(ui('checkpoint'));
      sound('checkpoint');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        void client.getCheckpoint().then((snapshot) => {
          if (snapshot !== null && humanSessionStarted && !agentController.isAgentControlled()) {
            persistProfile(updateProfile(activeProfile, { campaignCheckpoint: snapshot }));
          }
        }).catch((error: unknown) => console.warn('Catch Davel checkpoint save failed', error));
      }
    }
    if (event.type === 'objective-complete') { showMessage(ui('allDavelsDown')); sound('objective'); }
    if (event.type === 'exit-unlocked') showMessage(ui('exitOnline'));
    if (event.type === 'robot-defeated') {
      showMessage(ui('davelDown', { coins: event.coins ?? 0 }));
      sound('robot-defeat', event.robotId);
      if (humanSessionStarted && !agentController.isAgentControlled() && renderState !== null) {
        const reward = event.coins ?? 0;
        persistProfile(updateProfile(activeProfile, {
          totalCoins: activeProfile.totalCoins + reward,
          spendableCoins: renderState.player.coins,
          levelProgress: recordCampaignRobotDefeat(activeProfile, activeLevelId).levelProgress,
        }));
      }
    }
    if (event.type === 'victory') {
      showMessage(ui('victory'));
      sound('victory');
      if (humanSessionStarted && !agentController.isAgentControlled() && renderState !== null) {
        persistProfile(completeCampaignLevel(activeProfile, activeLevelId, renderState.tick));
        renderCampaignMap();
        window.setTimeout(() => {
          campaignMap.classList.add('open');
          campaignMap.setAttribute('aria-hidden', 'false');
          document.exitPointerLock();
        }, 700);
      }
    }
    if (event.type === 'defeat') {
      showMessage(ui('defeat'));
      sound('defeat');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(recordCampaignDefeat(activeProfile, activeLevelId));
      }
    }
  };

  const client = await SimulationWorkerClient.create({
    seed: activeLevel.seed,
    levelId: activeLevelId,
    initialCoins: trainingMode ? 0 : activeProfile.spendableCoins,
    mode: 'manual',
    unlockedWeaponMask: trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
    ...(trainingMode ? {} : { weaponUpgrades: normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades) }),
    encounter: bossTraining ? 'boss-training' : 'campaign',
    callbacks: {
      onSnapshot: (state) => {
        renderState = state;
        updateHud(state);
        const activeRobots = state.robots.filter((robot) => robot.active).length;
        const combatIntensity = Math.min(1, 0.22 + activeRobots / Math.max(1, state.robots.length) * 0.58
          + Math.min(0.2, state.projectiles.length * 0.025));
        const bossPhase = state.robots.reduce((phase, robot) => Math.max(phase, robot.bossPhase), 0);
        music?.update(
          state.tick, combatIntensity, freezeDanceWindow(state.levelId, state.tick).frozen, bossPhase,
          !state.victory && !state.defeat,
        );
        document.body.dataset.snapshotTick = String(state.tick);
      },
      onEvent: processEvent,
      onResync: (state) => {
        renderState = state;
        updateHud(state);
        persistDurableState(state);
        showMessage(ui('resynchronized'));
      },
      onError: (error) => {
        document.body.dataset.workerStatus = 'error';
        showMessage(ui('workerError'));
        console.error(error);
      },
    },
  });
  if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId) await client.loadSnapshot(activeProfile.campaignCheckpoint);
  await client.setMode('realtime');
  agentController = new WorkerAgentController(client, async () => {
    if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId) await client.loadSnapshot(activeProfile.campaignCheckpoint);
    else await client.reset(
      activeLevel.seed, trainingMode ? 0 : activeProfile.spendableCoins, false,
      trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
      trainingMode ? undefined : normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades),
      bossTraining ? 'boss-training' : 'campaign',
      activeLevelId,
    );
    await client.setMode('realtime');
    humanSessionStarted = false;
  });
  if (import.meta.env.DEV || import.meta.env.VITE_AGENT_API === '1') agentController.install();
  document.body.dataset.workerStatus = 'ready';

  let resumeAfterCampaignMap = false;
  const setCampaignMapOpen = (open: boolean): void => {
    campaignMap.classList.toggle('open', open);
    campaignMap.setAttribute('aria-hidden', String(!open));
    if (open) {
      resumeAfterCampaignMap = !renderState?.victory && !renderState?.defeat;
      shop.classList.remove('open');
      document.exitPointerLock();
      void client.setMode('manual');
    } else if (resumeAfterCampaignMap && !renderState?.victory && !renderState?.defeat) {
      resumeAfterCampaignMap = false;
      void client.setMode('realtime');
    }
  };
  campaignButton.hidden = trainingMode;
  campaignMap.hidden = trainingMode;
  campaignButton.addEventListener('click', () => setCampaignMapOpen(!campaignMap.classList.contains('open')));
  campaignClose.addEventListener('click', () => setCampaignMapOpen(false));
  campaignLevels.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-level-id]');
    const levelId = button?.dataset.levelId;
    if (button === null || button.disabled || levelId === undefined || !isChapter01LevelId(levelId)) return;
    if (levelId === activeLevelId) {
      setCampaignMapOpen(false);
      return;
    }
    const nextParameters = new URLSearchParams(location.search);
    nextParameters.set('level', levelId);
    location.search = nextParameters.toString();
  });

  const setProfileTransferBusy = (busy: boolean): void => {
    profileExport.disabled = busy;
    profileImport.disabled = busy;
  };
  profileExport.addEventListener('click', async () => {
    setProfileTransferBusy(true);
    profileTransferStatus.textContent = ui('exportPreparing');
    try {
      await profileWrite;
      const saved = await exportProfileFile(activeProfile);
      profileTransferStatus.textContent = saved ? ui('exported') : ui('exportCancelled');
    } catch (error) {
      profileTransferStatus.textContent = error instanceof Error
        ? ui('exportRejected', { error: error.message }) : ui('exportFailed');
    } finally {
      setProfileTransferBusy(false);
    }
  });
  profileImport.addEventListener('click', async () => {
    setProfileTransferBusy(true);
    profileTransferStatus.textContent = ui('importChoose');
    try {
      const imported = await importProfileFile();
      if (imported === null) {
        profileTransferStatus.textContent = ui('importCancelled');
        return;
      }
      if (!window.confirm(ui('replaceProgress'))) {
        profileTransferStatus.textContent = ui('importKept');
        return;
      }
      await profileWrite;
      await profileRepository.save(imported);
      const verified = await profileRepository.load('default');
      if (verified?.integrityChecksum !== imported.integrityChecksum) throw new Error('Imported profile read-back verification failed');
      activeProfile = verified;
      renderCampaignMap();
      profileTransferStatus.textContent = ui('imported');
      window.setTimeout(() => location.reload(), 250);
    } catch (error) {
      profileTransferStatus.textContent = error instanceof Error
        ? ui('importRejected', { error: error.message }) : ui('importFailed');
    } finally {
      setProfileTransferBusy(false);
    }
  });

  const renderShop = (): void => {
    const levels = normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades);
    shopCoins.textContent = String(activeProfile.spendableCoins);
    for (const button of shop.querySelectorAll<HTMLButtonElement>('button[data-upgrade]')) {
      const id = button.dataset.upgrade as WeaponUpgradeId;
      const localization = UPGRADE_UI_KEYS[id];
      const name = ui(localization.name);
      const level = levels[id];
      button.disabled = level >= 3;
      button.textContent = level >= 3
        ? ui('upgradeMax', { name })
        : ui('upgradePrice', { name, level: `${level} → ${level + 1}`, cost: weaponUpgradeCost(id, level) });
      button.title = ui(localization.description);
    }
  };
  renderShop();
  if (trainingMode) shop.hidden = true;
  shop.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-upgrade]');
    if (button === null || trainingMode || humanSessionStarted || agentController.isAgentControlled()) return;
    const id = button.dataset.upgrade as WeaponUpgradeId;
    try {
      const upgraded = purchaseWeaponUpgrade(activeProfile, id);
      persistProfile(upgraded);
      renderShop();
      void client.reset(
        activeLevel.seed, upgraded.spendableCoins, false, CAMPAIGN_LEVEL_1_WEAPON_MASK,
        normalizeWeaponUpgradeLevels(upgraded.weaponUpgrades),
        'campaign', activeLevelId,
      ).then(() => client.setMode('realtime')).catch((error: unknown) => console.error(error));
      showMessage(ui('upgradeInstalled', { name: ui(UPGRADE_UI_KEYS[id].name) }));
    } catch (error) {
      console.warn('Catch Davel upgrade rejected', error);
      showMessage(ui('upgradeFailed'));
    }
  });

  new ResizeObserver(() => renderer.resize()).observe(canvas);
  renderer.resize();
  const pressed = new Set<string>();
  let yawDelta = 0;
  let pitchDelta = 0;
  let fireQueued = false;
  let altFireQueued = false;
  let fireHeld = false;
  let queuedWeapon: WeaponId | null = null;
  let resumeAfterVisibility = false;
  let touchForward = 0;
  let touchStrafe = 0;
  let movePointerId: number | null = null;
  let lookPointerId: number | null = null;
  let lookClientX = 0;
  let lookClientY = 0;
  let lastTouchPointerAt = -Infinity;

  const beginTouchSession = (): void => {
    document.body.classList.add('touch-active');
    beginHumanSession();
    void ensureAudio().resume();
  };

  const updateMoveStick = (event: PointerEvent): void => {
    const bounds = movePad.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) * 0.33;
    const vector = virtualStickVector(
      event.clientX - (bounds.left + bounds.width / 2),
      event.clientY - (bounds.top + bounds.height / 2),
      radius,
    );
    touchStrafe = vector.strafe; touchForward = vector.forward;
    moveStick.style.transform = `translate(${vector.visualX}px, ${vector.visualY}px)`;
  };

  const releaseMoveStick = (event: PointerEvent): void => {
    if (event.pointerId !== movePointerId) return;
    movePointerId = null; touchForward = 0; touchStrafe = 0;
    moveStick.style.transform = '';
  };

  movePad.addEventListener('pointerdown', (event) => {
    if (movePointerId !== null || campaignMap.classList.contains('open') || shop.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession(); movePointerId = event.pointerId;
    movePad.setPointerCapture(event.pointerId); updateMoveStick(event);
  });
  movePad.addEventListener('pointermove', (event) => { if (event.pointerId === movePointerId) updateMoveStick(event); });
  movePad.addEventListener('pointerup', releaseMoveStick);
  movePad.addEventListener('pointercancel', releaseMoveStick);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || lookPointerId !== null || agentController.isAgentControlled()) return;
    event.preventDefault(); beginTouchSession(); lookPointerId = event.pointerId;
    lookClientX = event.clientX; lookClientY = event.clientY; lastTouchPointerAt = performance.now();
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointerId) return;
    yawDelta += (event.clientX - lookClientX) * LOOK_SCALE * 0.85 * activeProfile.settings.mouseSensitivity;
    pitchDelta -= (event.clientY - lookClientY) * LOOK_SCALE * 0.85 * activeProfile.settings.mouseSensitivity;
    lookClientX = event.clientX; lookClientY = event.clientY;
  });
  const releaseLook = (event: PointerEvent): void => { if (event.pointerId === lookPointerId) lookPointerId = null; };
  canvas.addEventListener('pointerup', releaseLook);
  canvas.addEventListener('pointercancel', releaseLook);

  touchFire.addEventListener('pointerdown', (event) => {
    event.preventDefault(); beginTouchSession(); touchFire.setPointerCapture(event.pointerId);
    fireHeld = true; touchFire.classList.add('active'); document.body.classList.add('firing');
  });
  const releaseTouchFire = (): void => {
    fireHeld = false; touchFire.classList.remove('active'); document.body.classList.remove('firing');
  };
  touchFire.addEventListener('pointerup', releaseTouchFire);
  touchFire.addEventListener('pointercancel', releaseTouchFire);
  touchAlt.addEventListener('pointerdown', (event) => {
    event.preventDefault(); beginTouchSession(); fireQueued = true; altFireQueued = true;
    touchAlt.classList.add('active');
  });
  touchAlt.addEventListener('pointerup', () => touchAlt.classList.remove('active'));
  touchAlt.addEventListener('pointercancel', () => touchAlt.classList.remove('active'));
  touchWeapon.addEventListener('pointerdown', (event) => {
    event.preventDefault(); beginTouchSession();
    if (renderState !== null) queuedWeapon = nextUnlockedWeapon(renderState.player.selectedWeapon, renderState.player.unlockedWeaponMask);
    touchWeapon.classList.add('active');
  });
  touchWeapon.addEventListener('pointerup', () => touchWeapon.classList.remove('active'));
  touchWeapon.addEventListener('pointercancel', () => touchWeapon.classList.remove('active'));

  const clearTouchInput = (): void => {
    touchForward = 0; touchStrafe = 0; movePointerId = null; lookPointerId = null;
    moveStick.style.transform = '';
    touchFire.classList.remove('active'); touchAlt.classList.remove('active'); touchWeapon.classList.remove('active');
    document.body.classList.remove('firing');
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pressed.clear(); fireHeld = false; fireQueued = false; altFireQueued = false;
      clearTouchInput();
      resumeAfterVisibility = !agentController.isAgentControlled()
        && !campaignMap.classList.contains('open') && !renderState?.victory && !renderState?.defeat;
      if (resumeAfterVisibility) void client.setMode('manual');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
      }
      document.body.dataset.suspended = 'true';
    } else {
      document.body.dataset.suspended = 'false';
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(updateProfile(activeProfile, { lastCleanShutdown: false }));
      }
      if (resumeAfterVisibility && !agentController.isAgentControlled()
        && !campaignMap.classList.contains('open') && !renderState?.victory && !renderState?.defeat) {
        resumeAfterVisibility = false;
        void client.setMode('realtime');
      }
    }
  });

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.code === 'KeyM' && !trainingMode && !agentController.isAgentControlled()) {
      event.preventDefault();
      setCampaignMapOpen(!campaignMap.classList.contains('open'));
      return;
    }
    if (event.code === 'KeyU' && !trainingMode && !humanSessionStarted && !agentController.isAgentControlled()) {
      event.preventDefault();
      shop.classList.toggle('open');
      if (shop.classList.contains('open')) document.exitPointerLock();
      return;
    }
    if (shop.classList.contains('open')) return;
    pressed.add(event.code);
    const weaponByCode: Partial<Record<string, WeaponId>> = { Digit1: 'pulse', Digit2: 'sword', Digit3: 'bomb', Digit4: 'laser' };
    queuedWeapon = weaponByCode[event.code] ?? queuedWeapon;
    beginHumanSession();
  });
  window.addEventListener('keyup', (event: KeyboardEvent) => pressed.delete(event.code));
  window.addEventListener('blur', () => { pressed.clear(); fireHeld = false; clearTouchInput(); });
  window.addEventListener('mousemove', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    yawDelta += event.movementX * LOOK_SCALE * activeProfile.settings.mouseSensitivity;
    pitchDelta -= event.movementY * LOOK_SCALE * activeProfile.settings.mouseSensitivity;
  });
  canvas.addEventListener('click', () => {
    if (agentController.isAgentControlled()) return;
    beginHumanSession();
    void ensureAudio().resume();
    if (performance.now() - lastTouchPointerAt > 500 && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  canvas.addEventListener('mousedown', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    if (event.button === 0) fireHeld = true;
    if (event.button === 2) { fireQueued = true; altFireQueued = true; }
    document.body.classList.add('firing');
  });
  window.addEventListener('mouseup', (event: MouseEvent) => {
    if (event.button === 0) fireHeld = false;
    document.body.classList.remove('firing');
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('locked', document.pointerLockElement === canvas);
  });
  window.addEventListener('pagehide', () => {
    if (humanSessionStarted && !agentController.isAgentControlled()) persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
    renderer.dispose();
    client.terminate();
  });

  const frame = (): void => {
    if (!agentController.isAgentControlled()) {
      const command: PlayerCommand = {
        forward: Math.max(-1, Math.min(1, Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown')) + touchForward)),
        strafe: Math.max(-1, Math.min(1, Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')) + touchStrafe)),
        yawDelta,
        pitchDelta,
        fire: fireQueued || fireHeld,
        altFire: altFireQueued,
        weapon: queuedWeapon,
      };
      client.sendInput(command);
      yawDelta = 0;
      pitchDelta = 0;
      fireQueued = false;
      altFireQueued = false;
      queuedWeapon = null;
    }
    if (renderState !== null) renderer.present(renderState, renderPresentationSettings);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

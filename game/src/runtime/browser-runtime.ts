import { WorkerAgentController } from '../agent/worker-api';
import { createRendererHost } from '../render/renderer-host';
import type { RenderGameState, RenderPresentationSettings } from '../render/render-model';
import { DEFAULT_LEVEL_SEED, LOOK_SCALE } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { createPlatformProfileRepository } from '../storage/platform';
import { createDefaultProfile, updateProfile, type ProfileV10 } from '../storage/profile';
import { exportProfileFile, importProfileFile } from '../storage/profile-transfer';
import type { DecodedGameEvent } from '../transport/event-channel';
import { SimulationWorkerClient } from './simulation-worker-client';
import {
  CAMPAIGN_LEVEL_1_WEAPON_MASK, normalizeWeaponUpgradeLevels, TRAINING_WEAPON_MASK,
  MAX_WEAPON_UPGRADE_LEVEL, type WeaponId, type WeaponUpgradeId,
} from '../sim/weapons';
import {
  playerUpgradeCost, purchasePlayerUpgrade, purchaseWeaponUpgrade, weaponUpgradeCost,
} from '../storage/economy';
import {
  MAX_PLAYER_UPGRADE_LEVEL, PLAYER_UPGRADE_IDS, normalizePlayerUpgradeLevels, type PlayerUpgradeId,
} from '../sim/player-upgrades';
import { chapter01Level } from '../content/levels/chapter-01';
import { CHAPTER_01_LEVEL_IDS, isChapter01LevelId } from '../content/level-ids';
import {
  bankCampaignCoins, completeCampaignLevel, recordCampaignAttempt, recordCampaignDefeat,
} from '../campaign/progression';
import { nextUnlockedWeapon, touchFireHeld, virtualStickVector } from './touch-input';
import { ProceduralAudio, type AudioCue } from '../audio/procedural-audio';
import { audioRuntimeProfile, musicRuntimeProfile } from '../content/runtime-manifests';
import { presentationFeedback } from './presentation-feedback';
import { ProceduralMusicSequencer } from '../audio/music-sequencer';
import { freezeDanceWindow } from '../sim/level-mechanics';
import { localizedContentString, releaseLocalizationCatalog } from '../content/localization/catalogs';
import { runtimeUiText, type RuntimeUiKey } from '../content/localization/runtime-ui';
import {
  DEFAULT_INPUT_BINDINGS, INPUT_ACTIONS, inputCodeLabel, normalizeInputBindings, rebindInput,
  type InputAction, type InputBindings,
} from '../storage/input-bindings';
import { projectStandardGamepad } from './gamepad-input';
import { campaignResultSummary, formatCampaignTicks, type CampaignResultSummary } from '../campaign/results';
import {
  AutoQualityController, browserRenderCapabilities, initialRenderQuality, normalizeRenderQuality,
  type RenderQualityPreference, type RenderQualityTier,
} from '../render/quality';
import {
  captionForEvent, relativeCaptionDirection, relativeThreatBearing, type CaptionDirection, type CaptionRequest,
} from './event-captions';
import { davelBarkRequest, type DavelBarkOccasion } from './davel-barks';
import { objectiveCompassReading, type ObjectiveCompassTarget } from './objective-compass';
import { waveTransitionPresentation } from './wave-transition';
import { bossPresentation } from './boss-presentation';
import { difficultyProfile, isDifficultyId } from '../sim/difficulty';
import { applyHumanAimAssist } from './human-aim-assist';
import { DavelMovementAudioSequencer } from './davel-movement-audio';
import { danceBeatPresentation, type DanceBeatPhase } from './dance-beat-presentation';
import { PULSE_MAX_SPREAD_RADIANS } from '../sim/combat';
import {
  PULSE_ENERGY_CELL_DURATION_TICKS, createPulseEnergyCellEffect,
} from '../render/presentation-particles';
import { LaserAudioSequencer, type LaserAudioRequest } from './laser-audio';
import {
  CHARGED_SWORD_ARC_DURATION_TICKS, SWORD_ARC_DURATION_TICKS, createSwordArcEffect,
} from '../render/sword-arc';
import { BombFuseAudioSequencer, type BombFuseAudioRequest } from '../audio/bomb-fuse-sequencer';
import { normalizePulseImpactKind } from '../render/pulse-impact';

const WEAPON_UI_KEYS: Readonly<Record<WeaponId, RuntimeUiKey>> = {
  pulse: 'pulse', sword: 'sword', bomb: 'bomb', laser: 'laser',
};

type ShopUpgradeId = WeaponUpgradeId | PlayerUpgradeId;

const UPGRADE_UI_KEYS: Readonly<Record<ShopUpgradeId, {
  readonly name: RuntimeUiKey;
  readonly description: RuntimeUiKey;
}>> = {
  pulseDamage: { name: 'pulseDamageName', description: 'pulseDamageDescription' },
  pulseEfficiency: { name: 'pulseEfficiencyName', description: 'pulseEfficiencyDescription' },
  swordCooling: { name: 'swordCoolingName', description: 'swordCoolingDescription' },
  bombCapacity: { name: 'bombCapacityName', description: 'bombCapacityDescription' },
  laserCooling: { name: 'laserCoolingName', description: 'laserCoolingDescription' },
  maxHealth: { name: 'maxHealthName', description: 'maxHealthDescription' },
  maxEnergy: { name: 'maxEnergyName', description: 'maxEnergyDescription' },
};

function isPlayerUpgradeId(id: ShopUpgradeId): id is PlayerUpgradeId {
  return (PLAYER_UPGRADE_IDS as readonly string[]).includes(id);
}

const INPUT_ACTION_UI_KEYS: Readonly<Record<InputAction, RuntimeUiKey>> = {
  forward: 'controlForward', back: 'controlBack', left: 'controlLeft', right: 'controlRight',
  sprint: 'controlSprint',
  fire: 'controlFire', altFire: 'controlAltFire', campaign: 'controlCampaign', shop: 'controlShop',
  weaponPulse: 'controlPulse', weaponSword: 'controlSword', weaponBomb: 'controlBomb', weaponLaser: 'controlLaser',
};

const CAPTION_DIRECTION_UI_KEYS: Readonly<Record<CaptionDirection, RuntimeUiKey>> = {
  left: 'directionLeft', center: 'directionCenter', right: 'directionRight',
};

const COMPASS_TARGET_UI_KEYS: Readonly<Record<ObjectiveCompassTarget, RuntimeUiKey>> = {
  key: 'compassKey', door: 'compassDoor', checkpoint: 'compassCheckpoint', exit: 'compassExit',
};

const DANCE_BEAT_PHASE_UI_KEYS: Readonly<Record<DanceBeatPhase, RuntimeUiKey>> = {
  neutral: 'danceBeatNeutral', attack: 'danceBeatAttack', vulnerable: 'danceBeatVulnerable', frozen: 'danceBeatFrozen',
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
    onContextStatus: (status) => { document.body.dataset.renderContext = status; },
  });
  canvas = renderer.canvas;
  document.body.dataset.rendererMode = renderer.mode;
  document.body.dataset.renderContext = 'ready';
  const healthHud = requireElement<HTMLElement>('#health');
  const energyHud = requireElement<HTMLElement>('#energy');
  const coinsHud = requireElement<HTMLElement>('#coins');
  const runScoreHud = requireElement<HTMLElement>('#run-score');
  const runComboHud = requireElement<HTMLElement>('#run-combo');
  const runStatsHud = requireElement<HTMLElement>('#run-stats');
  const remainingHud = requireElement<HTMLElement>('#remaining');
  const objectiveTitle = requireElement<HTMLElement>('#objective-title');
  const objectiveCompass = requireElement<HTMLElement>('#objective-compass');
  const objectiveCompassTarget = requireElement<HTMLElement>('#objective-compass-target');
  const objectiveCompassDistance = requireElement<HTMLElement>('#objective-compass-distance');
  const bossStatus = requireElement<HTMLElement>('#boss-status');
  const bossStatusPhase = requireElement<HTMLElement>('#boss-status-phase');
  const bossStatusHealth = requireElement<HTMLElement>('#boss-status-health');
  const bossStatusHp = requireElement<HTMLElement>('#boss-status-hp');
  const crosshair = requireElement<HTMLElement>('#crosshair');
  const damageDirection = requireElement<HTMLElement>('#damage-direction');
  const combatMessage = requireElement<HTMLElement>('#combat-message');
  const davelBark = requireElement<HTMLElement>('#davel-bark');
  const davelBarkSpeaker = requireElement<HTMLElement>('#davel-bark-speaker');
  const davelBarkLine = requireElement<HTMLElement>('#davel-bark-line');
  const waveTransition = requireElement<HTMLElement>('#wave-transition');
  const waveTransitionTitle = requireElement<HTMLElement>('#wave-transition-title');
  const waveTransitionTime = requireElement<HTMLElement>('#wave-transition-time');
  const soundCaptions = requireElement<HTMLElement>('#sound-captions');
  const danceBeatIndicator = requireElement<HTMLElement>('#dance-beat-indicator');
  const danceBeatSegments = Array.from({ length: 16 }, () => document.createElement('span'));
  danceBeatIndicator.replaceChildren(...danceBeatSegments);
  const weaponStatus = requireElement<HTMLElement>('#weapon-status');
  const shop = requireElement<HTMLElement>('#shop');
  const shopCoins = requireElement<HTMLElement>('#shop-coins');
  const campaignButton = requireElement<HTMLButtonElement>('#campaign-button');
  const pauseButton = requireElement<HTMLButtonElement>('#pause-button');
  const campaignMap = requireElement<HTMLElement>('#campaign-map');
  const campaignClose = requireElement<HTMLButtonElement>('#campaign-close');
  const campaignLevels = requireElement<HTMLElement>('#campaign-levels');
  const profileExport = requireElement<HTMLButtonElement>('#profile-export');
  const profileImport = requireElement<HTMLButtonElement>('#profile-import');
  const profileTransferStatus = requireElement<HTMLOutputElement>('#profile-transfer-status');
  const missionResults = requireElement<HTMLElement>('#mission-results');
  const resultsLevelName = requireElement<HTMLElement>('#results-level-name');
  const resultsMedal = requireElement<HTMLElement>('#results-medal');
  const resultsTime = requireElement<HTMLElement>('#results-time');
  const resultsBest = requireElement<HTMLElement>('#results-best');
  const resultsPar = requireElement<HTMLElement>('#results-par');
  const resultsCoins = requireElement<HTMLElement>('#results-coins');
  const resultsWallet = requireElement<HTMLElement>('#results-wallet');
  const resultsScore = requireElement<HTMLElement>('#results-score');
  const resultsAccuracy = requireElement<HTMLElement>('#results-accuracy');
  const resultsDamage = requireElement<HTMLElement>('#results-damage');
  const resultsRobots = requireElement<HTMLElement>('#results-robots');
  const resultsSecrets = requireElement<HTMLElement>('#results-secrets');
  const resultsCombo = requireElement<HTMLElement>('#results-combo');
  const resultsRobotBreakdown = requireElement<HTMLElement>('#results-robot-breakdown');
  const resultsObjectives = requireElement<HTMLUListElement>('#results-objectives');
  const resultsReplayProof = requireElement<HTMLElement>('#results-replay-proof');
  const resultsReplay = requireElement<HTMLButtonElement>('#results-replay');
  const resultsNext = requireElement<HTMLButtonElement>('#results-next');
  const resultsMap = requireElement<HTMLButtonElement>('#results-map');
  const missionFailed = requireElement<HTMLElement>('#mission-failed');
  const failureLevelName = requireElement<HTMLElement>('#failure-level-name');
  const failureRecovery = requireElement<HTMLElement>('#failure-recovery');
  const failureDavels = requireElement<HTMLElement>('#failure-davels');
  const failureCoins = requireElement<HTMLElement>('#failure-coins');
  const failureRetry = requireElement<HTMLButtonElement>('#failure-retry');
  const failureRestart = requireElement<HTMLButtonElement>('#failure-restart');
  const failureMap = requireElement<HTMLButtonElement>('#failure-map');
  const pauseMenu = requireElement<HTMLElement>('#pause-menu');
  const pauseLevelName = requireElement<HTMLElement>('#pause-level-name');
  const pauseResume = requireElement<HTMLButtonElement>('#pause-resume');
  const pauseLevels = requireElement<HTMLButtonElement>('#pause-levels');
  const settingsPanel = requireElement<HTMLDetailsElement>('#settings-panel');
  const settingDifficulty = requireElement<HTMLSelectElement>('#setting-difficulty');
  const settingLanguage = requireElement<HTMLSelectElement>('#setting-language');
  const settingSensitivity = requireElement<HTMLInputElement>('#setting-sensitivity');
  const settingQuality = requireElement<HTMLSelectElement>('#setting-quality');
  const settingTextScale = requireElement<HTMLInputElement>('#setting-text-scale');
  const settingCameraMotion = requireElement<HTMLInputElement>('#setting-camera-motion');
  const settingRecoilMotion = requireElement<HTMLInputElement>('#setting-recoil-motion');
  const settingShakeMotion = requireElement<HTMLInputElement>('#setting-shake-motion');
  const settingFlashIntensity = requireElement<HTMLInputElement>('#setting-flash-intensity');
  const settingMaster = requireElement<HTMLInputElement>('#setting-master');
  const settingMusic = requireElement<HTMLInputElement>('#setting-music');
  const settingEffects = requireElement<HTMLInputElement>('#setting-effects');
  const settingCombatVolume = requireElement<HTMLInputElement>('#setting-combat-volume');
  const settingWorldVolume = requireElement<HTMLInputElement>('#setting-world-volume');
  const settingInterfaceVolume = requireElement<HTMLInputElement>('#setting-interface-volume');
  const settingDynamicRange = requireElement<HTMLSelectElement>('#setting-dynamic-range');
  const settingReducedMotion = requireElement<HTMLInputElement>('#setting-reduced-motion');
  const settingHighContrast = requireElement<HTMLInputElement>('#setting-high-contrast');
  const settingCaptions = requireElement<HTMLInputElement>('#setting-captions');
  const settingPhotosensitivity = requireElement<HTMLInputElement>('#setting-photosensitivity');
  const settingTouchScale = requireElement<HTMLInputElement>('#setting-touch-scale');
  const settingTouchOpacity = requireElement<HTMLInputElement>('#setting-touch-opacity');
  const settingTouchOffset = requireElement<HTMLInputElement>('#setting-touch-offset');
  const settingTouchHandedness = requireElement<HTMLSelectElement>('#setting-touch-handedness');
  const settingTouchDeadZone = requireElement<HTMLInputElement>('#setting-touch-dead-zone');
  const settingTouchFireMode = requireElement<HTMLSelectElement>('#setting-touch-fire-mode');
  const settingSprintMode = requireElement<HTMLSelectElement>('#setting-sprint-mode');
  const settingsStatus = requireElement<HTMLOutputElement>('#settings-status');
  const inputBindingGrid = requireElement<HTMLElement>('#input-binding-grid');
  const inputBindingReset = requireElement<HTMLButtonElement>('#input-binding-reset');
  const levelName = requireElement<HTMLElement>('#level-name');
  const promptMission = requireElement<HTMLElement>('#prompt-mission');
  const promptBriefing = requireElement<HTMLElement>('#prompt-briefing');
  const movePad = requireElement<HTMLElement>('#move-pad');
  const moveStick = requireElement<HTMLElement>('#move-stick');
  const touchFire = requireElement<HTMLButtonElement>('#touch-fire');
  const touchSprint = requireElement<HTMLButtonElement>('#touch-sprint');
  const touchAlt = requireElement<HTMLButtonElement>('#touch-alt');
  const touchWeapon = requireElement<HTMLButtonElement>('#touch-weapon');
  document.body.dataset.loadout = trainingMode ? 'training' : 'campaign';
  document.body.dataset.encounter = bossTraining ? 'boss-training' : 'campaign';
  const profileStorage = createPlatformProfileRepository();
  const profileRepository = profileStorage.repository;
  document.body.dataset.profileStorage = profileStorage.backend;
  let activeProfile: ProfileV10;
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
  let activeInputBindings: InputBindings = normalizeInputBindings(activeProfile.inputMappings);
  let latestCampaignResult: CampaignResultSummary | null = null;
  document.body.dataset.levelId = activeLevelId;
  let renderState: RenderGameState | null = null;
  const renderCapabilities = browserRenderCapabilities();
  let qualityPreference: RenderQualityPreference = activeProfile.settings.renderQuality;
  let resolvedQuality: RenderQualityTier = qualityPreference === 'auto'
    ? initialRenderQuality(renderCapabilities) : qualityPreference;
  let autoQuality = new AutoQualityController(resolvedQuality);
  let renderPresentationSettings: RenderPresentationSettings = {
    motionScale: 1, flashScale: 1, qualityTier: resolvedQuality,
  };
  let messageTimeout = 0;
  let damageDirectionTimeout = 0;
  let barkTimeout = 0;
  let lastBarkTick = -10_000;
  let lastWaveTransitionKey: string | null = null;
  let audio: ProceduralAudio | null = null;
  let music: ProceduralMusicSequencer | null = null;
  const davelMovementAudio = new DavelMovementAudioSequencer();
  const laserAudio = new LaserAudioSequencer();
  const bombFuseAudio = new BombFuseAudioSequencer();
  let profileWrite: Promise<void> = Promise.resolve();
  let humanSessionStarted = false;
  let agentController: WorkerAgentController;
  const feedbackTimers = new Map<string, number>();
  const captionTimers = new Map<string, number>();
  const pendingPulseEffectTicks: number[] = [];
  const pendingSwordArcEvents: { readonly tick: number; readonly charged: boolean }[] = [];

  const emitPulseEffect = (tick: number, state: RenderGameState): void => {
    if (state.tick - tick >= PULSE_ENERGY_CELL_DURATION_TICKS) return;
    renderer.emitPulseEnergyCell(createPulseEnergyCellEffect(tick, state.player));
    document.body.dataset.pulseEnergyCellTick = String(tick);
  };

  const queuePulseEffect = (tick: number): void => {
    if (renderState !== null && renderState.tick >= tick) {
      emitPulseEffect(tick, renderState);
      return;
    }
    if (!pendingPulseEffectTicks.includes(tick)) pendingPulseEffectTicks.push(tick);
    if (pendingPulseEffectTicks.length > 4) pendingPulseEffectTicks.shift();
  };

  const flushPulseEffects = (state: RenderGameState): void => {
    while (pendingPulseEffectTicks.length > 0 && pendingPulseEffectTicks[0]! <= state.tick) {
      emitPulseEffect(pendingPulseEffectTicks.shift()!, state);
    }
  };

  const emitSwordArc = (tick: number, charged: boolean, state: RenderGameState): void => {
    const duration = charged ? CHARGED_SWORD_ARC_DURATION_TICKS : SWORD_ARC_DURATION_TICKS;
    if (state.tick - tick >= duration) return;
    renderer.emitSwordArc(createSwordArcEffect(tick, charged, state.player));
    document.body.dataset.swordArcTick = String(tick);
    document.body.dataset.swordArcCharged = String(charged);
  };

  const queueSwordArc = (tick: number, charged: boolean): void => {
    if (renderState !== null && renderState.tick >= tick) {
      emitSwordArc(tick, charged, renderState);
      return;
    }
    if (!pendingSwordArcEvents.some((event) => event.tick === tick && event.charged === charged)) {
      pendingSwordArcEvents.push({ tick, charged });
    }
    if (pendingSwordArcEvents.length > 4) pendingSwordArcEvents.shift();
  };

  const flushSwordArcs = (state: RenderGameState): void => {
    while (pendingSwordArcEvents.length > 0 && pendingSwordArcEvents[0]!.tick <= state.tick) {
      const event = pendingSwordArcEvents.shift()!;
      emitSwordArc(event.tick, event.charged, state);
    }
  };

  const localized = (key: string): string => localizedContentString(activeProfile.settings.language, key);
  const ui = (key: RuntimeUiKey, parameters?: Readonly<Record<string, string | number>>): string => (
    runtimeUiText(activeProfile.settings.language, key, parameters)
  );
  let bindingCaptureAction: InputAction | null = null;
  const renderInputBindings = (): void => {
    inputBindingGrid.replaceChildren(...INPUT_ACTIONS.map((action) => {
      const button = document.createElement('button');
      const label = document.createElement('span');
      const key = document.createElement('kbd');
      button.type = 'button';
      button.dataset.inputAction = action;
      button.classList.toggle('listening', bindingCaptureAction === action);
      label.textContent = ui(INPUT_ACTION_UI_KEYS[action]);
      key.textContent = bindingCaptureAction === action ? '…' : inputCodeLabel(activeInputBindings[action]);
      button.append(label, key);
      return button;
    }));
  };
  const applyProfileSettings = (): void => {
    const catalog = releaseLocalizationCatalog(activeProfile.settings.language);
    document.documentElement.lang = catalog.locale;
    document.documentElement.dir = catalog.direction;
    document.body.classList.toggle('reduced-motion', activeProfile.settings.reducedMotion);
    document.body.classList.toggle('high-contrast', activeProfile.settings.highContrast);
    document.body.classList.toggle('photosensitivity-safe', activeProfile.settings.photosensitivitySafe);
    document.body.classList.toggle('touch-left-handed', activeProfile.settings.touchHandedness === 'left');
    document.body.style.setProperty('--ui-font-scale', String(activeProfile.settings.textScale));
    document.body.style.setProperty('--touch-control-scale', String(activeProfile.settings.touchControlScale));
    document.body.style.setProperty('--touch-control-opacity', String(activeProfile.settings.touchControlOpacity));
    document.body.style.setProperty('--touch-vertical-offset', `${activeProfile.settings.touchVerticalOffset}px`);
    soundCaptions.hidden = !activeProfile.settings.captions;
    if (!activeProfile.settings.captions) {
      danceBeatIndicator.hidden = true;
      soundCaptions.replaceChildren();
      for (const timer of captionTimers.values()) window.clearTimeout(timer);
      captionTimers.clear();
    }
    const recoil = activeProfile.settings.recoilMotion;
    const shake = activeProfile.settings.shakeMotion;
    if (activeProfile.settings.renderQuality !== qualityPreference) {
      qualityPreference = activeProfile.settings.renderQuality;
      resolvedQuality = qualityPreference === 'auto' ? initialRenderQuality(renderCapabilities) : qualityPreference;
      autoQuality = new AutoQualityController(resolvedQuality);
    }
    const style = document.body.style;
    style.setProperty('--weapon-kick-y', `${18 * recoil}px`);
    style.setProperty('--sword-swing-x', `${-50 + 14 * recoil}%`);
    style.setProperty('--sword-swing-y', `${-22 * recoil}px`);
    style.setProperty('--sword-swing-angle', `${24 * recoil}deg`);
    for (const [name, value] of Object.entries({
      '--shake-light-x1': `${-3 * shake}px`, '--shake-light-y1': `${2 * shake}px`,
      '--shake-light-x2': `${2 * shake}px`, '--shake-light-y2': `${-1 * shake}px`,
      '--shake-heavy-x1': `${-7 * shake}px`, '--shake-heavy-y1': `${4 * shake}px`,
      '--shake-heavy-x2': `${6 * shake}px`, '--shake-heavy-y2': `${-5 * shake}px`,
      '--shake-heavy-x3': `${-4 * shake}px`, '--shake-heavy-y3': `${-2 * shake}px`,
      '--shake-heavy-x4': `${3 * shake}px`, '--shake-heavy-y4': `${2 * shake}px`,
      '--shake-light-s1': String(1 + 0.006 * shake), '--shake-light-s2': String(1 + 0.004 * shake),
      '--shake-heavy-s1': String(1 + 0.014 * shake), '--shake-heavy-s2': String(1 + 0.012 * shake),
      '--shake-heavy-s3': String(1 + 0.009 * shake), '--shake-heavy-s4': String(1 + 0.005 * shake),
    })) style.setProperty(name, value);
    renderPresentationSettings = {
      motionScale: activeProfile.settings.cameraMotion,
      flashScale: activeProfile.settings.photosensitivitySafe ? 0 : activeProfile.settings.flashIntensity,
      qualityTier: resolvedQuality,
    };
    renderer.setQuality(resolvedQuality);
    document.body.dataset.qualityPreference = qualityPreference;
    document.body.dataset.qualityTier = resolvedQuality;
    document.body.dataset.presentationFlashScale = String(renderPresentationSettings.flashScale);
    document.body.dataset.touchHandedness = activeProfile.settings.touchHandedness;
    document.body.dataset.touchFireMode = activeProfile.settings.touchFireMode;
    document.body.dataset.sprintMode = activeProfile.settings.sprintMode;
    document.body.dataset.touchDeadZone = String(activeProfile.settings.touchDeadZone);
    document.body.dataset.audioDynamicRange = activeProfile.settings.dynamicRange;
    document.body.dataset.difficulty = renderState?.difficulty ?? activeProfile.settings.difficulty;
    document.title = ui('documentTitle');
    for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]')) {
      element.textContent = ui(element.dataset.uiText as RuntimeUiKey);
    }
    for (const element of document.querySelectorAll<HTMLElement>('[data-ui-aria]')) {
      element.setAttribute('aria-label', ui(element.dataset.uiAria as RuntimeUiKey));
    }
    const displayedDifficulty = renderState?.difficulty ?? activeProfile.settings.difficulty;
    levelName.textContent = `${ui('level')} ${activeLevelId.slice(-2)} · ${localized(activeLevel.nameKey).toLocaleUpperCase(catalog.locale)} · ${ui('difficultyLabel', {
      difficulty: ui(displayedDifficulty === 'story' ? 'difficultyStory'
        : displayedDifficulty === 'hard' ? 'difficultyHard' : 'difficultyStandard'),
    })}`;
    objectiveTitle.textContent = localized(activeLevel.objectives[0]!.titleKey);
    promptMission.textContent = localized(activeLevel.nameKey).toLocaleUpperCase(catalog.locale);
    promptBriefing.textContent = localized(activeLevel.briefingKey);
    settingLanguage.value = catalog.locale;
    settingDifficulty.value = activeProfile.settings.difficulty;
    settingSensitivity.value = String(activeProfile.settings.mouseSensitivity);
    settingQuality.value = activeProfile.settings.renderQuality;
    settingTextScale.value = String(activeProfile.settings.textScale);
    settingCameraMotion.value = String(activeProfile.settings.cameraMotion);
    settingRecoilMotion.value = String(activeProfile.settings.recoilMotion);
    settingShakeMotion.value = String(activeProfile.settings.shakeMotion);
    settingFlashIntensity.value = String(activeProfile.settings.flashIntensity);
    settingMaster.value = String(activeProfile.settings.masterVolume);
    settingMusic.value = String(activeProfile.settings.musicVolume);
    settingEffects.value = String(activeProfile.settings.effectsVolume);
    settingCombatVolume.value = String(activeProfile.settings.combatVolume);
    settingWorldVolume.value = String(activeProfile.settings.worldVolume);
    settingInterfaceVolume.value = String(activeProfile.settings.interfaceVolume);
    settingDynamicRange.value = activeProfile.settings.dynamicRange;
    settingReducedMotion.checked = activeProfile.settings.reducedMotion;
    settingHighContrast.checked = activeProfile.settings.highContrast;
    settingCaptions.checked = activeProfile.settings.captions;
    settingPhotosensitivity.checked = activeProfile.settings.photosensitivitySafe;
    settingTouchScale.value = String(activeProfile.settings.touchControlScale);
    settingTouchOpacity.value = String(activeProfile.settings.touchControlOpacity);
    settingTouchOffset.value = String(activeProfile.settings.touchVerticalOffset);
    settingTouchHandedness.value = activeProfile.settings.touchHandedness;
    settingTouchDeadZone.value = String(activeProfile.settings.touchDeadZone);
    settingTouchFireMode.value = activeProfile.settings.touchFireMode;
    settingSprintMode.value = activeProfile.settings.sprintMode;
    renderInputBindings();
    audio?.setOutputGain(activeProfile.settings.masterVolume * activeProfile.settings.effectsVolume);
    audio?.setMix({
      combat: activeProfile.settings.combatVolume,
      world: activeProfile.settings.worldVolume,
      interface: activeProfile.settings.interfaceVolume,
      dynamicRange: activeProfile.settings.dynamicRange,
    });
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
      const tier = (['quantum', 'gold', 'silver', 'bronze'] as const)
        .find((candidate) => progress?.medals.includes(`tier:${candidate}`));
      if (tier !== undefined) status.textContent += ` · ${ui(`medal${tier.charAt(0).toUpperCase()}${tier.slice(1)}` as RuntimeUiKey)}`;
      button.append(number, title, status);
      return button;
    }));
  };
  renderCampaignMap();

  const showMissionResults = (summary: CampaignResultSummary): void => {
    latestCampaignResult = summary;
    missionFailed.classList.remove('open');
    missionFailed.setAttribute('aria-hidden', 'true');
    resultsLevelName.textContent = localized(activeLevel.nameKey);
    const medalKey = `medal${summary.medalTier.charAt(0).toUpperCase()}${summary.medalTier.slice(1)}` as RuntimeUiKey;
    resultsMedal.textContent = `${ui(medalKey)}${summary.newBest ? ` · ${ui('newBest')}` : ''}`;
    resultsTime.textContent = formatCampaignTicks(summary.completionTicks);
    resultsBest.textContent = formatCampaignTicks(summary.bestTicks);
    resultsPar.textContent = formatCampaignTicks(summary.parTicks);
    resultsCoins.textContent = `+${summary.coinsEarned}`;
    resultsWallet.textContent = String(summary.availableCoins);
    resultsScore.textContent = summary.score.toLocaleString(activeProfile.settings.language);
    resultsAccuracy.textContent = summary.accuracyPermille === null ? '—' : `${summary.accuracyPermille / 10}%`;
    resultsDamage.textContent = String(Math.round(summary.damageTaken));
    const robotsDefeated = Object.values(summary.robotsByArchetype).reduce((total, count) => total + count, 0);
    resultsRobots.textContent = String(robotsDefeated);
    resultsSecrets.textContent = `${summary.secretsFound} / ${summary.totalSecrets}`;
    resultsCombo.textContent = `×${summary.highestCombo}`;
    const archetypeKeys = {
      'wobble-scout': 'wobbleScout', 'blue-slider': 'blueSlider', 'yellow-spinner': 'yellowSpinner',
      'red-firemouth': 'redFiremouth', 'cyan-dj': 'cyanDj', 'invoice-overlord': 'invoiceOverlord',
    } as const satisfies Readonly<Record<keyof CampaignResultSummary['robotsByArchetype'], RuntimeUiKey>>;
    resultsRobotBreakdown.textContent = Object.entries(summary.robotsByArchetype)
      .filter(([, count]) => count > 0)
      .map(([archetype, count]) => `${ui(archetypeKeys[archetype as keyof typeof archetypeKeys])} ×${count}`)
      .join(' · ');
    resultsObjectives.replaceChildren(...summary.optionalObjectives.map((objective) => {
      const item = document.createElement('li');
      item.classList.toggle('missed', !objective.achieved);
      item.textContent = `${objective.achieved ? '✓' : '○'} ${ui(objective.id.includes('par-time') ? 'objectivePar' : 'objectiveAccuracy')}`;
      return item;
    }));
    resultsReplayProof.textContent = ui('replayProof', { seed: summary.seed, checksum: summary.replayChecksum });
    resultsNext.textContent = ui(summary.nextLevelId === null ? 'chapterComplete' : 'nextMission');
    missionResults.classList.add('open');
    missionResults.setAttribute('aria-hidden', 'false');
    document.exitPointerLock();
    resultsNext.focus();
  };

  const showMissionFailure = (state: RenderGameState): void => {
    const checkpointAvailable = activeProfile.campaignCheckpoint?.levelId === activeLevelId
      && activeProfile.campaignCheckpoint.difficulty === activeProfile.settings.difficulty;
    missionResults.classList.remove('open');
    missionResults.setAttribute('aria-hidden', 'true');
    failureLevelName.textContent = localized(activeLevel.nameKey);
    failureRecovery.textContent = ui(checkpointAvailable ? 'retryCheckpointHint' : 'restartMissionHint');
    failureDavels.textContent = `${state.robots.filter((robot) => !robot.active).length} / ${state.robots.length}`;
    failureCoins.textContent = String(activeProfile.spendableCoins);
    failureRetry.textContent = ui(checkpointAvailable ? 'retryCheckpoint' : 'restartMission');
    failureRestart.hidden = !checkpointAvailable;
    missionFailed.classList.add('open');
    missionFailed.setAttribute('aria-hidden', 'false');
    document.exitPointerLock();
    failureRetry.focus();
  };

  const persistProfile = (profile: ProfileV10): void => {
    activeProfile = profile;
    activeInputBindings = normalizeInputBindings(profile.inputMappings);
    if (trainingMode) return;
    profileWrite = profileWrite.then(() => profileRepository.save(profile)).catch((error: unknown) => {
      console.warn('Catch Davel profile save failed', error);
    });
  };

  settingsPanel.addEventListener('change', (event) => {
    const previousDifficulty = activeProfile.settings.difficulty;
    if (event.target === settingReducedMotion) {
      const presetValue = settingReducedMotion.checked ? '0' : '1';
      settingCameraMotion.value = presetValue;
      settingRecoilMotion.value = presetValue;
      settingShakeMotion.value = presetValue;
    }
    const cameraMotion = Number(settingCameraMotion.value);
    const recoilMotion = Number(settingRecoilMotion.value);
    const shakeMotion = Number(settingShakeMotion.value);
    const reducedMotion = cameraMotion === 0 && recoilMotion === 0 && shakeMotion === 0;
    settingReducedMotion.checked = reducedMotion;
    if (event.target === settingSprintMode) {
      sprintHeld = false;
      touchSprint.classList.remove('active');
      document.body.classList.remove('sprinting');
    }
    const nextSettings = {
      difficulty: isDifficultyId(settingDifficulty.value) ? settingDifficulty.value : 'standard',
      language: settingLanguage.value === 'ar' ? 'ar' : 'en',
      mouseSensitivity: Number(settingSensitivity.value),
      renderQuality: normalizeRenderQuality(settingQuality.value),
      textScale: Number(settingTextScale.value),
      cameraMotion,
      recoilMotion,
      shakeMotion,
      flashIntensity: Number(settingFlashIntensity.value),
      masterVolume: Number(settingMaster.value),
      musicVolume: Number(settingMusic.value),
      effectsVolume: Number(settingEffects.value),
      combatVolume: Number(settingCombatVolume.value),
      worldVolume: Number(settingWorldVolume.value),
      interfaceVolume: Number(settingInterfaceVolume.value),
      dynamicRange: settingDynamicRange.value === 'wide' ? 'wide' as const
        : settingDynamicRange.value === 'night' ? 'night' as const : 'balanced' as const,
      reducedMotion,
      highContrast: settingHighContrast.checked,
      captions: settingCaptions.checked,
      photosensitivitySafe: settingPhotosensitivity.checked,
      touchControlScale: Number(settingTouchScale.value),
      touchControlOpacity: Number(settingTouchOpacity.value),
      touchVerticalOffset: Number(settingTouchOffset.value),
      touchHandedness: settingTouchHandedness.value === 'left' ? 'left' as const : 'right' as const,
      touchDeadZone: Number(settingTouchDeadZone.value),
      touchFireMode: settingTouchFireMode.value === 'toggle' ? 'toggle' as const : 'hold' as const,
      sprintMode: settingSprintMode.value === 'toggle' ? 'toggle' as const : 'hold' as const,
    };
    persistProfile(updateProfile(activeProfile, {
      settings: nextSettings,
      ...(nextSettings.difficulty === previousDifficulty ? {} : { campaignCheckpoint: null }),
    }));
    applyProfileSettings();
    renderCampaignMap();
    renderShop();
    updateHud(renderState ?? undefined);
    settingsStatus.textContent = ui(nextSettings.difficulty === previousDifficulty ? 'settingsSaved' : 'difficultyNextMission');
  });

  const commitInputBinding = (action: InputAction, code: string): void => {
    const nextBindings = rebindInput(activeInputBindings, action, code);
    persistProfile(updateProfile(activeProfile, { inputMappings: nextBindings }));
    bindingCaptureAction = null;
    renderInputBindings();
    settingsStatus.textContent = ui('controlSaved', {
      action: ui(INPUT_ACTION_UI_KEYS[action]), control: inputCodeLabel(code),
    });
  };
  inputBindingGrid.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-input-action]');
    const action = button?.dataset.inputAction as InputAction | undefined;
    if (action === undefined || !INPUT_ACTIONS.includes(action)) return;
    bindingCaptureAction = action;
    renderInputBindings();
    settingsStatus.textContent = ui('pressControl');
  });
  inputBindingReset.addEventListener('click', () => {
    persistProfile(updateProfile(activeProfile, { inputMappings: DEFAULT_INPUT_BINDINGS }));
    bindingCaptureAction = null;
    renderInputBindings();
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
        {
          combat: activeProfile.settings.combatVolume,
          world: activeProfile.settings.worldVolume,
          interface: activeProfile.settings.interfaceVolume,
          dynamicRange: activeProfile.settings.dynamicRange,
        },
      );
      music = new ProceduralMusicSequencer(
        context, activeLevel.dance.bpm, musicRuntimeProfile(activeLevel.dance.presetId),
        activeProfile.settings.masterVolume * activeProfile.settings.musicVolume,
      );
      audio.setAmbience(true, 0.22, false);
      document.body.dataset.ambienceSources = String(audio.ambienceSourceCount);
      document.body.dataset.ambienceActive = 'true';
    }
    return audio;
  };

  const sound = (cue: AudioCue, robotId?: number, gainScale = 1, pitchScale = 1): void => {
    if (audio === null) return;
    const robot = robotId === undefined ? undefined : renderState?.robots.find((candidate) => candidate.id === robotId);
    const pan = robot === undefined || renderState === null
      ? 0 : Math.max(-1, Math.min(1, (robot.x - renderState.player.x) / 9));
    audio.play(cue, pan, gainScale, pitchScale);
  };

  const playBombFuseAudio = (request: BombFuseAudioRequest): void => {
    document.body.dataset.bombFuseTick = String(request.milestone);
    document.body.dataset.bombFuseId = String(request.bombId);
    document.body.dataset.bombFusePitchScale = String(request.pitchScale);
    if (audio === null || renderState === null) return;
    const pan = Math.max(-1, Math.min(1, (request.x - renderState.player.x) / 9));
    audio.play('bomb-fuse', pan, request.gainScale, request.pitchScale);
  };

  const playLaserAudio = (request: LaserAudioRequest | null): void => {
    if (request === null) return;
    document.body.dataset.laserAudioTick = String(request.tick);
    document.body.dataset.laserPitchScale = String(request.pitchScale);
    sound('laser', undefined, 1, request.pitchScale);
  };

  const showMessage = (text: string): void => {
    combatMessage.textContent = text;
    combatMessage.classList.add('show');
    window.clearTimeout(messageTimeout);
    messageTimeout = window.setTimeout(() => combatMessage.classList.remove('show'), 650);
  };

  const showDavelBark = (
    event: DecodedGameEvent,
    occasion: DavelBarkOccasion,
    minimumIntervalTicks: number,
  ): void => {
    if (!waveTransition.hidden) return;
    if (event.tick - lastBarkTick < minimumIntervalTicks) return;
    const request = davelBarkRequest(event.robotId, event.tick, occasion, event.value ?? 0);
    if (request === null) return;
    lastBarkTick = event.tick;
    davelBarkSpeaker.textContent = localized(request.speakerKey);
    davelBarkLine.textContent = localized(request.lineKey);
    davelBark.classList.add('show');
    window.clearTimeout(barkTimeout);
    barkTimeout = window.setTimeout(() => davelBark.classList.remove('show'), 2_200);
    sound('robot-taunt', event.robotId);
  };

  const showCaption = (request: CaptionRequest): void => {
    if (!activeProfile.settings.captions) return;
    const existing = [...soundCaptions.children].find((element) => (
      (element as HTMLElement).dataset.captionKey === request.dedupeKey
    ));
    existing?.remove();
    window.clearTimeout(captionTimers.get(request.dedupeKey));
    while (soundCaptions.childElementCount >= 3) {
      const oldest = soundCaptions.firstElementChild as HTMLElement | null;
      if (oldest === null) break;
      window.clearTimeout(captionTimers.get(oldest.dataset.captionKey ?? ''));
      captionTimers.delete(oldest.dataset.captionKey ?? '');
      oldest.remove();
    }
    const entry = document.createElement('span');
    entry.dataset.captionKey = request.dedupeKey;
    entry.classList.toggle('warning', request.key === 'captionAttackCharging' || request.key === 'captionIncoming'
      || request.key === 'captionMelee' || request.key === 'captionPlayerHit');
    entry.textContent = ui(request.key, {
      ...request.parameters,
      ...(request.direction === undefined ? {} : { direction: ui(CAPTION_DIRECTION_UI_KEYS[request.direction]) }),
    });
    soundCaptions.append(entry);
    captionTimers.set(request.dedupeKey, window.setTimeout(() => {
      entry.remove();
      captionTimers.delete(request.dedupeKey);
    }, 1_400));
  };

  function updateHud(state?: RenderGameState): void {
    if (state === undefined) return;
    document.body.dataset.difficulty = state.difficulty;
    const frozen = freezeDanceWindow(state.levelId, state.tick).frozen;
    const beat = danceBeatPresentation(
      state.tick, activeLevel.dance.bpm, activeLevel.dance.attackBeats, activeLevel.dance.vulnerableBeats, frozen,
    );
    danceBeatIndicator.hidden = !activeProfile.settings.captions || !humanSessionStarted || state.victory || state.defeat;
    danceBeatIndicator.dataset.phase = beat.phase;
    danceBeatIndicator.dataset.step = String(beat.barStep + 1);
    danceBeatIndicator.setAttribute('aria-label', ui('danceBeatAria', {
      beat: beat.quarterBeat, step: beat.barStep + 1, phase: ui(DANCE_BEAT_PHASE_UI_KEYS[beat.phase]),
    }));
    for (let index = 0; index < danceBeatSegments.length; index += 1) {
      const segment = danceBeatSegments[index]!;
      segment.classList.toggle('active', index === beat.barStep);
      segment.classList.toggle('attack', activeLevel.dance.attackBeats.includes(index));
      segment.classList.toggle('vulnerable', activeLevel.dance.vulnerableBeats.includes(index));
    }
    healthHud.textContent = `${Math.ceil(state.player.health)} / ${state.player.maxHealth}`;
    energyHud.textContent = `${Math.floor(state.player.energy)} / ${state.player.maxEnergy}`;
    coinsHud.textContent = String(state.player.coins);
    runScoreHud.textContent = state.run.score.toLocaleString(activeProfile.settings.language);
    runComboHud.textContent = `×${state.run.currentCombo}`;
    runStatsHud.classList.toggle('combo-active', state.run.currentCombo > 1);
    const compass = bossTraining ? null : objectiveCompassReading(state);
    objectiveCompass.hidden = compass === null;
    if (compass !== null) {
      const target = ui(COMPASS_TARGET_UI_KEYS[compass.target]);
      const distance = Math.max(0, Math.round(compass.distanceMeters));
      objectiveCompass.dataset.target = compass.target;
      objectiveCompass.style.setProperty('--compass-bearing', `${compass.bearingRadians}rad`);
      objectiveCompassTarget.textContent = target;
      objectiveCompassDistance.textContent = ui('compassDistance', { distance });
      objectiveCompass.setAttribute('aria-label', ui('compassAria', { target, distance }));
    }
    const wave = waveTransitionPresentation(state.level.encounter);
    waveTransition.hidden = wave === null;
    document.body.dataset.waveTransition = wave?.transitionKey ?? 'none';
    if (wave !== null) {
      davelBark.classList.remove('show');
      window.clearTimeout(barkTimeout);
      waveTransitionTitle.textContent = ui('waveIncoming', { wave: wave.nextWave, waves: wave.waveCount });
      waveTransitionTime.textContent = ui('waveTime', { seconds: wave.secondsRemaining });
      waveTransition.style.setProperty('--wave-transition-progress', `${wave.remainingRatio * 100}%`);
      waveTransition.setAttribute('aria-label', ui('waveAria', {
        wave: wave.nextWave, waves: wave.waveCount, seconds: wave.secondsRemaining,
      }));
      if (lastWaveTransitionKey !== wave.transitionKey) sound('wave-warning');
      lastWaveTransitionKey = wave.transitionKey;
    } else if (state.level.encounter.waveIndex === 0) {
      lastWaveTransitionKey = null;
    }
    const boss = bossPresentation(state.robots, state.difficulty);
    bossStatus.hidden = boss === null;
    document.body.dataset.bossPhase = String(boss?.phase ?? 0);
    if (boss !== null) {
      const health = Math.ceil(boss.health);
      bossStatus.dataset.phase = String(boss.phase);
      bossStatus.style.setProperty('--boss-health', `${boss.healthRatio * 100}%`);
      bossStatusPhase.textContent = ui('bossPhaseLabel', { phase: boss.phase });
      bossStatusHp.textContent = ui('bossHp', { health, max: boss.maxHealth });
      bossStatus.setAttribute('aria-label', ui('bossAria', {
        phase: boss.phase, health, max: boss.maxHealth,
      }));
      bossStatusHealth.dataset.health = String(health);
    }
    const remaining = state.robots.filter((robot) => robot.active).length;
    remainingHud.textContent = state.victory ? ui('mazeClear')
      : state.level.objectiveComplete ? ui('reachExit')
      : bossTraining
        ? ui('bossHealth', { health: Math.ceil(state.robots[0]?.health ?? 0), phase: state.robots[0]?.bossPhase ?? 1 })
        : state.level.encounter.pendingTicks > 0
          ? ui('shift', {
            wave: state.level.encounter.waveIndex + 2,
            waves: state.level.encounter.waveCount,
            seconds: wave?.secondsRemaining ?? '0.1',
          })
          : ui('remain', { count: remaining });
    const resource = state.player.selectedWeapon === 'bomb' ? ` · ${ui('bombs', { count: state.player.bombs })}`
      : state.player.selectedWeapon === 'sword' ? ` · ${ui('heat', { value: Math.ceil(state.player.swordHeat) })}`
      : state.player.selectedWeapon === 'laser'
        ? ` · ${ui('heat', { value: Math.ceil(state.player.laserHeat) })}${state.player.laserOverheated ? ` · ${ui('overheated')}` : ''}` : '';
    weaponStatus.textContent = `${ui(WEAPON_UI_KEYS[state.player.selectedWeapon])}${resource}`;
    touchWeapon.textContent = ui(WEAPON_UI_KEYS[state.player.selectedWeapon]);
    document.body.dataset.weapon = state.player.selectedWeapon;
    const pulseBloom = state.player.selectedWeapon === 'pulse'
      ? state.pulseSpreadRadians / PULSE_MAX_SPREAD_RADIANS : 0;
    crosshair.style.setProperty('--pulse-spread-scale', String(1 + Math.max(0, Math.min(1, pulseBloom)) * 1.6));
  }

  const processEvent = (event: DecodedGameEvent): void => {
    const captionRobot = event.robotId === undefined
      ? undefined : renderState?.robots.find((candidate) => candidate.id === event.robotId);
    const captionDirection = captionRobot === undefined || renderState === null ? 'center' : relativeCaptionDirection(
      renderState.player.x, renderState.player.z, renderState.player.yaw, captionRobot.x, captionRobot.z,
    );
    const caption = captionForEvent(event, captionDirection);
    if (caption !== null) showCaption(caption);
    const feedback = presentationFeedback(event.type);
    if (feedback !== null) {
      for (const className of feedback.classes) {
        const motionScale = className === 'feedback-weapon-kick' || className === 'feedback-sword-swing'
          ? activeProfile.settings.recoilMotion : activeProfile.settings.shakeMotion;
        if (motionScale > 0) {
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
    if (event.type === 'pulse-fired') {
      queuePulseEffect(event.tick);
      if (event.x !== undefined && event.y !== undefined && event.z !== undefined
        && [event.x, event.y, event.z].every(Number.isFinite)) {
        renderer.emitPulseImpact({
          startTick: event.tick,
          kind: normalizePulseImpactKind(event.value),
          x: event.x,
          y: event.y,
          z: event.z,
        });
        document.body.dataset.pulseImpactTick = String(event.tick);
        document.body.dataset.pulseImpactKind = String(normalizePulseImpactKind(event.value));
        document.body.dataset.pulseImpactPosition = `${event.x},${event.y},${event.z}`;
      }
      sound('pulse');
    }
    if (event.type === 'sword-swung' || event.type === 'sword-charged') {
      queueSwordArc(event.tick, event.type === 'sword-charged');
      sound(event.type === 'sword-charged' ? 'charged-sword' : 'sword');
    }
    if (event.type === 'projectile-deflected') sound('deflect');
    if (event.type === 'bomb-thrown') sound('bomb-throw');
    if (event.type === 'bomb-detonated') {
      if (event.value !== undefined && event.x !== undefined && event.y !== undefined && event.z !== undefined
        && [event.x, event.y, event.z].every(Number.isFinite)) {
        renderer.emitBombDetonation({
          bombId: event.value,
          startTick: event.tick,
          x: event.x,
          y: event.y,
          z: event.z,
        });
        document.body.dataset.bombDetonationTick = String(event.tick);
        document.body.dataset.bombDetonationId = String(event.value);
        document.body.dataset.bombDetonationPosition = `${event.x},${event.y},${event.z}`;
      }
      showMessage(ui('bombDetonated'));
      sound('bomb-detonate');
    }
    if (event.type === 'laser-fired') {
      playLaserAudio(laserAudio.queue(event.tick, renderState === null ? null : {
        tick: renderState.tick,
        heat: renderState.player.laserHeat,
        overheated: renderState.player.laserOverheated,
      }));
    }
    if (event.type === 'robot-hit') {
      const hitClass = event.value === 1 ? 'weak-hit' : 'hit';
      crosshair.classList.add(hitClass);
      window.setTimeout(() => crosshair.classList.remove(hitClass), event.value === 1 ? 150 : 90);
      sound(event.value === 1 ? 'weak-point' : 'robot-impact', event.robotId);
    }
    if (event.type === 'robot-fired') sound('robot-shot', event.robotId);
    if (event.type === 'robot-telegraph') {
      sound('robot-telegraph', event.robotId);
      showDavelBark(event, 'telegraph', 240);
    }
    if (event.type === 'robot-melee') sound('robot-melee', event.robotId);
    if (event.type === 'robot-buff') { showMessage(ui('djBeat')); sound('dj-buff', event.robotId); }
    if (event.type === 'boss-phase') {
      showMessage(ui('bossPhase', { phase: event.value ?? 1 }));
      sound('boss-phase', event.robotId);
      showDavelBark(event, 'boss-phase', 0);
    }
    if (event.type === 'player-hit') {
      document.body.classList.add('hurt');
      window.setTimeout(() => document.body.classList.remove('hurt'), 130);
      const bearing = captionRobot === undefined || renderState === null ? 0 : relativeThreatBearing(
        renderState.player.x, renderState.player.z, renderState.player.yaw, captionRobot.x, captionRobot.z,
      );
      damageDirection.style.setProperty('--damage-bearing', `${bearing}rad`);
      damageDirection.dataset.sourceRobot = String(event.robotId ?? -1);
      damageDirection.classList.remove('show');
      void damageDirection.offsetWidth;
      damageDirection.classList.add('show');
      window.clearTimeout(damageDirectionTimeout);
      damageDirectionTimeout = window.setTimeout(() => damageDirection.classList.remove('show'), 420);
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
      sound('checkpoint');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        void client.getCheckpoint().then((snapshot) => {
          if (snapshot !== null && humanSessionStarted && !agentController.isAgentControlled()) {
            const newlyBanked = Math.max(0, snapshot.player.coins - activeProfile.spendableCoins);
            persistProfile(updateProfile(bankCampaignCoins(activeProfile, snapshot.player.coins), {
              campaignCheckpoint: snapshot,
            }));
            showMessage(ui('checkpointBanked', { coins: newlyBanked }));
          }
        }).catch((error: unknown) => console.warn('Catch Davel checkpoint save failed', error));
      } else {
        showMessage(ui('checkpoint'));
      }
    }
    if (event.type === 'objective-complete') { showMessage(ui('allDavelsDown')); sound('objective'); }
    if (event.type === 'exit-unlocked') showMessage(ui('exitOnline'));
    if (event.type === 'robot-defeated') {
      showMessage(ui('davelDown', { coins: event.coins ?? 0 }));
      sound('robot-defeat', event.robotId);
      showDavelBark(event, 'defeated', 150);
    }
    if (event.type === 'victory') {
      showMessage(ui('victory'));
      sound('victory');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        void client.getStatus().then((status) => {
          const terminalState = client.latestState;
          const summary = campaignResultSummary(
            activeProfile, activeLevelId, status.tick, terminalState.player.coins, status.runMetrics, status.checksum,
          );
          persistProfile(completeCampaignLevel(
            bankCampaignCoins(activeProfile, terminalState.player.coins), activeLevelId, status.tick, summary,
          ));
          renderCampaignMap();
          window.setTimeout(() => showMissionResults(summary), 700);
        }).catch((error: unknown) => console.warn('Catch Davel mission results failed', error));
      }
    }
    if (event.type === 'defeat') {
      showMessage(ui('defeat'));
      sound('defeat');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(recordCampaignDefeat(activeProfile, activeLevelId));
        window.setTimeout(() => {
          if (renderState?.defeat) showMissionFailure(renderState);
        }, 550);
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
    ...(trainingMode ? {} : { playerUpgrades: normalizePlayerUpgradeLevels(activeProfile.playerUpgrades) }),
    encounter: bossTraining ? 'boss-training' : 'campaign',
    difficulty: activeProfile.settings.difficulty,
    callbacks: {
      onSnapshot: (state) => {
        if (renderState !== null && (state.tick < renderState.tick || state.levelId !== renderState.levelId)) {
          pendingPulseEffectTicks.length = 0;
          pendingSwordArcEvents.length = 0;
          laserAudio.reset();
          bombFuseAudio.reset();
          renderer.clearPresentationEffects();
        }
        renderState = state;
        flushPulseEffects(state);
        flushSwordArcs(state);
        playLaserAudio(laserAudio.sample({
          tick: state.tick, heat: state.player.laserHeat, overheated: state.player.laserOverheated,
        }));
        updateHud(state);
        const activeRobots = state.robots.filter((robot) => robot.active).length;
        const combatIntensity = Math.min(1, 0.22 + activeRobots / Math.max(1, state.robots.length) * 0.58
          + Math.min(0.2, state.projectiles.length * 0.025));
        const bossPhase = state.robots.reduce((phase, robot) => Math.max(phase, robot.bossPhase), 0);
        const frozen = freezeDanceWindow(state.levelId, state.tick).frozen;
        const presentationVisible = document.visibilityState !== 'hidden';
        const effectsActive = presentationVisible && !state.victory && !state.defeat
          && !pauseMenu.classList.contains('open') && !campaignMap.classList.contains('open');
        for (const request of bombFuseAudio.sample(state.tick, state.playerBombs, effectsActive)) {
          playBombFuseAudio(request);
        }
        const ambienceActive = audio !== null && effectsActive;
        for (const request of davelMovementAudio.sample(state, ambienceActive && !frozen)) {
          sound(request.cue, request.robotId, request.gainScale);
        }
        audio?.setAmbience(ambienceActive, combatIntensity, frozen);
        document.body.dataset.ambienceActive = String(ambienceActive);
        music?.update(
          state.tick, combatIntensity, frozen, bossPhase,
          presentationVisible && !state.victory && !state.defeat,
        );
        document.body.dataset.snapshotTick = String(state.tick);
      },
      onEvent: processEvent,
      onResync: (state) => {
        davelMovementAudio.reset();
        laserAudio.reset();
        bombFuseAudio.reset();
        pendingPulseEffectTicks.length = 0;
        pendingSwordArcEvents.length = 0;
        renderer.clearPresentationEffects();
        renderState = state;
        updateHud(state);
        showMessage(ui('resynchronized'));
      },
      onError: (error) => {
        document.body.dataset.workerStatus = 'error';
        showMessage(ui('workerError'));
        console.error(error);
      },
    },
  });
  if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId
    && activeProfile.campaignCheckpoint.difficulty === activeProfile.settings.difficulty) {
    await client.loadSnapshot(activeProfile.campaignCheckpoint);
  }
  await client.setMode('realtime');
  agentController = new WorkerAgentController(client, async () => {
    if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId
      && activeProfile.campaignCheckpoint.difficulty === activeProfile.settings.difficulty) {
      await client.loadSnapshot(activeProfile.campaignCheckpoint);
    }
    else await client.reset(
      activeLevel.seed, trainingMode ? 0 : activeProfile.spendableCoins, false,
      trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
      trainingMode ? undefined : normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades),
      bossTraining ? 'boss-training' : 'campaign',
      activeLevelId,
      activeProfile.settings.difficulty,
      trainingMode ? undefined : normalizePlayerUpgradeLevels(activeProfile.playerUpgrades),
    );
    await client.setMode('realtime');
    humanSessionStarted = false;
  });
  if (import.meta.env.DEV || import.meta.env.VITE_AGENT_API === '1') agentController.install();
  document.body.dataset.workerStatus = 'ready';

  let resumeAfterCampaignMap = false;
  const setCampaignMapOpen = (open: boolean): void => {
    if (open) {
      missionResults.classList.remove('open');
      missionResults.setAttribute('aria-hidden', 'true');
      missionFailed.classList.remove('open');
      missionFailed.setAttribute('aria-hidden', 'true');
      pauseMenu.classList.remove('open');
      pauseMenu.setAttribute('aria-hidden', 'true');
    }
    campaignMap.classList.toggle('open', open);
    campaignMap.setAttribute('aria-hidden', String(!open));
    if (open) {
      audio?.setAmbience(false, 0, false);
      document.body.dataset.ambienceActive = 'false';
      resumeAfterCampaignMap = !renderState?.victory && !renderState?.defeat;
      shop.classList.remove('open');
      document.exitPointerLock();
      void client.setMode('manual');
    } else if (resumeAfterCampaignMap && !renderState?.victory && !renderState?.defeat) {
      resumeAfterCampaignMap = false;
      void client.setMode('realtime');
    } else if (!open && renderState?.victory && latestCampaignResult !== null) {
      showMissionResults(latestCampaignResult);
    } else if (!open && renderState?.defeat) {
      showMissionFailure(renderState);
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
      if (renderState?.victory || renderState?.defeat) {
        void profileWrite.then(() => location.reload());
        return;
      }
      setCampaignMapOpen(false);
      return;
    }
    const nextParameters = new URLSearchParams(location.search);
    nextParameters.set('level', levelId);
    location.search = nextParameters.toString();
  });
  resultsReplay.addEventListener('click', () => location.reload());
  resultsNext.addEventListener('click', () => {
    const nextLevelId = latestCampaignResult?.nextLevelId;
    if (nextLevelId === null || nextLevelId === undefined) {
      setCampaignMapOpen(true);
      return;
    }
    const nextParameters = new URLSearchParams(location.search);
    nextParameters.set('level', nextLevelId);
    location.search = nextParameters.toString();
  });
  resultsMap.addEventListener('click', () => setCampaignMapOpen(true));
  failureRetry.addEventListener('click', () => {
    failureRetry.disabled = true;
    failureRestart.disabled = true;
    void profileWrite.then(() => location.reload());
  });
  failureRestart.addEventListener('click', () => {
    failureRetry.disabled = true;
    failureRestart.disabled = true;
    persistProfile(updateProfile(activeProfile, { campaignCheckpoint: null, lastCleanShutdown: true }));
    void profileWrite.then(() => location.reload());
  });
  failureMap.addEventListener('click', () => setCampaignMapOpen(true));

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
    const weaponLevels = normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades);
    const playerLevels = normalizePlayerUpgradeLevels(activeProfile.playerUpgrades);
    shopCoins.textContent = String(activeProfile.spendableCoins);
    for (const button of shop.querySelectorAll<HTMLButtonElement>('button[data-upgrade]')) {
      const id = button.dataset.upgrade as ShopUpgradeId;
      const localization = UPGRADE_UI_KEYS[id];
      const name = ui(localization.name);
      const level = isPlayerUpgradeId(id) ? playerLevels[id] : weaponLevels[id];
      const maximumLevel = isPlayerUpgradeId(id) ? MAX_PLAYER_UPGRADE_LEVEL : MAX_WEAPON_UPGRADE_LEVEL;
      button.disabled = level >= maximumLevel;
      button.textContent = level >= maximumLevel
        ? ui('upgradeMax', { name })
        : ui('upgradePrice', {
          name,
          level: `${level} → ${level + 1}`,
          cost: isPlayerUpgradeId(id) ? playerUpgradeCost(id, level) : weaponUpgradeCost(id, level),
        });
      button.title = ui(localization.description);
    }
  };
  renderShop();
  if (trainingMode) shop.hidden = true;
  shop.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-upgrade]');
    if (button === null || trainingMode || humanSessionStarted || agentController.isAgentControlled()) return;
    const id = button.dataset.upgrade as ShopUpgradeId;
    try {
      const upgraded = isPlayerUpgradeId(id)
        ? purchasePlayerUpgrade(activeProfile, id)
        : purchaseWeaponUpgrade(activeProfile, id);
      persistProfile(upgraded);
      renderShop();
      void client.reset(
        activeLevel.seed, upgraded.spendableCoins, false, CAMPAIGN_LEVEL_1_WEAPON_MASK,
        normalizeWeaponUpgradeLevels(upgraded.weaponUpgrades),
        'campaign', activeLevelId,
        upgraded.settings.difficulty,
        normalizePlayerUpgradeLevels(upgraded.playerUpgrades),
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
  let sprintHeld = false;
  let queuedWeapon: WeaponId | null = null;
  let resumeAfterVisibility = false;
  let touchForward = 0;
  let touchStrafe = 0;
  let previousGamepadAlt = false;
  let previousGamepadCycle = false;
  let previousGamepadCampaign = false;
  let previousGamepadShop = false;
  let previousGamepadSprint = false;
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
      activeProfile.settings.touchDeadZone,
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
    if (movePointerId !== null || campaignMap.classList.contains('open') || shop.classList.contains('open')
      || pauseMenu.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession(); movePointerId = event.pointerId;
    movePad.setPointerCapture(event.pointerId); updateMoveStick(event);
  });
  movePad.addEventListener('pointermove', (event) => { if (event.pointerId === movePointerId) updateMoveStick(event); });
  movePad.addEventListener('pointerup', releaseMoveStick);
  movePad.addEventListener('pointercancel', releaseMoveStick);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || lookPointerId !== null || agentController.isAgentControlled()
      || pauseMenu.classList.contains('open')) return;
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
    if (pauseMenu.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession(); touchFire.setPointerCapture(event.pointerId);
    fireHeld = touchFireHeld(fireHeld, activeProfile.settings.touchFireMode, 'press');
    touchFire.classList.toggle('active', fireHeld);
    document.body.classList.toggle('firing', fireHeld);
  });
  const releaseTouchFire = (): void => {
    fireHeld = touchFireHeld(fireHeld, activeProfile.settings.touchFireMode, 'release');
    touchFire.classList.toggle('active', fireHeld);
    document.body.classList.toggle('firing', fireHeld);
  };
  touchFire.addEventListener('pointerup', releaseTouchFire);
  touchFire.addEventListener('pointercancel', releaseTouchFire);
  touchSprint.addEventListener('pointerdown', (event) => {
    if (pauseMenu.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession(); touchSprint.setPointerCapture(event.pointerId);
    sprintHeld = touchFireHeld(sprintHeld, activeProfile.settings.sprintMode, 'press');
    touchSprint.classList.toggle('active', sprintHeld);
    document.body.classList.toggle('sprinting', sprintHeld);
  });
  const releaseTouchSprint = (): void => {
    sprintHeld = touchFireHeld(sprintHeld, activeProfile.settings.sprintMode, 'release');
    touchSprint.classList.toggle('active', sprintHeld);
    document.body.classList.toggle('sprinting', sprintHeld);
  };
  touchSprint.addEventListener('pointerup', releaseTouchSprint);
  touchSprint.addEventListener('pointercancel', releaseTouchSprint);
  touchAlt.addEventListener('pointerdown', (event) => {
    if (pauseMenu.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession(); fireQueued = true; altFireQueued = true;
    touchAlt.classList.add('active');
  });
  touchAlt.addEventListener('pointerup', () => touchAlt.classList.remove('active'));
  touchAlt.addEventListener('pointercancel', () => touchAlt.classList.remove('active'));
  touchWeapon.addEventListener('pointerdown', (event) => {
    if (pauseMenu.classList.contains('open')) return;
    event.preventDefault(); beginTouchSession();
    if (renderState !== null) queuedWeapon = nextUnlockedWeapon(renderState.player.selectedWeapon, renderState.player.unlockedWeaponMask);
    touchWeapon.classList.add('active');
  });
  touchWeapon.addEventListener('pointerup', () => touchWeapon.classList.remove('active'));
  touchWeapon.addEventListener('pointercancel', () => touchWeapon.classList.remove('active'));

  const clearTouchInput = (): void => {
    touchForward = 0; touchStrafe = 0; movePointerId = null; lookPointerId = null;
    moveStick.style.transform = '';
    sprintHeld = false;
    touchFire.classList.remove('active'); touchSprint.classList.remove('active');
    touchAlt.classList.remove('active'); touchWeapon.classList.remove('active');
    document.body.classList.remove('firing', 'sprinting');
  };

  const clearHumanInput = (): void => {
    pressed.clear(); fireHeld = false; fireQueued = false; altFireQueued = false; queuedWeapon = null;
    yawDelta = 0; pitchDelta = 0;
    clearTouchInput();
  };

  const setPauseOpen = (open: boolean): void => {
    if (open && (agentController.isAgentControlled() || renderState?.victory || renderState?.defeat
      || campaignMap.classList.contains('open') || shop.classList.contains('open'))) return;
    pauseMenu.classList.toggle('open', open);
    pauseMenu.setAttribute('aria-hidden', String(!open));
    document.body.dataset.paused = String(open);
    if (open) {
      audio?.setAmbience(false, 0, false);
      document.body.dataset.ambienceActive = 'false';
      clearHumanInput();
      pauseLevelName.textContent = localized(activeLevel.nameKey);
      document.exitPointerLock();
      void client.setMode('manual');
      pauseResume.focus();
      return;
    }
    if (!renderState?.victory && !renderState?.defeat && !campaignMap.classList.contains('open')) {
      void client.setMode('realtime');
      void audio?.resume();
      if (humanSessionStarted && !document.body.classList.contains('touch-active') && document.pointerLockElement !== canvas) {
        void canvas.requestPointerLock();
      }
    }
  };

  pauseButton.addEventListener('click', () => setPauseOpen(!pauseMenu.classList.contains('open')));
  pauseResume.addEventListener('click', () => setPauseOpen(false));
  pauseLevels.addEventListener('click', () => {
    pauseMenu.classList.remove('open');
    pauseMenu.setAttribute('aria-hidden', 'true');
    document.body.dataset.paused = 'false';
    setCampaignMapOpen(true);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      audio?.setAmbience(false, 0, false);
      document.body.dataset.ambienceActive = 'false';
      clearHumanInput();
      resumeAfterVisibility = !agentController.isAgentControlled()
        && !campaignMap.classList.contains('open') && !pauseMenu.classList.contains('open')
        && !renderState?.victory && !renderState?.defeat;
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
        && !campaignMap.classList.contains('open') && !pauseMenu.classList.contains('open')
        && !renderState?.victory && !renderState?.defeat) {
        resumeAfterVisibility = false;
        void client.setMode('realtime');
      }
    }
  });

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (bindingCaptureAction !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === 'Escape') {
        bindingCaptureAction = null;
        renderInputBindings();
        settingsStatus.textContent = ui('settingsHint');
      } else {
        commitInputBinding(bindingCaptureAction, event.code);
      }
      return;
    }
    if (pauseMenu.classList.contains('open')) {
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        setPauseOpen(false);
      }
      return;
    }
    if (event.code === activeInputBindings.campaign && !trainingMode && !agentController.isAgentControlled()) {
      event.preventDefault();
      setCampaignMapOpen(!campaignMap.classList.contains('open'));
      return;
    }
    if (event.code === activeInputBindings.shop && !trainingMode && !humanSessionStarted && !agentController.isAgentControlled()) {
      event.preventDefault();
      shop.classList.toggle('open');
      if (shop.classList.contains('open')) document.exitPointerLock();
      return;
    }
    if (shop.classList.contains('open')) return;
    if (event.code === activeInputBindings.sprint && activeProfile.settings.sprintMode === 'toggle' && !event.repeat) {
      sprintHeld = !sprintHeld;
      touchSprint.classList.toggle('active', sprintHeld);
      document.body.classList.toggle('sprinting', sprintHeld);
    }
    pressed.add(event.code);
    if (event.code === activeInputBindings.altFire && !event.repeat) { fireQueued = true; altFireQueued = true; }
    const weaponByCode: Partial<Record<string, WeaponId>> = {
      [activeInputBindings.weaponPulse]: 'pulse', [activeInputBindings.weaponSword]: 'sword',
      [activeInputBindings.weaponBomb]: 'bomb', [activeInputBindings.weaponLaser]: 'laser',
    };
    queuedWeapon = weaponByCode[event.code] ?? queuedWeapon;
    beginHumanSession();
  });
  window.addEventListener('keyup', (event: KeyboardEvent) => pressed.delete(event.code));
  window.addEventListener('mousedown', (event: MouseEvent) => {
    if (bindingCaptureAction === null || (event.target as Element).closest('#input-settings button') !== null) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    commitInputBinding(bindingCaptureAction, `Mouse${event.button}`);
  }, true);
  window.addEventListener('blur', () => {
    pressed.clear(); fireHeld = false; clearTouchInput();
    previousGamepadAlt = false; previousGamepadCycle = false; previousGamepadCampaign = false;
    previousGamepadShop = false; previousGamepadSprint = false;
  });
  window.addEventListener('mousemove', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    yawDelta += event.movementX * LOOK_SCALE * activeProfile.settings.mouseSensitivity;
    pitchDelta -= event.movementY * LOOK_SCALE * activeProfile.settings.mouseSensitivity;
  });
  canvas.addEventListener('click', () => {
    if (agentController.isAgentControlled() || pauseMenu.classList.contains('open')) return;
    beginHumanSession();
    void ensureAudio().resume();
    if (performance.now() - lastTouchPointerAt > 500 && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  canvas.addEventListener('mousedown', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    const code = `Mouse${event.button}`;
    pressed.add(code);
    if (code === activeInputBindings.fire) fireHeld = true;
    if (code === activeInputBindings.altFire) { fireQueued = true; altFireQueued = true; }
    document.body.classList.add('firing');
  });
  window.addEventListener('mouseup', (event: MouseEvent) => {
    const code = `Mouse${event.button}`;
    pressed.delete(code);
    if (code === activeInputBindings.fire) fireHeld = false;
    document.body.classList.remove('firing');
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    document.body.classList.toggle('locked', locked);
    if (!locked && document.visibilityState === 'visible' && humanSessionStarted && !agentController.isAgentControlled()
      && !campaignMap.classList.contains('open') && !shop.classList.contains('open')
      && !pauseMenu.classList.contains('open') && !renderState?.victory && !renderState?.defeat) {
      setPauseOpen(true);
    }
  });
  window.addEventListener('pagehide', () => {
    if (humanSessionStarted && !agentController.isAgentControlled()) persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
    renderer.dispose();
    client.terminate();
  });

  const frame = (timestamp: number): void => {
    const adaptiveTier = qualityPreference === 'auto' ? autoQuality.sample(
      timestamp,
      document.visibilityState === 'visible' && !campaignMap.classList.contains('open') && !shop.classList.contains('open'),
    ) : null;
    if (adaptiveTier !== null) {
      resolvedQuality = adaptiveTier;
      renderPresentationSettings = { ...renderPresentationSettings, qualityTier: adaptiveTier };
      renderer.setQuality(adaptiveTier);
      document.body.dataset.qualityTier = adaptiveTier;
    }
    if (!agentController.isAgentControlled()) {
      const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const connectedGamepad = Array.from(gamepads).find((candidate) => candidate?.connected) ?? null;
      const gamepad = projectStandardGamepad(connectedGamepad);
      document.body.dataset.gamepad = gamepad.connected ? 'connected' : 'disconnected';
      if (gamepad.campaign && !previousGamepadCampaign && !trainingMode) {
        setCampaignMapOpen(!campaignMap.classList.contains('open'));
      }
      if (gamepad.shop && !previousGamepadShop && !trainingMode && !humanSessionStarted) {
        shop.classList.toggle('open');
      }
      const gameInputAllowed = !campaignMap.classList.contains('open') && !shop.classList.contains('open')
        && !pauseMenu.classList.contains('open');
      if (gameInputAllowed && gamepad.altFire && !previousGamepadAlt) { fireQueued = true; altFireQueued = true; }
      if (gameInputAllowed && gamepad.cycleWeapon && !previousGamepadCycle && renderState !== null) {
        queuedWeapon = nextUnlockedWeapon(renderState.player.selectedWeapon, renderState.player.unlockedWeaponMask);
      }
      if (gameInputAllowed && activeProfile.settings.sprintMode === 'toggle'
        && gamepad.sprint && !previousGamepadSprint) {
        sprintHeld = !sprintHeld;
      }
      if (gameInputAllowed && (Math.abs(gamepad.forward) > 0 || Math.abs(gamepad.strafe) > 0
        || Math.abs(gamepad.yawDelta) > 0 || Math.abs(gamepad.pitchDelta) > 0
        || gamepad.sprint || gamepad.fire || gamepad.altFire)) {
        beginHumanSession();
      }
      const sprintActive = gameInputAllowed && (sprintHeld
        || (activeProfile.settings.sprintMode === 'hold'
          && (pressed.has(activeInputBindings.sprint) || gamepad.sprint)));
      touchSprint.classList.toggle('active', sprintActive);
      document.body.classList.toggle('sprinting', sprintActive);
      const rawCommand: PlayerCommand = {
        forward: Math.max(-1, Math.min(1,
          Number(pressed.has(activeInputBindings.forward)) - Number(pressed.has(activeInputBindings.back))
          + touchForward + (gameInputAllowed ? gamepad.forward : 0))),
        strafe: Math.max(-1, Math.min(1,
          Number(pressed.has(activeInputBindings.right)) - Number(pressed.has(activeInputBindings.left))
          + touchStrafe + (gameInputAllowed ? gamepad.strafe : 0))),
        yawDelta: yawDelta + (gameInputAllowed ? gamepad.yawDelta : 0),
        pitchDelta: pitchDelta + (gameInputAllowed ? gamepad.pitchDelta : 0),
        sprint: sprintActive,
        fire: fireQueued || fireHeld || pressed.has(activeInputBindings.fire) || (gameInputAllowed && gamepad.fire),
        altFire: altFireQueued,
        weapon: queuedWeapon,
      };
      const command = applyHumanAimAssist(
        rawCommand,
        renderState,
        difficultyProfile(renderState?.difficulty ?? activeProfile.settings.difficulty).aimAssistRadians,
      );
      client.sendInput(command);
      yawDelta = 0;
      pitchDelta = 0;
      fireQueued = false;
      altFireQueued = false;
      queuedWeapon = null;
      previousGamepadAlt = gamepad.altFire;
      previousGamepadCycle = gamepad.cycleWeapon;
      previousGamepadCampaign = gamepad.campaign;
      previousGamepadShop = gamepad.shop;
      previousGamepadSprint = gamepad.sprint;
    }
    if (renderState !== null) renderer.present(renderState, renderPresentationSettings);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

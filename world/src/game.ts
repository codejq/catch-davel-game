import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GameAudio } from './core/audio';
import type { Vec3 } from './core/collision';
import { Input } from './core/input';
import { Random } from './core/random';
import { createRobotRig, poseRobot, type RobotRig } from './enemies/robot-mesh';
import {
  angleDifference, createSentry, damageSentry, hearGunshot, updateSentry, type PlayerSnapshot, type SentryState,
} from './enemies/sentry';
import { fireBullet, stepBullet, type Bullet } from './player/ballistics';
import { PlayerBody, STANCE, type MoveIntent } from './player/body';
import { createRifleModel } from './player/rifle';
import { RifleState } from './player/rifle-state';
import { generateLayout, type WorldLayout } from './world/layout';
import { buildWorld, type BuiltWorld, type Container, type Door, type QualityTier } from './world/scene-builder';
import { WORLDS, type WorldTheme } from './world/themes';
import { srgb } from './world/materials';
import { windUniforms } from './world/vegetation';

const BASE_FOV = 72;
const LOOK_SENSITIVITY = 0.0022;
const ROBOT_PAINT: Record<string, number> = { 'green-valley': 0x5f6a4a, 'dust-ridge': 0x9a8466, 'frost-pass': 0xc4c8cc };

type Phase = 'menu' | 'playing' | 'paused' | 'dead' | 'victory';

interface Interactable {
  readonly kind: 'door' | 'container' | 'portal';
  readonly label: string;
  readonly door?: Door;
  readonly container?: Container;
}

interface Effect { readonly object: THREE.Object3D; life: number; readonly maxLife: number; readonly velocity?: THREE.Vector3 }

const element = <T extends HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (found === null) throw new Error(`Missing ${selector}`);
  return found;
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.05, 1800);
  private readonly viewScene = new THREE.Scene();
  private readonly viewCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
  private readonly sun = new THREE.DirectionalLight(0xffffff, 3);
  private readonly hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a4030, 0.4);
  private readonly sky = new Sky();
  private readonly pmrem: THREE.PMREMGenerator;
  private environment: THREE.WebGLRenderTarget | null = null;
  private readonly input: Input;
  private readonly audio = new GameAudio();
  private readonly random = new Random('catch-davel-open-world');
  private readonly rifle = new RifleState();
  private readonly rifleModel = createRifleModel();
  private readonly effects: Effect[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly tracerMaterial = new THREE.LineBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.9 });
  private readonly enemyTracerMaterial = new THREE.LineBasicMaterial({ color: 0xff6040, transparent: true, opacity: 0.9 });
  private quality: QualityTier;
  private phase: Phase = 'menu';
  private worldIndex = 0;
  private layout: WorldLayout | null = null;
  private world: BuiltWorld | null = null;
  private sentries: SentryState[] = [];
  private rigs: RobotRig[] = [];
  private body = new PlayerBody(0, 0, 0);
  private health = 100;
  private sinceHurt = 99;
  private keycard = false;
  private time = 0;
  private lastStride = 0;
  private searchProgress = 0;
  private searchTarget: Container | null = null;
  private toastTimer = 0;
  private hitTimer = 0;
  private recoilPitch = 0;
  private wasAirborne = false;
  private indoorBlend = 0;
  private debugAim = false;
  private debugFire = false;
  private readonly debugImpacts: string[] = [];
  private baseHemi = 0.4;
  private baseEnvironment = 0.5;
  private readonly alerted = new Set<string>();
  private readonly stats = { shots: 0, hits: 0, headshots: 0, kills: 0, started: 0 };
  private readonly hud = {
    root: element('#hud'), scope: element('#scope'), crosshair: element('#crosshair'), hitmarker: element('#hitmarker'),
    damage: element('#damage'), worldName: element('#world-name'), objectives: element('#objective-list'),
    compass: element('#compass-strip'), health: element('#health-bar'), stamina: element('#stamina-bar'),
    breath: element('#breath-bar'), stance: element('#stance'), visibility: element('#visibility'),
    ammo: element('#ammo-count'), reserve: element('#ammo-reserve'), weaponState: element('#weapon-state'),
    prompt: element('#prompt'), progress: element('#progress'), toast: element('#toast'), detection: element('#detection'),
    zoom: element('#scope-zoom'), range: element('#scope-range'),
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.62;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.input = new Input(canvas);
    this.quality = navigator.hardwareConcurrency > 4 ? 'high' : 'low';
    element<HTMLSelectElement>('#quality').value = this.quality;

    this.sky.scale.setScalar(4000);
    this.scene.add(this.sky, this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.camera);

    // The view model lives in its own scene so it never clips into walls.
    this.viewScene.add(new THREE.HemisphereLight(0xdde6ff, 0x3a3226, 0.7));
    const viewSun = new THREE.DirectionalLight(0xffffff, 1.2);
    viewSun.position.set(0.4, 1, 0.3);
    this.viewScene.add(viewSun, this.viewCamera);
    this.viewCamera.add(this.rifleModel.group);

    addEventListener('resize', () => this.resize());
    this.resize();
    this.bindMenus();
  }

  private bindMenus(): void {
    element('#play').addEventListener('click', () => {
      this.quality = element<HTMLSelectElement>('#quality').value === 'low' ? 'low' : 'high';
      this.audio.start();
      element('#menu').hidden = true;
      if (this.world === null) this.loadWorld(0);
      this.phase = 'playing';
      this.hud.root.hidden = false;
      this.input.lock();
    });
    element('#retry').addEventListener('click', () => {
      element('#death').hidden = true;
      this.loadWorld(this.worldIndex);
      this.phase = 'playing';
      this.input.lock();
    });
    element('#again').addEventListener('click', () => location.reload());
    this.canvas.addEventListener('click', () => { if (this.phase === 'playing') this.input.lock(); });
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.phase === 'playing') {
        this.phase = 'paused';
        element('#menu').hidden = false;
        element('#play').textContent = 'RESUME';
      }
    });
  }

  private resize(): void {
    const ratio = Math.min(devicePixelRatio, this.quality === 'high' ? 2 : 1);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = this.camera.aspect;
    this.viewCamera.updateProjectionMatrix();
  }

  get theme(): WorldTheme { return WORLDS[this.worldIndex]!; }

  loadWorld(index: number): void {
    this.worldIndex = index;
    if (this.world !== null) {
      this.scene.remove(this.world.root);
      this.world.dispose();
      for (const rig of this.rigs) this.scene.remove(rig.root);
    }
    for (const effect of this.effects.splice(0)) this.scene.remove(effect.object);
    this.bullets.length = 0;
    const theme = WORLDS[index]!;
    this.layout = generateLayout(theme);
    this.world = buildWorld(this.layout, this.quality);
    this.scene.add(this.world.root);
    this.applyAtmosphere(theme);
    this.sentries = this.layout.patrols.map((patrol) => createSentry(patrol.id, patrol.waypoints, patrol.guard, this.world!.collision));
    this.rigs = this.sentries.map(() => {
      const rig = createRobotRig(ROBOT_PAINT[theme.id] ?? 0x707070);
      this.scene.add(rig.root);
      return rig;
    });
    const spawn = this.layout.spawn;
    this.body = new PlayerBody(spawn.x, this.layout.terrain.heightAt(spawn.x, spawn.z), spawn.z);
    this.body.yaw = spawn.yaw;
    this.health = 100;
    this.keycard = false;
    this.alerted.clear();
    this.rifle.magazine = 5;
    this.rifle.reserve = Math.max(this.rifle.reserve, 20);
    this.stats.started = this.stats.started === 0 ? performance.now() : this.stats.started;
    this.audio.setAmbience(theme.snow ? 'snow' : theme.id === 'dust-ridge' ? 'desert' : 'forest');
    this.hud.worldName.textContent = `${theme.name.toUpperCase()} · WORLD ${index + 1} OF ${WORLDS.length}`;
    this.showCard(theme, index);
    this.refreshObjectives();
  }

  private applyAtmosphere(theme: WorldTheme): void {
    const uniforms = this.sky.material.uniforms;
    uniforms.turbidity!.value = theme.sky.turbidity;
    uniforms.rayleigh!.value = theme.sky.rayleigh;
    uniforms.mieCoefficient!.value = 0.005;
    uniforms.mieDirectionalG!.value = 0.82;
    const sunDirection = new THREE.Vector3().setFromSphericalCoords(
      1, THREE.MathUtils.degToRad(90 - theme.sun.elevation), THREE.MathUtils.degToRad(theme.sun.azimuth),
    );
    uniforms.sunPosition!.value.copy(sunDirection);
    this.sun.userData.direction = sunDirection;
    this.sun.color.setRGB(...theme.sun.color, THREE.SRGBColorSpace);
    this.sun.intensity = theme.sun.intensity * 1.55;
    this.hemi.color.setRGB(...theme.sky.ambient, THREE.SRGBColorSpace);
    this.hemi.groundColor.setRGB(...theme.sky.groundAmbient, THREE.SRGBColorSpace);
    this.scene.fog = new THREE.FogExp2(srgb(...theme.fog.color), theme.fog.density);
    const shadowSize = this.quality === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== shadowSize) {
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    }
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -70; shadowCamera.right = 70; shadowCamera.top = 70; shadowCamera.bottom = -70;
    shadowCamera.near = 1; shadowCamera.far = 400;
    shadowCamera.updateProjectionMatrix();
    // Image-based lighting from the sky gives metals and glass believable reflections.
    const skyScene = new THREE.Scene();
    const skyCopy = new Sky();
    skyCopy.scale.setScalar(4000);
    for (const key of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition'] as const) {
      const value = uniforms[key]!.value;
      skyCopy.material.uniforms[key]!.value = value instanceof THREE.Vector3 ? value.clone() : value;
    }
    skyScene.add(skyCopy);
    this.environment?.dispose();
    this.environment = this.pmrem.fromScene(skyScene, 0.02);
    this.scene.environment = this.environment.texture;
    this.baseEnvironment = theme.snow ? 0.55 : 0.4;
    this.baseHemi = theme.snow ? 0.35 : 0.28;
    this.scene.environmentIntensity = this.baseEnvironment;
    this.hemi.intensity = this.baseHemi;
    this.viewScene.environment = this.environment.texture;
    this.viewScene.environmentIntensity = 0.3;
  }

  private showCard(theme: WorldTheme, index: number): void {
    const card = element('#card');
    element('#card-eyebrow').textContent = `WORLD ${index + 1} OF ${WORLDS.length}`;
    element('#card-title').textContent = theme.name.toUpperCase();
    element('#card-text').textContent = theme.tagline;
    card.hidden = false;
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    window.setTimeout(() => { card.hidden = true; }, 4300);
  }

  private refreshObjectives(): void {
    const alive = this.sentries.filter((sentry) => sentry.mode !== 'dead').length;
    const items = [
      { text: 'Search the houses for the portal keycard', done: this.keycard },
      { text: 'Reach the portal and travel on', done: false },
      { text: `Optional: destroy the robots (${this.sentries.length - alive}/${this.sentries.length})`, done: alive === 0 },
    ];
    this.hud.objectives.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      li.classList.toggle('done', item.done);
      return li;
    }));
  }

  private toast(text: string, seconds = 2.2): void {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.add('show');
    this.toastTimer = seconds;
  }

  start(): void {
    let last = performance.now();
    const frame = (now: number): void => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (this.phase === 'playing') this.update(dt);
      this.render(dt);
      this.input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private update(dt: number): void {
    const world = this.world!;
    this.time += dt;
    windUniforms.uTime.value = this.time;
    if (this.input.wasPressed('Escape')) { document.exitPointerLock(); return; }

    // Look: slower when scoped so the reticle stays controllable.
    const look = this.input.consumeLook();
    const fovScale = this.camera.fov / BASE_FOV;
    this.body.yaw += look.dx * LOOK_SENSITIVITY * fovScale;
    this.body.pitch = THREE.MathUtils.clamp(this.body.pitch - look.dy * LOOK_SENSITIVITY * fovScale, -1.45, 1.45);

    const intent: MoveIntent = {
      forward: (this.input.isDown('KeyW') ? 1 : 0) - (this.input.isDown('KeyS') ? 1 : 0),
      strafe: (this.input.isDown('KeyD') ? 1 : 0) - (this.input.isDown('KeyA') ? 1 : 0),
      sprint: this.input.isDown('ShiftLeft') && this.rifle.aim < 0.3,
      jump: this.input.wasPressed('Space'),
      crouch: this.input.wasPressed('KeyC') || this.input.wasPressed('ControlLeft'),
      prone: this.input.wasPressed('KeyZ'),
    };
    const airborneBefore = !this.body.onGround;
    this.body.step(intent, dt, world.collision);
    if (airborneBefore && this.body.onGround && this.wasAirborne) this.audio.jumpLand();
    this.wasAirborne = !this.body.onGround;
    this.footsteps();

    this.updateRifle(dt);
    this.updateBullets(dt);
    this.updateSentries(dt);
    this.updateInteraction(dt);
    this.updateDoors(dt);
    this.updateEffects(dt);

    this.sinceHurt += dt;
    if (this.sinceHurt > 6 && this.health < 50) this.health = Math.min(50, this.health + dt * 3);
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) this.hud.toast.classList.remove('show');
    this.hitTimer -= dt;
    if (this.hitTimer <= 0) this.hud.hitmarker.classList.remove('show', 'kill');
    const portal = world.portal;
    portal.field.material.uniforms.uTime!.value = this.time;
    portal.field.material.uniforms.uUnlocked!.value = this.keycard ? 1 : 0;
    portal.light.color.setHex(this.keycard ? 0x55aaff : 0xff5533);
    this.audio.updateAmbience(this.time);
    this.updateHud();
  }

  private footsteps(): void {
    const interval = this.body.sprinting ? 1.35 : this.body.stance === 'prone' ? 0.6 : 0.85;
    if (this.body.stride - this.lastStride < interval) return;
    this.lastStride = this.body.stride;
    const indoors = this.body.position.y > this.layout!.terrain.heightAt(this.body.position.x, this.body.position.z) + 0.08;
    const theme = this.theme;
    const surface = indoors ? (theme.buildingStyle === 'village' ? 'wood' : 'hard') : theme.snow ? 'snow' : theme.id === 'dust-ridge' ? 'sand' : 'grass';
    const loud = this.body.sprinting ? 1.5 : this.body.stance === 'stand' ? 0.8 : 0.35;
    this.audio.footstep(surface, loud);
  }

  private viewDirection(extraYaw = 0, extraPitch = 0): THREE.Vector3 {
    const yaw = this.body.yaw + extraYaw;
    const pitch = this.body.pitch + extraPitch;
    return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  }

  private updateRifle(dt: number): void {
    const aiming = (this.input.mouseDown(2) || this.debugAim) && !this.body.sprinting && !this.body.climbing;
    this.rifle.update(dt, aiming, this.input.isDown('ShiftLeft'));
    if (this.input.wheel !== 0 && this.rifle.aim > 0.5) this.rifle.zoomIndex = this.input.wheel > 0 ? 0 : 1;
    if (this.input.wasPressed('KeyR') && this.rifle.startReload()) this.audio.reload();
    const trigger = this.input.mouseClicked(0) || this.debugFire;
    this.debugFire = false;
    if (trigger && !this.body.climbing && this.body.mantle === null) {
      if (this.rifle.magazine === 0 && !this.rifle.reloading) {
        this.audio.dryFire();
        if (this.rifle.startReload()) this.audio.reload();
      } else if (this.rifle.fire()) {
        const sway = this.rifle.sway(this.time, this.body.stance, this.body.moving, this.body.stamina);
        const hipSpread = (1 - this.rifle.aim) * 0.035;
        const direction = this.viewDirection(
          sway.yaw + (this.random.next() - 0.5) * hipSpread, sway.pitch + (this.random.next() - 0.5) * hipSpread,
        );
        const eye = this.body.eye;
        this.bullets.push(fireBullet(eye, direction));
        this.stats.shots += 1;
        this.audio.rifleShot(true);
        if (this.rifle.magazine > 0) this.audio.bolt();
        hearGunshot(this.sentries, eye, this.random);
        const recoil = this.body.stance === 'prone' ? 0.012 : this.body.stance === 'crouch' ? 0.022 : 0.03;
        this.body.pitch += recoil;
        this.recoilPitch = recoil * 0.7;
      }
    }
    // The muzzle kicks up instantly, then most of the climb settles back.
    const settle = Math.min(this.recoilPitch, dt * 0.08);
    this.body.pitch -= settle;
    this.recoilPitch -= settle;
  }

  private updateBullets(dt: number): void {
    const world = this.world!;
    for (const bullet of this.bullets) {
      const substeps = 3;
      for (let step = 0; step < substeps && bullet.alive; step += 1) {
        const impact = stepBullet(bullet, dt / substeps, world.collision, this.sentries);
        if (impact === null) continue;
        if (import.meta.env.DEV) this.debugImpacts.push(impact.kind === 'sentry' ? `sentry:${impact.headshot}` : `${impact.surface}@${impact.point.x.toFixed(1)},${impact.point.y.toFixed(1)},${impact.point.z.toFixed(1)}`);
        if (impact.kind === 'sentry') {
          const damage = impact.headshot ? 150 : 60;
          const killed = damageSentry(impact.sentry, damage, this.body.position);
          this.stats.hits += 1;
          if (impact.headshot) this.stats.headshots += 1;
          this.audio.impact(impact.headshot ? 'headshot' : 'robot');
          this.hud.hitmarker.classList.add('show');
          this.hud.hitmarker.classList.toggle('kill', killed);
          this.hitTimer = 0.25;
          this.sparks(impact.point, 0xffc070, 10);
          if (killed) {
            this.stats.kills += 1;
            this.audio.robotDown();
            this.toast(impact.headshot ? `HEADSHOT · ${Math.round(impact.distance + bullet.age * 820)} m` : 'ROBOT DOWN');
            this.refreshObjectives();
          }
        } else {
          this.audio.impact('world');
          this.dust(impact.point, impact.surface);
        }
      }
      if (bullet.trail.length >= 2 && bullet.age < 0.4) {
        const geometry = new THREE.BufferGeometry().setFromPoints(bullet.trail.map((point) => new THREE.Vector3(point.x, point.y, point.z)));
        const line = new THREE.Line(geometry, this.tracerMaterial);
        this.scene.add(line);
        this.effects.push({ object: line, life: 0.05, maxLife: 0.05 });
      }
    }
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) if (!this.bullets[index]!.alive) this.bullets.splice(index, 1);
  }

  private snapshot(): PlayerSnapshot {
    const eye = this.body.eye;
    return {
      eye, position: { ...this.body.position }, stance: this.body.stance, moving: this.body.moving, sprinting: this.body.sprinting,
      concealed: this.world!.collision.inside('cover', { x: eye.x, y: this.body.position.y + 0.3, z: eye.z }) !== null,
    };
  }

  private updateSentries(dt: number): void {
    const player = this.snapshot();
    this.sentries.forEach((sentry, index) => {
      const shot = updateSentry(sentry, player, this.world!.collision, dt, this.random);
      poseRobot(this.rigs[index]!, sentry, this.time + index);
      if (sentry.mode === 'alert' && !this.alerted.has(sentry.id)) {
        this.alerted.add(sentry.id);
        this.audio.robotAlert(0);
        this.toast('YOU HAVE BEEN SPOTTED', 1.6);
      }
      if (sentry.mode !== 'alert' && sentry.mode !== 'dead') this.alerted.delete(sentry.id);
      if (shot === null) return;
      const distance = Math.hypot(shot.from.x - player.eye.x, shot.from.z - player.eye.z);
      const bearing = angleDifference(Math.atan2(shot.from.x - player.eye.x, -(shot.from.z - player.eye.z)), this.body.yaw);
      this.audio.robotShot(Math.sin(bearing), distance);
      this.tracer(shot.from, shot.to);
      if (shot.hit) {
        this.health -= shot.damage;
        this.sinceHurt = 0;
        this.audio.hurt();
        this.hud.damage.style.transition = 'none';
        this.hud.damage.style.boxShadow = 'inset 0 0 160px 60px rgba(170, 0, 0, 0.75)';
        requestAnimationFrame(() => {
          this.hud.damage.style.transition = '';
          this.hud.damage.style.boxShadow = '';
        });
        if (this.health <= 0) this.die();
      } else {
        this.audio.bulletSnap();
      }
    });
  }

  private die(): void {
    this.phase = 'dead';
    document.exitPointerLock();
    element('#death').hidden = false;
  }

  private interactables(): Interactable | null {
    const world = this.world!;
    const eye = this.body.eye;
    const forward = this.viewDirection();
    let best: Interactable | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const consider = (point: Vec3, reach: number, candidate: Interactable): void => {
      const dx = point.x - eye.x; const dy = point.y - eye.y; const dz = point.z - eye.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > reach) return;
      const facing = (dx * forward.x + dy * forward.y + dz * forward.z) / Math.max(distance, 0.001);
      if (facing < 0.55) return;
      const score = distance * (2 - facing);
      if (score < bestScore) { bestScore = score; best = candidate; }
    };
    for (const door of world.doors) {
      const angle = door.plan.closedYaw;
      const center = { x: door.plan.hingeX + Math.cos(angle) * door.plan.width / 2, y: door.plan.hingeY + 1.1, z: door.plan.hingeZ - Math.sin(angle) * door.plan.width / 2 };
      consider(center, 2.4, { kind: 'door', label: door.open ? 'Close door' : 'Open door', door });
    }
    for (const container of world.containers) {
      if (container.searched) continue;
      const plan = container.plan;
      consider({ x: plan.x, y: plan.y + plan.height * 0.6, z: plan.z }, 2.3, { kind: 'container', label: `Search ${plan.kind}`, container });
    }
    const portal = world.portal;
    consider({ x: portal.x, y: portal.y + 2.4, z: portal.z }, 4, { kind: 'portal', label: this.keycard ? 'Enter the portal' : 'Portal locked · find the keycard' });
    return best;
  }

  private updateInteraction(dt: number): void {
    const target = this.interactables();
    this.hud.prompt.classList.toggle('show', target !== null);
    if (target === null) {
      this.searchTarget = null;
      this.searchProgress = 0;
      this.hud.progress.classList.remove('show');
      return;
    }
    this.hud.prompt.innerHTML = `<kbd>E</kbd>${target.label}`;
    if (target.kind === 'door' && this.input.wasPressed('KeyE')) {
      const door = target.door!;
      door.open = !door.open;
      // Swing away from the player.
      const normalX = Math.sin(door.plan.closedYaw); const normalZ = Math.cos(door.plan.closedYaw);
      const side = (this.body.position.x - door.plan.hingeX) * normalX + (this.body.position.z - door.plan.hingeZ) * normalZ;
      door.pivot.userData.swing = side > 0 ? 1 : -1;
      this.audio.door(door.open);
    }
    if (target.kind === 'container') {
      const container = target.container!;
      if (this.input.isDown('KeyE')) {
        if (this.searchTarget !== container) { this.searchTarget = container; this.searchProgress = 0; this.audio.search(); }
        this.searchProgress += dt / 1.4;
        this.hud.progress.classList.add('show');
        (this.hud.progress.firstElementChild as HTMLElement).style.width = `${Math.min(100, this.searchProgress * 100)}%`;
        if (this.searchProgress >= 1) this.finishSearch(container);
      } else {
        this.searchProgress = 0;
        this.hud.progress.classList.remove('show');
      }
    }
    if (target.kind === 'portal' && this.input.wasPressed('KeyE') && this.keycard) this.travel();
  }

  private finishSearch(container: Container): void {
    container.searched = true;
    this.searchProgress = 0;
    this.hud.progress.classList.remove('show');
    const random = new Random(container.plan.id);
    if (container.hasKeycard) {
      this.keycard = true;
      this.audio.pickup(true);
      this.toast('PORTAL KEYCARD FOUND', 3);
      this.refreshObjectives();
    } else if (random.chance(0.45)) {
      const rounds = random.int(3, 8);
      this.rifle.reserve += rounds;
      this.audio.pickup(false);
      this.toast(`+${rounds} ROUNDS`);
    } else if (random.chance(0.5)) {
      this.health = Math.min(100, this.health + 35);
      this.audio.pickup(false);
      this.toast('MEDKIT · +35 HEALTH');
    } else {
      this.toast('NOTHING USEFUL', 1.4);
    }
    container.mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = (object.material as THREE.MeshStandardMaterial).clone();
        material.color.multiplyScalar(0.7);
        object.material = material;
      }
    });
  }

  private travel(): void {
    this.audio.portal();
    if (this.worldIndex + 1 >= WORLDS.length) {
      this.phase = 'victory';
      document.exitPointerLock();
      const minutes = (performance.now() - this.stats.started) / 60000;
      const accuracy = this.stats.shots === 0 ? 0 : Math.round((this.stats.hits / this.stats.shots) * 100);
      element('#victory-text').textContent = `Robots destroyed: ${this.stats.kills} · Headshots: ${this.stats.headshots} · Accuracy: ${accuracy}% · Time: ${minutes.toFixed(1)} min`;
      element('#victory').hidden = false;
      return;
    }
    this.loadWorld(this.worldIndex + 1);
  }

  private updateDoors(dt: number): void {
    for (const door of this.world!.doors) {
      const target = door.open ? (door.pivot.userData.swing as number ?? 1) * Math.PI * 0.52 : 0;
      door.angle += (target - door.angle) * Math.min(1, dt * 6);
      door.pivot.rotation.y = door.plan.closedYaw + door.angle;
      door.collider.enabled = Math.abs(door.angle) < 0.35;
    }
  }

  private tracer(from: Vec3, to: Vec3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)]);
    const line = new THREE.Line(geometry, this.enemyTracerMaterial);
    this.scene.add(line);
    this.effects.push({ object: line, life: 0.08, maxLife: 0.08 });
  }

  private sparks(point: Vec3, color: number, count: number): void {
    const material = new THREE.MeshBasicMaterial({ color });
    for (let index = 0; index < count; index += 1) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), material);
      spark.position.set(point.x, point.y, point.z);
      this.scene.add(spark);
      this.effects.push({
        object: spark, life: 0.4, maxLife: 0.4,
        velocity: new THREE.Vector3((this.random.next() - 0.5) * 6, this.random.next() * 5, (this.random.next() - 0.5) * 6),
      });
    }
  }

  private dust(point: Vec3, surface: string): void {
    const color = surface === 'tree' ? 0x6a5236 : this.theme.snow ? 0xf2f4f8 : this.theme.id === 'dust-ridge' ? 0xc8a57a : 0x7a6a50;
    const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8, roughness: 1 });
    for (let index = 0; index < 6; index += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + this.random.next() * 0.1, 6, 5), material);
      puff.position.set(point.x, point.y, point.z);
      this.scene.add(puff);
      this.effects.push({
        object: puff, life: 0.9, maxLife: 0.9,
        velocity: new THREE.Vector3((this.random.next() - 0.5) * 1.5, 1 + this.random.next() * 1.5, (this.random.next() - 0.5) * 1.5),
      });
    }
  }

  private updateEffects(dt: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.life -= dt;
      if (effect.velocity !== undefined) {
        effect.velocity.y -= 6 * dt;
        effect.object.position.addScaledVector(effect.velocity, dt);
        effect.object.scale.setScalar(1 + (1 - effect.life / effect.maxLife) * 1.5);
      }
      if (effect.life <= 0) {
        this.scene.remove(effect.object);
        if (effect.object instanceof THREE.Mesh || effect.object instanceof THREE.Line) effect.object.geometry.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  private updateHud(): void {
    const hud = this.hud;
    hud.health.style.width = `${Math.max(0, this.health)}%`;
    hud.stamina.style.width = `${this.body.stamina}%`;
    hud.breath.style.width = `${this.rifle.breath}%`;
    hud.breath.parentElement!.parentElement!.classList.toggle('show', this.rifle.aim > 0.5);
    hud.stance.textContent = this.body.climbing ? 'CLIMBING' : this.body.mantle !== null ? 'CLIMBING' : this.body.sprinting ? 'RUNNING'
      : this.body.stance === 'stand' ? 'STANDING' : this.body.stance === 'crouch' ? 'CROUCHING' : 'CRAWLING';
    const player = this.snapshot();
    const spotted = this.sentries.some((sentry) => sentry.mode === 'alert');
    const hidden = player.concealed && player.stance !== 'stand';
    hud.visibility.textContent = spotted ? 'SPOTTED' : hidden ? 'HIDDEN' : player.concealed ? 'IN COVER' : 'VISIBLE';
    hud.visibility.classList.toggle('spotted', spotted);
    hud.visibility.classList.toggle('hidden-state', !spotted && hidden);
    hud.ammo.textContent = String(this.rifle.magazine);
    hud.reserve.textContent = `/ ${this.rifle.reserve}`;
    hud.weaponState.textContent = this.rifle.reloading ? 'RELOADING…' : this.rifle.cooldown > 0 ? 'CYCLING BOLT' : this.rifle.magazine === 0 ? 'EMPTY · PRESS R' : 'BOLT-ACTION · ZEROED 100 m';
    const scoped = this.rifle.aim > 0.85;
    hud.scope.style.opacity = scoped ? '1' : '0';
    hud.crosshair.classList.toggle('scoped', this.rifle.aim > 0.2);
    hud.zoom.textContent = `${this.rifle.zoom}×${this.rifle.holdingBreath ? ' · STEADY' : ''}`;
    if (scoped) {
      const hit = this.world!.collision.raycast(this.body.eye, this.viewDirection(), 600, (volume) => volume.tag === 'glass');
      hud.range.textContent = hit === null ? '— m' : `${Math.round(hit.distance)} m`;
    }
    // Compass with cardinal points and the portal marker.
    const width = 420;
    const marks: string[] = [];
    const add = (bearing: number, text: string, className: string): void => {
      const offset = angleDifference(bearing, this.body.yaw);
      if (Math.abs(offset) > Math.PI / 2) return;
      marks.push(`<span class="${className}" style="left:${width / 2 + (offset / (Math.PI / 2)) * (width / 2)}px">${text}</span>`);
    };
    for (let step = 0; step < 16; step += 1) {
      const labels = ['N', '', 'NE', '', 'E', '', 'SE', '', 'S', '', 'SW', '', 'W', '', 'NW', ''];
      add(step * Math.PI / 8, labels[step] || '·', labels[step] ? '' : 'minor');
    }
    const portal = this.world!.portal;
    add(Math.atan2(portal.x - this.body.position.x, -(portal.z - this.body.position.z)), '◆', 'portal');
    hud.compass.innerHTML = marks.join('');
    // Threat indicators around the reticle.
    const markers: string[] = [];
    for (const sentry of this.sentries) {
      if (sentry.mode === 'dead' || sentry.awareness < 0.12) continue;
      const bearing = angleDifference(Math.atan2(sentry.position.x - this.body.position.x, -(sentry.position.z - this.body.position.z)), this.body.yaw);
      const color = sentry.awareness >= 1 ? '#ff3b2f' : sentry.awareness > 0.5 ? '#ffa126' : '#ffffff';
      markers.push(`<div class="marker" style="transform:rotate(${bearing}rad)"><i style="background:${color};opacity:${0.4 + Math.min(1, sentry.awareness) * 0.6}"></i></div>`);
    }
    hud.detection.innerHTML = markers.join('');
  }

  private render(dt: number): void {
    const eye = this.body.eye;
    // Head bob from stride, landing dip, and scope sway.
    const bobAmount = this.body.onGround && this.body.moving ? (this.body.sprinting ? 0.05 : 0.025) * (1 - this.rifle.aim * 0.8) : 0;
    const bob = Math.sin(this.body.stride * 3.4) * bobAmount;
    const sway = this.rifle.sway(this.time, this.body.stance, this.body.moving, this.body.stamina);
    this.camera.position.set(eye.x, eye.y + bob - this.body.landingImpact * 0.12, eye.z);
    this.camera.rotation.set(this.body.pitch + sway.pitch, -this.body.yaw - sway.yaw, Math.sin(this.body.stride * 1.7) * bobAmount * 0.3, 'YXZ');
    const targetFov = BASE_FOV + (BASE_FOV / this.rifle.zoom - BASE_FOV) * Math.max(0, (this.rifle.aim - 0.75) / 0.25) + (this.body.sprinting ? 4 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 14);
    this.camera.updateProjectionMatrix();

    // Keep the shadow frustum centred on the player.
    const direction = (this.sun.userData.direction as THREE.Vector3 | undefined) ?? new THREE.Vector3(0.4, 0.8, 0.3);
    this.sun.target.position.set(eye.x, eye.y, eye.z);
    this.sun.position.set(eye.x + direction.x * 200, eye.y + direction.y * 200, eye.z + direction.z * 200);
    this.sky.position.copy(this.camera.position);
    this.world?.updateDetail(eye.x, eye.z);
    // Under a roof the open sky contributes far less light, so interiors fall into believable shade.
    const covered = this.world !== null && this.world.collision.blockedAbove(this.body.position, 0.2, this.body.eyeHeight + 0.2, 12);
    this.indoorBlend += ((covered ? 1 : 0) - this.indoorBlend) * Math.min(1, dt * 2.5);
    this.scene.environmentIntensity = this.baseEnvironment * (1 - this.indoorBlend * 0.7);
    this.hemi.intensity = this.baseHemi * (1 - this.indoorBlend * 0.7);

    this.poseViewModel();
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (this.rifle.aim < 0.9 && this.phase !== 'menu') {
      this.renderer.clearDepth();
      this.renderer.render(this.viewScene, this.viewCamera);
    }
  }

  private poseViewModel(): void {
    const aim = this.rifle.aim;
    const model = this.rifleModel;
    const hip = new THREE.Vector3(0.17, -0.19, -0.5);
    const ads = new THREE.Vector3(0, -0.075, -0.2);
    const position = hip.clone().lerp(ads, aim);
    const moving = this.body.moving && this.body.onGround;
    const walk = moving ? (this.body.sprinting ? 1.8 : 1) : 0;
    position.x += Math.sin(this.body.stride * 1.7) * 0.012 * walk * (1 - aim);
    position.y += Math.abs(Math.cos(this.body.stride * 1.7)) * 0.012 * walk * (1 - aim) + Math.sin(this.time * 1.4) * 0.002;
    position.z += this.rifle.recoil * 0.07;
    let pitch = this.rifle.recoil * 0.12;
    let roll = 0;
    if (this.body.sprinting) { position.x += 0.08; position.y -= 0.05; roll = 0.55; pitch -= 0.25; }
    if (this.body.climbing || this.body.mantle !== null) { position.y -= 0.4; }
    if (this.rifle.reloading) {
      const t = 1 - this.rifle.reloadTime / 2.8;
      const dip = Math.sin(Math.min(1, t) * Math.PI);
      position.y -= dip * 0.12;
      roll += dip * 0.6;
      model.magazine.position.y = -0.07 - Math.max(0, Math.sin(t * Math.PI * 2)) * 0.15;
    } else {
      model.magazine.position.y = -0.07;
    }
    model.group.position.copy(position);
    model.group.rotation.set(pitch, 0, roll);
    // Bolt cycling: lift, pull back, push forward, lock.
    const cycle = this.rifle.cooldown > 0 ? 1 - this.rifle.cooldown / 1.15 : 1;
    const phase = Math.min(1, Math.max(0, (cycle - 0.15) / 0.6));
    model.bolt.rotation.z = Math.sin(phase * Math.PI) * 1.2;
    model.bolt.position.z = 0.1 + Math.sin(phase * Math.PI) * 0.09;
    (model.flash.material as THREE.MeshBasicMaterial).opacity = this.rifle.sinceShot < 0.05 ? 1 : 0;
  }

  /** Development hook used by screenshot scripts. */
  debug(): Record<string, unknown> {
    return {
      teleport: (x: number, z: number, yaw: number, pitch = 0, fromY?: number) => {
        const collision = this.world!.collision;
        const y = fromY === undefined ? collision.groundHeight(x, z, 0.3, 500, 999) : collision.groundHeight(x, z, 0.3, fromY, 0.5);
        this.body.position.x = x; this.body.position.y = y; this.body.position.z = z;
        this.body.yaw = yaw; this.body.pitch = pitch;
      },
      setAim: (value: number) => { this.rifle.aim = value; this.debugAim = value > 0.5; },
      fire: () => { this.debugFire = true; },
      stats: () => ({ ...this.stats, health: this.health, keycard: this.keycard, world: this.worldIndex, phase: this.phase }),
      searchAll: () => { for (const container of this.world!.containers) if (!container.searched) this.finishSearch(container); },
      travel: () => this.travel(),
      los: (from: Vec3, to: Vec3) => this.world!.collision.lineOfSight(from, to, (volume) => volume.tag === 'glass'),
      impacts: () => this.debugImpacts,
      doors: () => this.world!.doors.map((door) => ({ open: door.open, plan: door.plan, blocking: door.collider.enabled })),
      stance: (stance: 'stand' | 'crouch' | 'prone') => { this.body.stance = stance; this.body.eyeHeight = STANCE[stance].eye; },
      layout: () => this.layout,
      sentries: () => this.sentries,
      body: () => this.body,
      load: (index: number) => this.loadWorld(index),
      play: () => { this.phase = 'playing'; this.hud.root.hidden = false; element('#menu').hidden = true; if (this.world === null) this.loadWorld(0); },
      info: () => ({ triangles: this.renderer.info.render.triangles, calls: this.renderer.info.render.calls }),
      step: (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) this.update(1 / 60); },
    };
  }
}

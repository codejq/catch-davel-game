import { clamp, type CollisionWorld, type Vec3, type Volume } from '../core/collision';

export type Stance = 'stand' | 'crouch' | 'prone';

export const STANCE = {
  stand: { height: 1.8, eye: 1.64, walk: 3.3, run: 8.6 },
  crouch: { height: 1.2, eye: 1.08, walk: 1.9, run: 1.9 },
  prone: { height: 0.55, eye: 0.36, walk: 0.85, run: 0.85 },
} as const satisfies Record<Stance, { height: number; eye: number; walk: number; run: number }>;

export const PLAYER_RADIUS = 0.32;
export const STEP_HEIGHT = 0.42;
const GRAVITY = 19;
const JUMP_SPEED = 5.2;
const CLIMB_SPEED = 2.3;
const MANTLE_SECONDS = 0.55;
const STAMINA_DRAIN = 16;
const STAMINA_REGEN = 11;

export interface MoveIntent {
  /** -1..1, positive forward. */
  readonly forward: number;
  /** -1..1, positive right. */
  readonly strafe: number;
  readonly sprint: boolean;
  readonly jump: boolean;
  readonly crouch: boolean;
  readonly prone: boolean;
}

export interface Mantle {
  readonly from: Vec3;
  readonly to: Vec3;
  progress: number;
}

export class PlayerBody {
  readonly position: Vec3;
  readonly velocity: Vec3 = { x: 0, y: 0, z: 0 };
  yaw = 0;
  pitch = 0;
  stance: Stance = 'stand';
  /** Smoothed eye height so stance changes glide instead of snapping. */
  eyeHeight: number = STANCE.stand.eye;
  onGround = true;
  climbing = false;
  sprinting = false;
  stamina = 100;
  mantle: Mantle | null = null;
  /** Distance travelled on foot, drives head bob and footsteps. */
  stride = 0;
  landingImpact = 0;

  constructor(x: number, y: number, z: number) {
    this.position = { x, y, z };
  }

  get eye(): Vec3 {
    return { x: this.position.x, y: this.position.y + this.eyeHeight, z: this.position.z };
  }

  get moving(): boolean {
    return Math.hypot(this.velocity.x, this.velocity.z) > 0.4;
  }

  /** Changes stance, refusing to rise when a ceiling is in the way. */
  setStance(target: Stance, world: CollisionWorld): boolean {
    if (target === this.stance) return true;
    const targetHeight = STANCE[target].height;
    if (targetHeight > STANCE[this.stance].height
      && world.blockedAbove(this.position, PLAYER_RADIUS, STANCE[this.stance].height, targetHeight)) return false;
    this.stance = target;
    return true;
  }

  step(intent: MoveIntent, dt: number, world: CollisionWorld): void {
    this.landingImpact = Math.max(0, this.landingImpact - dt * 3);
    if (intent.crouch) this.setStance(this.stance === 'crouch' ? 'stand' : 'crouch', world);
    if (intent.prone) this.setStance(this.stance === 'prone' ? 'crouch' : 'prone', world);
    const stanceSpec = STANCE[this.stance];
    this.eyeHeight += (stanceSpec.eye - this.eyeHeight) * Math.min(1, dt * 9);

    if (this.mantle !== null) {
      this.stepMantle(dt);
      return;
    }

    const forwardX = Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = Math.sin(this.yaw);
    let inputX = forwardX * intent.forward + rightX * intent.strafe;
    let inputZ = forwardZ * intent.forward + rightZ * intent.strafe;
    const inputLength = Math.hypot(inputX, inputZ);
    if (inputLength > 1) { inputX /= inputLength; inputZ /= inputLength; }

    this.sprinting = intent.sprint && this.stance === 'stand' && intent.forward > 0.2 && this.stamina > 1 && !this.climbing;
    this.stamina = clamp(this.stamina + (this.sprinting ? -STAMINA_DRAIN : STAMINA_REGEN) * dt, 0, 100);
    const speed = this.sprinting ? stanceSpec.run : stanceSpec.walk;

    const ladder = world.inside('ladder', { x: this.position.x, y: this.position.y + 0.3, z: this.position.z }, PLAYER_RADIUS);
    this.climbing = ladder !== null && this.stance !== 'prone' && (intent.forward !== 0 || this.climbing);
    if (this.climbing && ladder !== null) {
      this.stepLadder(ladder, intent, dt, world);
      return;
    }

    if (intent.jump && this.onGround && this.stance !== 'prone') {
      if (this.tryMantle(world, forwardX, forwardZ)) return;
      if (this.stance === 'crouch') this.setStance('stand', world);
      else this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }

    const control = this.onGround ? 12 : 2.5;
    this.velocity.x += (inputX * speed - this.velocity.x) * Math.min(1, dt * control);
    this.velocity.z += (inputZ * speed - this.velocity.z) * Math.min(1, dt * control);
    this.velocity.y -= GRAVITY * dt;

    const previousX = this.position.x;
    const previousZ = this.position.z;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    world.resolveHorizontal(this.position, PLAYER_RADIUS, stanceSpec.height, this.onGround ? STEP_HEIGHT : 0.05);
    const movedX = this.position.x - previousX;
    const movedZ = this.position.z - previousZ;

    const ground = world.groundHeight(this.position.x, this.position.z, PLAYER_RADIUS, this.position.y, STEP_HEIGHT);
    const fallSpeed = -this.velocity.y;
    this.position.y += this.velocity.y * dt;
    if (this.position.y <= ground) {
      if (!this.onGround && fallSpeed > 6) this.landingImpact = Math.min(1, (fallSpeed - 6) / 8);
      this.position.y = ground;
      this.velocity.y = 0;
      this.onGround = true;
    } else if (this.onGround && this.position.y - ground < STEP_HEIGHT && this.velocity.y <= 0) {
      // Stick to slopes and stairs going down instead of skipping into the air.
      this.position.y = ground;
      this.velocity.y = 0;
    } else {
      this.onGround = false;
    }
    if (this.onGround) this.stride += Math.hypot(movedX, movedZ);
  }

  private stepLadder(ladder: Volume, intent: MoveIntent, dt: number, world: CollisionWorld): void {
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.velocity.y = CLIMB_SPEED * Math.sign(intent.forward);
    this.position.y += this.velocity.y * dt;
    this.stride += Math.abs(this.velocity.y * dt);
    const ground = world.terrainHeight(this.position.x, this.position.z);
    if (this.position.y < ground) this.position.y = ground;
    if (this.position.y >= ladder.maxY - 0.15 && intent.forward > 0) {
      // Step off the top of the ladder onto whatever surface it leads to.
      const exit = ladderExit(ladder);
      this.mantle = { from: { ...this.position }, to: { x: exit.x, y: ladder.maxY, z: exit.z }, progress: 0 };
      this.climbing = false;
      this.velocity.y = 0;
    }
    if (this.position.y <= ground + 0.02 && intent.forward < 0) this.climbing = false;
    this.onGround = false;
  }

  /** Climbs onto a ledge 0.5–2.1 m above the feet directly ahead, if there is room to stand on it. */
  private tryMantle(world: CollisionWorld, forwardX: number, forwardZ: number): boolean {
    const probe = { x: this.position.x + forwardX * 0.75, z: this.position.z + forwardZ * 0.75 };
    let ledge: Volume | null = null;
    for (const volume of world.query(probe.x - 0.15, probe.z - 0.15, probe.x + 0.15, probe.z + 0.15, 'solid')) {
      const rise = volume.maxY - this.position.y;
      if (rise < 0.5 || rise > 2.1) continue;
      if (ledge === null || volume.maxY > ledge.maxY) ledge = volume;
    }
    if (ledge === null) return false;
    const target = {
      x: clamp(this.position.x + forwardX * 0.95, ledge.minX + 0.2, ledge.maxX - 0.2),
      y: ledge.maxY,
      z: clamp(this.position.z + forwardZ * 0.95, ledge.minZ + 0.2, ledge.maxZ - 0.2),
    };
    if (world.blockedAbove(target, PLAYER_RADIUS * 0.8, 0.05, STANCE.crouch.height)) return false;
    this.mantle = { from: { ...this.position }, to: target, progress: 0 };
    this.velocity.x = 0; this.velocity.y = 0; this.velocity.z = 0;
    return true;
  }

  private stepMantle(dt: number): void {
    const mantle = this.mantle!;
    mantle.progress = Math.min(1, mantle.progress + dt / MANTLE_SECONDS);
    const t = mantle.progress;
    const lift = Math.min(1, t / 0.6);
    const across = Math.max(0, (t - 0.4) / 0.6);
    this.position.x = mantle.from.x + (mantle.to.x - mantle.from.x) * across;
    this.position.y = mantle.from.y + (mantle.to.y - mantle.from.y) * (1 - (1 - lift) ** 2);
    this.position.z = mantle.from.z + (mantle.to.z - mantle.from.z) * across;
    if (t >= 1) {
      this.mantle = null;
      this.velocity.x = 0; this.velocity.y = 0; this.velocity.z = 0;
      this.onGround = true;
      this.climbing = false;
    }
  }
}

/** Ladders are tagged with the direction you step off at the top: "ladder:+x", "ladder:-z", etc. */
export function ladderExit(ladder: Volume): { x: number; z: number } {
  const centreX = (ladder.minX + ladder.maxX) / 2;
  const centreZ = (ladder.minZ + ladder.maxZ) / 2;
  const facing = ladder.tag?.split(':')[1] ?? '+z';
  const sign = facing.startsWith('-') ? -1 : 1;
  const alongX = facing.endsWith('x');
  return { x: centreX + (alongX ? sign * 0.9 : 0), z: centreZ + (alongX ? 0 : sign * 0.9) };
}

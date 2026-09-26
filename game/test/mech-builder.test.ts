import { describe, expect, it } from 'vitest';
import {
  basisFromUp, boxMatrix, buildArmoredMech, buildViewmodel, cameraBasis, cross, dot, recoilKick, vec,
  type PartSink, type Vec3,
} from '../src/render/mech-builder';

class CountingSink implements PartSink {
  spheres = 0;
  capsules = 0;
  boxes = 0;
  readonly values: number[] = [];
  sphere(center: Vec3, radius: number, _color: readonly [number, number, number], _y?: number, _z?: number,
    _emission?: number, _material?: number, matrix?: readonly number[]): void {
    this.spheres += 1;
    this.values.push(center.x, center.y, center.z, radius, ...(matrix ?? []));
  }
  capsule(start: Vec3, end: Vec3, radius: number): void {
    this.capsules += 1;
    this.values.push(start.x, start.y, start.z, end.x, end.y, end.z, radius);
  }
  box(matrix: readonly number[]): void {
    this.boxes += 1;
    this.values.push(...matrix);
  }
}

const pose = {
  hip: vec(0, 0.82, 0), chest: vec(0, 1.34, 0), head: vec(0, 1.92, 0),
  leftElbow: vec(-0.36, 1.26, 0), rightElbow: vec(0.36, 1.26, 0),
  leftHand: vec(-0.4, 0.88, 0.04), rightHand: vec(0.4, 0.88, 0.04),
  leftKnee: vec(-0.18, 0.45, 0), rightKnee: vec(0.18, 0.45, 0),
  leftFoot: vec(-0.21, 0.1, 0.08), rightFoot: vec(0.21, 0.1, 0.08),
};

const look = {
  heading: 0.4, scale: 1, torsoWidth: 0.8, headScale: 1.1, bodyColor: [0.2, 0.8, 0.3] as const,
  accentColor: [1, 0.86, 0.2] as const, eyeColor: [0.2, 1, 0.95] as const, eyeOpen: 1, browPressure: 0.1,
  mouthOpen: 0.1, pupilOffset: 0, telegraph: false, fineDetail: true,
};

describe('mech builder', () => {
  it('builds right-handed orthonormal bases', () => {
    const basis = basisFromUp(vec(0.1, 1, 0.05), vec(0, 0, 1));
    expect(dot(basis.right, basis.up)).toBeCloseTo(0, 6);
    expect(dot(basis.up, basis.forward)).toBeCloseTo(0, 6);
    expect(dot(cross(basis.right, basis.up), basis.forward)).toBeCloseTo(1, 6);
    const matrix = boxMatrix(vec(1, 2, 3), basis, 2, 3, 4);
    expect(matrix.slice(12)).toEqual([1, 2, 3, 1]);
  });

  it('emits a finite armored mech with helmet optics and fewer parts at low detail', () => {
    const detailed = new CountingSink();
    const head = buildArmoredMech(detailed, pose, look);
    expect(detailed.values.every(Number.isFinite)).toBe(true);
    expect(detailed.boxes).toBeGreaterThan(30);
    expect(head.opticLeft.x).toBeLessThan(head.opticRight.x + 1);
    expect(head.headRadius).toBeCloseTo(0.37 * 1.1, 6);
    const fast = new CountingSink();
    buildArmoredMech(fast, pose, { ...look, fineDetail: false });
    expect(fast.boxes + fast.capsules + fast.spheres)
      .toBeLessThan(detailed.boxes + detailed.capsules + detailed.spheres);
  });

  it('stays finite for a collapsed, degenerate pose', () => {
    const sink = new CountingSink();
    const flat = Object.fromEntries(Object.keys(pose).map((key) => [key, vec(0, 0.2, 0)])) as typeof pose;
    buildArmoredMech(sink, flat, { ...look, telegraph: true, mouthOpen: 2, eyeOpen: -1 });
    expect(sink.values.every(Number.isFinite)).toBe(true);
  });

  it('places every weapon in front of the camera and kicks after a shot', () => {
    for (const weapon of ['pulse', 'sword', 'bomb', 'laser'] as const) {
      const sink = new CountingSink();
      const frame = {
        eye: vec(0, 1.62, 0), yaw: 0.3, pitch: -0.1, tick: 100, bobPhase: 1.2, weapon, bombs: 2,
        laserActive: weapon === 'laser', laserHeat: 40, swordHeat: 10, lastPulseTick: 99, lastSwordTick: 96,
        lastSwordCharged: false, motionScale: 1, flashScale: 1,
      };
      buildViewmodel(sink, frame);
      expect(sink.boxes + sink.capsules + sink.spheres).toBeGreaterThan(3);
      expect(sink.values.every(Number.isFinite)).toBe(true);
    }
    expect(recoilKick(0)).toBe(1);
    expect(recoilKick(5)).toBeLessThan(0.2);
    expect(recoilKick(20)).toBe(0);
    expect(recoilKick(-1)).toBe(0);
    const camera = cameraBasis(0, 0);
    expect(camera.forward.z).toBeCloseTo(-1);
    expect(camera.up.y).toBeCloseTo(1);
  });
});

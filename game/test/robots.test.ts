import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { cellAt, worldCell } from '../src/sim/level';
import {
  ROBOT_DEFINITIONS, campaignRobotIds, campaignRobotWaves, createRobots, resolveRobotCrowding, stepRobots,
  validateRobotDefinitions,
} from '../src/sim/robots';
import { PLAYABLE_LEVEL_IDS, PLAYABLE_LEVELS } from '../src/content/levels/catalog';
import { CAMPAIGN_DANCE_PERFORMANCES, levelDancePerformance } from '../src/sim/dance-performance';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('Davel simulation', () => {
  it('uses distinct valid routes, bodies, and dances', () => {
    expect(validateRobotDefinitions).not.toThrow();
    expect(new Set(ROBOT_DEFINITIONS.map((robot) => robot.dance)).size).toBe(6);
    expect(new Set(ROBOT_DEFINITIONS.map((robot) => robot.scale)).size).toBe(ROBOT_DEFINITIONS.length);
    expect(new Set(ROBOT_DEFINITIONS.map((robot) => robot.archetype))).toEqual(new Set([
      'wobble-scout', 'blue-slider', 'red-firemouth', 'yellow-spinner', 'cyan-dj', 'invoice-overlord',
    ]));
    expect(ROBOT_DEFINITIONS.filter((robot) => robot.rank === 'elite').map((robot) => robot.name)).toEqual(['DJ Grin', 'Foreman Stomp']);
    expect(ROBOT_DEFINITIONS.filter((robot) => robot.rank === 'boss').map((robot) => robot.name)).toEqual(['The Final Invoice']);
    expect(new Set(ROBOT_DEFINITIONS.map((robot) => robot.route.map((cell) => `${cell.column},${cell.row}`).join('|'))).size).toBeGreaterThanOrEqual(7);
    expect(PLAYABLE_LEVEL_IDS.map((levelId) => campaignRobotIds(levelId).length)).toEqual([6, 5, 6, 7, 5, 6, 7, 8, 10, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 1, 8, 9, 10, 10]);
    expect(campaignRobotWaves('level-009').map((wave) => wave.length)).toEqual([5, 5]);
    expect(PLAYABLE_LEVEL_IDS.map((levelId) => campaignRobotWaves(levelId))).toEqual([
      [[0, 1, 2, 3, 4, 5]],
      [[0, 1, 2, 8, 9]],
      [[0, 1, 2, 4, 8, 9]],
      [[0, 1, 2, 3, 4, 8, 9]],
      [[0, 1, 2, 7, 8]],
      [[0, 1, 2, 4, 8, 9]],
      [[0, 1, 2, 3, 4, 8, 9]],
      [[0, 1, 2, 3, 4, 5, 8, 9]],
      [[0, 1, 2, 4, 8], [3, 5, 7, 9, 10]],
      [[6]],
      [[0, 1, 2, 3, 4, 8, 9, 10]],
      [[0, 1, 2, 9], [3, 4, 5, 7, 10]],
      [[0, 1, 4, 9, 10], [2, 3, 5, 7, 8]],
      [[0, 1, 2, 9], [3, 4, 8, 10], [5, 7]],
      [[0, 2, 4], [1, 3, 9, 10], [5, 7, 8]],
      [[0, 1, 4], [2, 3, 9, 10], [5, 7, 8]],
      [[0, 1, 2, 4], [8, 9, 10], [3, 5, 7]],
      [[0, 1, 2, 9], [3, 4, 10], [5, 7, 8]],
      [[0, 1, 2], [4, 8, 9, 10], [3, 5, 7]],
      [[6]],
      [[0, 2, 3, 4], [1, 5, 7, 9]],
      [[0, 1, 2, 4], [3, 5, 7, 9, 10]],
      [[0, 2, 3, 4], [1, 8, 9], [5, 7, 10]],
      [[0, 1, 2, 4], [3, 8, 9], [5, 7, 10]],
    ]);
    expect(campaignRobotIds('level-005').map((id) => ROBOT_DEFINITIONS[id]!.name)).toContain('Foreman Stomp');
    expect(campaignRobotIds('level-010')).toEqual([6]);
  });

  it('moves independently, deterministically, and never enters maze walls', () => {
    const first = new GameSimulation('robot-route-proof');
    const second = new GameSimulation('robot-route-proof');
    for (let tick = 0; tick < 3_600; tick += 1) {
      first.step(idle);
      second.step(idle);
      for (const robot of first.state.robots) {
        const cell = worldCell(robot.x, robot.z);
        expect(cellAt(cell.column, cell.row, first.state.levelId)).not.toBe('#');
      }
    }
    expect(first.state.robots).toEqual(second.state.robots);
    expect(new Set(first.state.robots.map((robot) => `${robot.x.toFixed(2)},${robot.z.toFixed(2)}`)).size).toBe(6);
    expect(new Set(first.state.robots.map((robot) => robot.arrivalCount)).size).toBeGreaterThan(2);
  });

  it('separates overlapping squad members deterministically without entering walls', () => {
    const first = createRobots();
    const second = createRobots();
    for (const robots of [first, second]) {
      for (const robot of robots) robot.active = robot.id < 2;
      robots[1]!.x = robots[0]!.x;
      robots[1]!.z = robots[0]!.z;
      for (let step = 0; step < 20; step += 1) resolveRobotCrowding(robots);
    }
    expect(first.map(({ x, z }) => ({ x, z }))).toEqual(second.map(({ x, z }) => ({ x, z })));
    expect(Math.hypot(first[1]!.x - first[0]!.x, first[1]!.z - first[0]!.z)).toBeGreaterThan(0.99);
    for (const robot of first.filter((entry) => entry.active)) {
      const cell = worldCell(robot.x, robot.z);
      expect(cellAt(cell.column, cell.row)).not.toBe('#');
    }
  });

  it('materializes every authored level dance as a distinct XPBD performance', () => {
    expect(new Set(Object.values(CAMPAIGN_DANCE_PERFORMANCES).map((profile) => profile.presetId)).size).toBe(24);
    for (const level of PLAYABLE_LEVELS) {
      const profile = levelDancePerformance(level.id as (typeof PLAYABLE_LEVEL_IDS)[number]);
      expect(profile.presetId).toBe(level.dance.presetId);
      expect(profile.bpm).toBe(level.dance.bpm);
      expect(profile.visualIntensity).toBe(level.dance.visualIntensity);
    }
    const signatures = PLAYABLE_LEVEL_IDS.filter((levelId) => levelId !== 'level-010').map((levelId) => {
      const robots = createRobots('campaign', levelId);
      for (let tick = 0; tick < 120; tick += 1) stepRobots(robots, 'dance-profile-proof', undefined, levelId);
      return Array.from(robots[0]!.body.positions).map((value) => value.toFixed(4)).join(',');
    });
    expect(new Set(signatures).size).toBe(23);
  });
});

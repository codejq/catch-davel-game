import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { cellAt, worldCell } from '../src/sim/level';
import {
  ROBOT_DEFINITIONS, campaignRobotIds, campaignRobotWaves, createRobots, stepRobots, validateRobotDefinitions,
} from '../src/sim/robots';
import { CHAPTER_01_LEVEL_IDS, CHAPTER_01_LEVELS } from '../src/content/levels/chapter-01';
import { CHAPTER_01_DANCE_PERFORMANCES, levelDancePerformance } from '../src/sim/dance-performance';

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
    expect(CHAPTER_01_LEVEL_IDS.map((levelId) => campaignRobotIds(levelId).length)).toEqual([6, 5, 6, 7, 5, 6, 7, 8, 10, 1]);
    expect(campaignRobotWaves('level-009').map((wave) => wave.length)).toEqual([5, 5]);
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

  it('materializes every authored level dance as a distinct XPBD performance', () => {
    expect(new Set(Object.values(CHAPTER_01_DANCE_PERFORMANCES).map((profile) => profile.presetId)).size).toBe(10);
    for (const level of CHAPTER_01_LEVELS) {
      const profile = levelDancePerformance(level.id as (typeof CHAPTER_01_LEVEL_IDS)[number]);
      expect(profile.presetId).toBe(level.dance.presetId);
      expect(profile.bpm).toBe(level.dance.bpm);
      expect(profile.visualIntensity).toBe(level.dance.visualIntensity);
    }
    const signatures = CHAPTER_01_LEVEL_IDS.slice(0, 9).map((levelId) => {
      const robots = createRobots('campaign', levelId);
      for (let tick = 0; tick < 120; tick += 1) stepRobots(robots, 'dance-profile-proof', undefined, levelId);
      return Array.from(robots[0]!.body.positions).map((value) => value.toFixed(4)).join(',');
    });
    expect(new Set(signatures).size).toBe(9);
  });
});

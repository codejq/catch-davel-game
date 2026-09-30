// The game tools an LLM agent gets, shared by the MCP server and the example Claude agent: one definition,
// one implementation. Each tool returns neutral content blocks: { type: 'text', text } or
// { type: 'image', data (base64 PNG), mimeType }.

export const GUIDE = `Zama Sniper: you are a sniper in an open 3D world held by armed robots.
Goal in each of 3 worlds: search containers (crates, cabinets, lockers, desks) in the houses until you find the portal keycard, then reach the portal and interact with it. Entering the third portal wins.
Each world holds 60 to 80 robots, 20 to 30 human soldiers (also r#, kind "soldier": life-size and about 60% faster than robots), and eight to twelve tanks, placed somewhere new every run. Weapons, ammo, and armor you collect carry over to the next world. Robots are 3.5 m tall. Health heals back to full, but only after a full minute without being hurt, and an empty weapon slowly resupplies. Robot and soldier rifles only hurt you within 10 m, but they hunt in squads: they radio your position, take cover behind trees and walls, and flank. Your rifle destroys a robot with one hit at any range; every shot is loud and brings robots to search, and a robot your shot passes near dives for cover. Crouch or go prone (especially inside bushes) to stay unseen, keep trees and walls between you and them, and shoot from far away.
Tanks (t#) drive the roads; once they see you they shell you from up to 35 m (splash damage; cover stops shells). Four rifle hits destroy a tank.
Civilian families (h#, 40 or more) and their dogs (k#, 10 or more) live in every world: some picnic, some stroll. They never attack, panic at gunfire and hide, and robots sometimes shoot them. Never shoot an innocent: each one you hit costs 5% health. Check the crosshair warning before firing.
A destroyed robot drops its automatic carbine: walk up to it to take it (plus armor and rounds), then switch with {"do":"weapon","name":"carbine"}; fire bursts with {"do":"fire","rounds":5}. The carbine is for close range; the rifle kills a robot with one hit at any range.
Doors and boxes hide loot: armor, medkits, ammo, extra lives, cash, and rifle upgrades (suppressor, extended magazine, 12x scope). Loot changes every run.
Angles: bearings are compass degrees (0 = north, 90 = east); "relative" angles are from where you look, + to the right.
The world is frozen between your commands, so take your time. Long commands (go_to, wait) stop early when a robot spots you or you are hit.`;

export const COMMAND_SCHEMA = {
  type: 'object',
  description: 'One command. The "do" field picks it; see game_help for every command and its fields.',
  properties: {
    do: { type: 'string', enum: ['start', 'move', 'turn', 'look', 'face', 'aim', 'fire', 'weapon', 'scope', 'zoom', 'stance', 'jump', 'reload', 'interact', 'search', 'go_to', 'wait'] },
    name: { type: 'string', enum: ['rifle', 'carbine'], description: 'Weapon for {"do":"weapon"}.' },
    rounds: { type: 'integer', minimum: 1, maximum: 24, description: 'Burst length for {"do":"fire"} with the carbine.' },
    direction: { type: 'string', enum: ['forward', 'back', 'left', 'right'] },
    seconds: { type: 'number' },
    run: { type: 'boolean' },
    degrees: { type: 'number' },
    bearing: { type: 'number' },
    target: { type: 'string', description: 'Id from the observation: r# robot, t# tank, h# civilian or k# dog (never shoot these), d# door, c# container, p# pickup, b# building, or "portal".' },
    on: { type: 'boolean' },
    value: { type: 'string', enum: ['stand', 'crouch', 'prone'] },
    world: { type: 'integer', minimum: 0, maximum: 2 },
    x: { type: 'number' },
    z: { type: 'number' },
  },
  required: ['do'],
};

export const TOOLS = [
  {
    name: 'game_help',
    description: 'How to play Zama Sniper and the full list of commands game_act accepts. Read this first.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'game_start',
    description: 'Start a fresh run (optionally in world 0, 1, or 2) and get the opening briefing. Also use it to try again after dying.',
    inputSchema: { type: 'object', properties: { world: { type: 'integer', minimum: 0, maximum: 2 } } },
  },
  {
    name: 'game_observe',
    description: 'Describe the current situation: your status, robots (distances, angles, whether they see you), nearby doors, containers, pickups, buildings, the portal, and what happened since you last looked. Time does not pass.',
    inputSchema: { type: 'object', properties: { json: { type: 'boolean', description: 'Also return the full structured observation as JSON.' } } },
  },
  {
    name: 'game_act',
    description: 'Run a list of commands in order (e.g. go_to a building, search a container, aim at a robot, fire). The world only moves while commands run. Returns what each command did and a fresh briefing.',
    inputSchema: { type: 'object', properties: { commands: { type: 'array', items: COMMAND_SCHEMA, minItems: 1, maxItems: 12 } }, required: ['commands'] },
  },
  {
    name: 'game_screenshot',
    description: 'A picture of what the sniper sees right now.',
    inputSchema: { type: 'object', properties: {} },
  },
];

/** Runs one tool against an open game session (see session.mjs). Throws on bad input. */
export async function runTool(session, name, args = {}) {
  switch (name) {
    case 'game_help':
      return [{ type: 'text', text: `${GUIDE}\n\n${await session.help()}` }];
    case 'game_start': {
      const outcome = await session.act([{ do: 'start', ...(Number.isInteger(args.world) ? { world: args.world } : {}) }]);
      return [{ type: 'text', text: `${outcome.results.join('\n')}\n\n${outcome.briefing}` }];
    }
    case 'game_observe': {
      const observation = await session.observe();
      const text = await session.describe();
      const blocks = [{ type: 'text', text: observation.events.length > 0 ? `${text}\nEvents: ${observation.events.join(' | ')}` : text }];
      if (args.json === true) blocks.push({ type: 'text', text: JSON.stringify(observation) });
      return blocks;
    }
    case 'game_act': {
      if (!Array.isArray(args.commands) || args.commands.length === 0) throw new Error('commands must be a non-empty array');
      if (args.commands.some((command) => typeof command !== 'object' || command === null || typeof command.do !== 'string')) {
        throw new Error('every command needs a "do" field, e.g. {"do":"go_to","target":"b2"}');
      }
      const outcome = await session.act(args.commands.slice(0, 12));
      return [{ type: 'text', text: `${outcome.results.map((line) => `- ${line}`).join('\n')}\n\n${outcome.briefing}` }];
    }
    case 'game_screenshot':
      return [{ type: 'image', data: await session.screenshot(), mimeType: 'image/png' }];
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { unknownTool: true });
  }
}

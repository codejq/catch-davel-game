#!/usr/bin/env node
// Example: Claude plays Catch Davel. A manual tool-use loop over the same game tools the MCP server offers, driving
// the game in headless Chromium through `window.catchDavel`.
//
//   ANTHROPIC_API_KEY=... node world/agent/claude-agent.mjs [--turns 40] [--world 0] [--url <game url>] [--headed]
//   node world/agent/claude-agent.mjs --dry-run      # no API calls: a scripted stand-in exercises the same tools
//
// Credentials come from the environment (ANTHROPIC_API_KEY, or an `ant auth login` profile).
import Anthropic from '@anthropic-ai/sdk';
import { openGame } from './session.mjs';
import { GUIDE, runTool, TOOLS } from './tools.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : fallback; };
const maxTurns = Number(option('--turns', '40'));
const startWorld = Number(option('--world', '0'));
const dryRun = argv.includes('--dry-run');

const SYSTEM = `${GUIDE}

You are playing through tools. Start by reading the briefing, then plan: which building to search next, where the robots are, when to hide and when to shoot. Prefer several commands per game_act call (for example go_to a building, then search the container you find). After every call, read the events: they tell you what your shots hit and who is shooting at you. Say briefly what you are doing and why before each tool call.`;

// Anthropic tool definitions from the shared ones (the API calls the schema field input_schema).
const tools = TOOLS.filter((tool) => tool.name !== 'game_start').map((tool) => ({
  name: tool.name, description: tool.description, input_schema: tool.inputSchema,
}));

/** Converts neutral tool output to tool_result content blocks. */
function toResultContent(blocks) {
  return blocks.map((block) => block.type === 'image'
    ? { type: 'image', source: { type: 'base64', media_type: block.mimeType, data: block.data } }
    : { type: 'text', text: block.text });
}

async function playWithClaude(game) {
  const client = new Anthropic();
  const opening = await runTool(game, 'game_start', { world: startWorld });
  const help = await runTool(game, 'game_help');
  const messages = [{ role: 'user', content: `${help[0].text}\n\nThe game has started:\n${opening[0].text}\n\nPlay to win.` }];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM,
      tools,
      messages,
      // Keep a long game inside the context window: clear old tool results as the conversation grows.
      context_management: { edits: [{ type: 'clear_tool_uses_20250919' }] },
      // If a request is declined by a safety classifier, the API retries it on a recommended fallback model.
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01', 'context-management-2025-06-27'],
    });

    for (const block of response.content) if (block.type === 'text' && block.text.trim() !== '') console.log(`\nClaude: ${block.text.trim()}`);
    if (response.stop_reason === 'refusal') {
      console.log(`\nRequest declined (${response.stop_details?.category ?? 'no category'}); stopping.`);
      return;
    }
    messages.push({ role: 'assistant', content: response.content });
    if (response.stop_reason === 'pause_turn') continue;
    if (response.stop_reason === 'max_tokens') { messages.push({ role: 'user', content: 'Continue.' }); continue; }

    const calls = response.content.filter((block) => block.type === 'tool_use');
    if (calls.length === 0) {
      const state = await game.observe();
      if (state.phase === 'victory') { console.log('\nVictory!'); return; }
      messages.push({ role: 'user', content: `The game is still ${state.phase}. Keep playing.` });
      continue;
    }
    // Run every tool call, then return all the results together in one message.
    const results = [];
    for (const call of calls) {
      console.log(`  -> ${call.name} ${JSON.stringify(call.input)}`);
      try {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: toResultContent(await runTool(game, call.name, call.input)) });
      } catch (error) {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: `Error: ${error.message}`, is_error: true });
      }
    }
    messages.push({ role: 'user', content: results });
    const state = await game.observe();
    if (state.phase === 'victory') { console.log('\nVictory!'); return; }
  }
  console.log(`\nStopped after ${maxTurns} turns.`);
}

/** A scripted stand-in for Claude that walks the same tool path, for checking the plumbing without API calls. */
async function dryRunPlay(game) {
  const say = (blocks) => console.log(blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n'));
  say(await runTool(game, 'game_start', { world: startWorld }));
  for (let turn = 0; turn < Math.min(maxTurns, 6); turn += 1) {
    const [, json] = await runTool(game, 'game_observe', { json: true });
    const state = JSON.parse(json.text);
    if (state.phase !== 'playing') break;
    const threat = state.robots.find((robot) => robot.inSight);
    const building = state.buildings.find((candidate) => candidate.unsearched > 0);
    const container = state.nearby.find((thing) => thing.kind === 'container' && thing.distance < 12);
    const commands = threat !== undefined ? [{ do: 'stance', value: 'crouch' }, { do: 'aim', target: threat.id }, { do: 'fire' }]
      : container !== undefined ? [{ do: 'go_to', target: container.id }, { do: 'face', target: container.id }, { do: 'search' }]
        : [{ do: 'go_to', target: building?.id ?? 'portal' }];
    console.log(`\n[turn ${turn + 1}] ${JSON.stringify(commands)}`);
    say(await runTool(game, 'game_act', { commands }));
  }
  const [shot] = await runTool(game, 'game_screenshot');
  console.log(`\nscreenshot: ${shot.type} ${shot.mimeType}, ${Math.round(shot.data.length * 0.75 / 1024)} KB`);
}

const game = await openGame({ url: option('--url', undefined), headed: argv.includes('--headed') });
try {
  if (dryRun) await dryRunPlay(game);
  else await playWithClaude(game);
} finally {
  await game.close();
}

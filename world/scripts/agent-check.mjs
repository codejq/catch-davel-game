// Checks the LLM agent integration end to end against the built game (run `npm run build` first):
// the MCP server over stdio (handshake, tool list, every tool), and the example Claude agent's tool plumbing
// in --dry-run mode (no API calls). Usage: CHROME_PATH=/path/to/chromium node scripts/agent-check.mjs
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const fail = (message) => { console.error(`Agent check failed: ${message}`); process.exit(1); };

const server = spawn(process.execPath, [here('../agent/mcp-server.mjs')], { stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = new Map();
let nextId = 1;
createInterface({ input: server.stdout }).on('line', (line) => {
  const message = JSON.parse(line);
  waiting.get(message.id)?.(message);
});
const rpc = (method, params) => new Promise((done, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 240_000);
  waiting.set(id, (message) => { clearTimeout(timer); done(message); });
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
});
const call = async (name, args = {}) => {
  const reply = await rpc('tools/call', { name, arguments: args });
  if (reply.error !== undefined) fail(`${name}: ${reply.error.message}`);
  if (reply.result.isError === true) fail(`${name}: ${reply.result.content[0].text}`);
  return reply.result.content;
};

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'agent-check', version: '1' } });
if (init.result?.serverInfo?.name !== 'catch-davel' || init.result.protocolVersion !== '2025-06-18') fail(`bad initialize reply ${JSON.stringify(init)}`);
server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
const names = (await rpc('tools/list')).result.tools.map((tool) => tool.name).sort();
if (names.join() !== 'game_act,game_help,game_observe,game_screenshot,game_start') fail(`tools ${names}`);
const unknown = await rpc('tools/call', { name: 'no_such_tool', arguments: {} });
if (unknown.error?.code !== -32602) fail('unknown tools should be a protocol error');

const help = (await call('game_help'))[0].text;
if (!help.includes('go_to') || !help.includes('keycard')) fail('help is missing the command reference');
const opening = (await call('game_start', { world: 0 }))[0].text;
if (!opening.includes('Green Valley') || !opening.includes('Buildings:')) fail(`opening briefing:\n${opening}`);
const observation = JSON.parse((await call('game_observe', { json: true }))[1].text);
if (observation.phase !== 'playing' || observation.player.health !== 100 || observation.buildings.length === 0) fail('observation shape');

// Walk to the nearest house with something to search: the route goes round walls and through the door.
const house = observation.buildings.find((building) => building.unsearched > 0);
const walk = (await call('game_act', { commands: [{ do: 'go_to', target: house.id, seconds: 45 }] }))[0].text;
if (!/go_to: (arrived|stopped)/.test(walk)) fail(`walking to ${house.id}:\n${walk}`);
const after = JSON.parse((await call('game_observe', { json: true }))[1].text);
const moved = Math.hypot(after.player.x - observation.player.x, after.player.z - observation.player.z);
if (moved < 5) fail(`only moved ${moved.toFixed(1)} m`);
const bad = (await call('game_act', { commands: [{ do: 'go_to', target: 'nowhere' }, { do: 'turn', degrees: 45 }] }))[0].text;
if (!bad.includes('unknown target') || !bad.includes('turn: now facing')) fail(`bad command handling:\n${bad}`);
const picture = (await call('game_screenshot'))[0];
if (picture.type !== 'image' || picture.mimeType !== 'image/png' || picture.data.length < 10_000) fail('screenshot');
server.stdin.end();
console.log(`MCP server: ok (walked ${moved.toFixed(0)} m to ${house.id})`);

// The example Claude agent, with a scripted stand-in instead of API calls.
const dry = spawn(process.execPath, [here('../agent/claude-agent.mjs'), '--dry-run', '--turns', '3'], { stdio: ['ignore', 'pipe', 'inherit'] });
let output = '';
dry.stdout.on('data', (chunk) => { output += chunk; });
const code = await new Promise((done) => dry.on('close', done));
if (code !== 0 || !output.includes('[turn 1]') || !output.includes('screenshot: image image/png')) fail(`claude-agent --dry-run (exit ${code}):\n${output}`);
console.log('Example Claude agent (dry run): ok');
console.log('Agent integration check passed');

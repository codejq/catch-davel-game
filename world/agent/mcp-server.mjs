#!/usr/bin/env node
// Model Context Protocol server for Zama Sniper: lets any MCP client (Claude Code, Claude Desktop, other agents)
// play the game. Speaks JSON-RPC 2.0 over stdio, one message per line. The game runs in headless Chromium and the
// world only moves while a command runs, so the model can think as long as it likes between moves.
//
//   node world/agent/mcp-server.mjs [--url <game url>] [--headed]
//
// With no --url it serves a local build from world/dist if there is one, else the published game.
import { createInterface } from 'node:readline';
import { openGame } from './session.mjs';
import { GUIDE, runTool, TOOLS } from './tools.mjs';

const argv = process.argv.slice(2);
const option = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : undefined; };
const settings = { url: option('--url'), headed: argv.includes('--headed') };

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'zama-sniper', version: '1.0.0' };

let game = null;
async function ensureGame() {
  if (game === null) game = await openGame(settings);
  return game;
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  const { id, method, params = {} } = message;
  const isRequest = id !== undefined && id !== null;
  try {
    let result;
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: SUPPORTED_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: GUIDE,
        };
        break;
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call':
        if (!TOOLS.some((tool) => tool.name === params.name)) throw Object.assign(new Error(`Unknown tool: ${params.name}`), { code: -32602 });
        try {
          result = { content: await runTool(await ensureGame(), params.name, params.arguments ?? {}) };
        } catch (error) {
          result = { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
        }
        break;
      default:
        if (!isRequest) return; // notifications such as notifications/initialized need no reply
        throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
    }
    if (isRequest) send({ jsonrpc: '2.0', id, result });
  } catch (error) {
    if (isRequest) send({ jsonrpc: '2.0', id, error: { code: error.code ?? -32603, message: error.message } });
  }
}

// Handle one message at a time so commands never interleave.
let queue = Promise.resolve();
const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
  if (line.trim() === '') return;
  let message;
  try { message = JSON.parse(line); } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  queue = queue.then(() => handle(message));
});
lines.on('close', () => { void queue.then(async () => { await game?.close(); process.exit(0); }); });

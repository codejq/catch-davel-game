// Downloads the CC0 models the game uses from Poly Haven (https://polyhaven.com, all assets CC0) and optimizes
// them for the web: 512 px WebP textures, quantized geometry, one .glb each, into public/models. It also writes
// models.provenance.json (creator, source, license, checksums, modifications) as THIRD_PARTY_ASSETS.md requires.
// Usage: node scripts/fetch-models.mjs            (needs network access to polyhaven.com and npm)
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Poly Haven asset id -> file name in public/models, and the texture size to keep. */
export const MODELS = {
  bolt_action_rifle_7_62: { file: 'sniper-rifle.glb', size: 1024 },
  ammo_box: { file: 'ammo-box.glb', size: 512 },
  medical_box: { file: 'medical-box.glb', size: 512 },
  metal_jerrycan_green: { file: 'jerrycan.glb', size: 512 },
  Barrel_01: { file: 'barrel.glb', size: 512 },
};

const out = fileURLToPath(new URL('../public/models/', import.meta.url));
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'polyhaven-'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const provenance = [];
try {
  for (const [id, { file, size }] of Object.entries(MODELS)) {
    const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
    const entry = files.gltf['1k'].gltf;
    const folder = join(work, id);
    const download = async (url, path) => {
      const target = join(folder, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
    };
    await download(entry.url, 'model.gltf');
    for (const [path, include] of Object.entries(entry.include ?? {})) await download(include.url, path);
    const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json();
    const target = join(out, file);
    execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', join(folder, 'model.gltf'), target,
      '--texture-compress', 'webp', '--texture-size', String(size), '--compress', 'quantize', '--simplify', 'false'], { stdio: 'inherit' });
    console.log(`${file}: ${(statSync(target).size / 1024).toFixed(0)} KB`);
    provenance.push({
      file: `public/models/${file}`, title: info.name, creators: Object.keys(info.authors ?? {}),
      source: `https://polyhaven.com/a/${id}`, license: 'CC0-1.0', retrieved: new Date().toISOString().slice(0, 10),
      originalSha256: sha256(join(folder, 'model.gltf')),
      originalFiles: Object.fromEntries(Object.keys(entry.include ?? {}).map((path) => [path, sha256(join(folder, path))])),
      shippedSha256: sha256(target),
      modifications: `Poly Haven 1k glTF converted to a single .glb with @gltf-transform/cli optimize: textures resized to ${size} px and re-encoded as WebP, geometry quantized (KHR_mesh_quantization), duplicate data merged.`,
      attribution: 'Not required (CC0). Credited as Poly Haven, polyhaven.com.',
    });
  }
  writeFileSync(fileURLToPath(new URL('../models.provenance.json', import.meta.url)), `${JSON.stringify(provenance, null, 2)}\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

// Builds the human characters from Quaternius's free, CC0 "Universal Base Characters" and "Universal Animation
// Library" packs (https://quaternius.itch.io): downloads both packs, optimizes the two bodies for the web
// (1024 px WebP textures, quantized geometry), keeps just the animations the game uses, and records provenance
// (sources, license, checksums) in characters.provenance.json.
// Usage: CHROME_PATH=/path/to/chromium node scripts/build-characters.mjs
//   (or pass already-downloaded zips: UBC_ZIP=... UAL_ZIP=... node scripts/build-characters.mjs)
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, mergeDocuments, prune, resample, unpartition } from '@gltf-transform/functions';
import { chromium } from 'playwright-core';

/** The clips the game plays; everything else in the 120-animation library is left out. */
export const CLIPS = [
  'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Death01', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop',
  'Sitting_Idle_Loop', 'Idle_Talking_Loop', 'Pistol_Aim_Neutral', 'Pistol_Shoot', 'Hit_Chest',
];

/** Hairstyles bundled for civilians and soldiers. */
export const HAIR = ['Hair_SimpleParted', 'Hair_Long', 'Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Beard'];

const out = fileURLToPath(new URL('../public/models/', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'characters-'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Downloads a free ("name your own price") itch.io pack the way "No thanks, just take me to the downloads" does. */
async function itchDownload(game, target) {
  const executable = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].filter(Boolean).find((path) => existsSync(path));
  const browser = await chromium.launch({ executablePath: executable });
  try {
    const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
    await page.goto(`https://quaternius.itch.io/${game}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const url = await page.evaluate(async (name) => {
      const csrf = document.querySelector('meta[name="csrf_token"]')?.getAttribute('value');
      const response = await fetch(`/${name}/download_url`, { method: 'POST', body: new URLSearchParams({ csrf_token: csrf ?? '' }) });
      return (await response.json()).url;
    }, game);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('a.download_btn[data-upload_id]', { state: 'attached', timeout: 60000 });
    const id = await page.$$eval('.upload', (rows) => rows.map((row) => ({ id: row.querySelector('[data-upload_id]')?.getAttribute('data-upload_id'), name: row.querySelector('.name')?.getAttribute('title') ?? '' }))
      .find((row) => /Standard/.test(row.name))?.id);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 600000 }),
      page.evaluate((upload) => document.querySelector(`a.download_btn[data-upload_id="${upload}"]`).click(), id)]);
    await download.saveAs(target);
  } finally {
    await browser.close();
  }
  return target;
}

try {
  const ubc = process.env.UBC_ZIP ?? await itchDownload('universal-base-characters', join(work, 'ubc.zip'));
  const ual = process.env.UAL_ZIP ?? await itchDownload('universal-animation-library', join(work, 'ual.zip'));
  execFileSync('unzip', ['-q', '-o', ubc, '-d', join(work, 'ubc')]);
  execFileSync('unzip', ['-q', '-o', ual, '-d', join(work, 'ual')]);
  const chars = join(work, 'ubc', 'Universal Base Characters[Standard]', 'Base Characters', 'Godot - UE');
  // The pack's glTF files name two normal maps "*_png.png"; the files on disk drop the suffix.
  for (const name of ['T_Hair_1_Normal', 'T_Eye_Normal', 'T_Hair_2_Normal']) {
    if (existsSync(join(chars, `${name}.png`)) && !existsSync(join(chars, `${name}_png.png`))) copyFileSync(join(chars, `${name}.png`), join(chars, `${name}_png.png`));
  }
  const provenance = [];
  for (const [source, file] of [['Superhero_Male_FullBody', 'human-male.glb'], ['Superhero_Female_FullBody', 'human-female.glb']]) {
    const target = join(out, file);
    execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', join(chars, `${source}.gltf`), target,
      // Positions stay in metres (no quantization): the game's clothing shader measures the rest-pose body.
      '--texture-compress', 'webp', '--texture-size', '1024', '--compress', 'false', '--simplify', 'false', '--join', 'false', '--instance', 'false'], { stdio: 'inherit' });
    provenance.push({ file: `public/models/${file}`, title: `Universal Base Characters: ${source}`, creators: ['Quaternius'], source: 'https://quaternius.itch.io/universal-base-characters', license: 'CC0-1.0',
      retrieved: new Date().toISOString().slice(0, 10), originalSha256: sha256(join(chars, `${source}.gltf`)), originalBinSha256: sha256(join(chars, `${source}.bin`)), shippedSha256: sha256(target),
      modifications: 'Standard (free) version, glTF converted to .glb with @gltf-transform/cli optimize: textures resized to 1024 px and re-encoded as WebP.' });
  }
  // Hairstyles (static meshes placed round the rest-pose head): merged into one file, one mesh per style.
  const hairDir = join(work, 'ubc', 'Universal Base Characters[Standard]', 'Hairstyles', 'Origin at 0', 'glTF (Godot)');
  const hairIo = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const hair = await hairIo.read(join(hairDir, `${HAIR[0]}.gltf`));
  for (const style of HAIR.slice(1)) mergeDocuments(hair, await hairIo.read(join(hairDir, `${style}.gltf`)));
  // One scene holding every style.
  const [scene, ...others] = hair.getRoot().listScenes();
  for (const other of others) { for (const node of other.listChildren()) scene.addChild(node); other.dispose(); }
  await hair.transform(unpartition(), dedup(), prune());
  const hairGltf = join(work, 'hair.glb');
  await hairIo.write(hairGltf, hair);
  const hairTarget = join(out, 'human-hair.glb');
  execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', hairGltf, hairTarget,
    '--texture-compress', 'webp', '--texture-size', '512', '--compress', 'quantize', '--simplify', 'false', '--join', 'false', '--instance', 'false', '--flatten', 'false'], { stdio: 'inherit' });
  provenance.push({ file: 'public/models/human-hair.glb', title: `Universal Base Characters: hairstyles (${HAIR.join(', ')})`, creators: ['Quaternius'], source: 'https://quaternius.itch.io/universal-base-characters', license: 'CC0-1.0',
    retrieved: new Date().toISOString().slice(0, 10), originalSha256: Object.fromEntries(HAIR.map((style) => [style, sha256(join(hairDir, `${style}.gltf`))])), shippedSha256: sha256(hairTarget),
    modifications: 'The "Origin at 0" glTF hairstyles merged into one .glb (one mesh per style) with @gltf-transform; textures resized to 512 px WebP, geometry quantized.' });
  // Animations: the library's glb, stripped to the clips the game plays, with no mesh.
  const libraryPath = join(work, 'ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb');
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const library = await io.read(libraryPath);
  const root = library.getRoot();
  for (const animation of root.listAnimations()) {
    if (CLIPS.includes(animation.getName())) continue;
    // Disposing an animation leaves its samplers (and their keyframe data) behind, so free them explicitly.
    for (const channel of animation.listChannels()) channel.dispose();
    for (const sampler of animation.listSamplers()) sampler.dispose();
    animation.dispose();
  }
  for (const node of root.listNodes()) { node.setMesh(null); node.setSkin(null); }
  await library.transform(resample(), dedup(), prune());
  const animations = join(out, 'human-anims.glb');
  await io.write(animations, library);
  provenance.push({ file: 'public/models/human-anims.glb', title: 'Universal Animation Library (Standard)', creators: ['Quaternius'], source: 'https://quaternius.itch.io/universal-animation-library', license: 'CC0-1.0',
    retrieved: new Date().toISOString().slice(0, 10), originalSha256: sha256(libraryPath), shippedSha256: sha256(animations),
    modifications: `Kept ${CLIPS.length} of the library's clips (${CLIPS.join(', ')}); meshes removed; keyframes resampled and deduplicated with @gltf-transform.` });
  for (const entry of provenance) console.log(`${entry.file}: ${(statSync(join(out, '..', '..', entry.file)).size / 1024).toFixed(0)} KB`);
  writeFileSync(fileURLToPath(new URL('../characters.provenance.json', import.meta.url)), `${JSON.stringify(provenance, null, 2)}\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

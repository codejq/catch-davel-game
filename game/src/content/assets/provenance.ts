export type ApprovedAssetLicense = 'MIT' | 'CC0-1.0' | 'CC-BY-4.0';

export interface ProjectOriginalProvenanceRecord {
  readonly id: string;
  readonly assetIds: readonly string[];
  readonly assetKind: 'palette' | 'maze-template' | 'audio-preset' | 'choreography' | 'mixed';
  readonly sourceType: 'project-original';
  readonly creator: string;
  readonly licenseId: 'MIT';
  readonly sourcePath: string;
  readonly modifications: string;
}

export interface ThirdPartyProvenanceRecord {
  readonly id: string;
  readonly assetIds: readonly string[];
  readonly assetKind: 'audio-sample' | 'texture' | 'model' | 'font' | 'mixed';
  readonly sourceType: 'third-party';
  readonly creator: string;
  readonly title: string;
  readonly licenseId: Exclude<ApprovedAssetLicense, 'MIT'>;
  readonly sourceUrl: string;
  readonly retrievedDate: string;
  readonly originalSha256: string;
  readonly shippedFiles: readonly { readonly path: string; readonly sha256: string }[];
  readonly modifications: string;
  readonly attribution: string;
}

export type AssetProvenanceRecord = ProjectOriginalProvenanceRecord | ThirdPartyProvenanceRecord;

export interface AssetProvenanceManifest {
  readonly schemaVersion: 1;
  readonly scope: 'campaign-level-content';
  readonly records: readonly AssetProvenanceRecord[];
}

interface OriginalLevelAssetRecipe {
  readonly level: string;
  readonly palette: string;
  readonly mazeTemplate: string;
  readonly audio: string;
  readonly dance: string;
  readonly sourcePath: string;
  readonly danceParts?: readonly string[];
}

const ORIGINAL_LEVEL_ASSET_RECIPES: readonly OriginalLevelAssetRecipe[] = [
  {
    level: '001', palette: 'neon-workshop-01', mazeTemplate: 'workshop-basic', audio: 'audio-neon-workshop-001',
    dance: 'wobble-march', sourcePath: 'game/src/content/levels/level-001.ts',
    danceParts: ['wobble-feet-v1', 'rubber-torso-v1', 'menace-arms-v1', 'comic-glare-v1', 'independent-patrol-v1'],
  },
  { level: '002', palette: 'neon-workshop-02', mazeTemplate: 'workshop-grinning-hall', audio: 'audio-neon-workshop-002', dance: 'side-to-side-shuffle', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '003', palette: 'neon-workshop-03', mazeTemplate: 'workshop-coin-circuit', audio: 'audio-neon-workshop-003', dance: 'pocket-robot-pop', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '004', palette: 'neon-workshop-04', mazeTemplate: 'workshop-wrong-turn-boogie', audio: 'audio-neon-workshop-004', dance: 'corner-peek-groove', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '005', palette: 'neon-workshop-05', mazeTemplate: 'workshop-foremans-two-step', audio: 'audio-neon-workshop-005', dance: 'heavy-boot-two-step', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '006', palette: 'neon-workshop-06', mazeTemplate: 'workshop-conveyor-conga', audio: 'audio-neon-workshop-006', dance: 'conveyor-conga', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '007', palette: 'neon-workshop-07', mazeTemplate: 'workshop-lights-out-smiles-on', audio: 'audio-neon-workshop-007', dance: 'flashlight-freeze-dance', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '008', palette: 'neon-workshop-08', mazeTemplate: 'workshop-shift-change', audio: 'audio-neon-workshop-008', dance: 'clockwork-charleston', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '009', palette: 'neon-workshop-09', mazeTemplate: 'workshop-workshop-rush', audio: 'audio-neon-workshop-009', dance: 'turbo-tool-shuffle', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '010', palette: 'neon-workshop-10', mazeTemplate: 'workshop-chief-wobble', audio: 'audio-neon-workshop-010', dance: 'giant-wobble-breakdown', sourcePath: 'game/src/content/levels/chapter-01.ts' },
  { level: '011', palette: 'copper-carnival-11', mazeTemplate: 'carnival-ticket-trouble', audio: 'audio-copper-carnival-011', dance: 'ticket-taker-swing', sourcePath: 'game/src/content/levels/chapter-02.ts' },
  { level: '012', palette: 'copper-carnival-12', mazeTemplate: 'carnival-sliding-sideshow', audio: 'audio-copper-carnival-012', dance: 'sideways-soft-shoe', sourcePath: 'game/src/content/levels/level-012.ts' },
  { level: '013', palette: 'copper-carnival-13', mazeTemplate: 'carnival-spinners-midway', audio: 'audio-copper-carnival-013', dance: 'carousel-kick', sourcePath: 'game/src/content/levels/level-013.ts' },
  { level: '014', palette: 'copper-carnival-14', mazeTemplate: 'carnival-firebreather-funhouse', audio: 'audio-copper-carnival-014', dance: 'flame-fan-fandango', sourcePath: 'game/src/content/levels/level-014.ts' },
  { level: '015', palette: 'copper-carnival-15', mazeTemplate: 'carnival-tempo-tent', audio: 'audio-copper-carnival-015', dance: 'tempo-tent-twist', sourcePath: 'game/src/content/levels/level-015.ts' },
  { level: '016', palette: 'copper-carnival-16', mazeTemplate: 'carnival-laughing-mirrors', audio: 'audio-copper-carnival-016', dance: 'mirrorball-lindy', sourcePath: 'game/src/content/levels/level-016.ts' },
  { level: '017', palette: 'copper-carnival-17', mazeTemplate: 'carnival-prize-booth-panic', audio: 'audio-copper-carnival-017', dance: 'jackpot-jitterbug', sourcePath: 'game/src/content/levels/level-017.ts' },
  { level: '018', palette: 'copper-carnival-18', mazeTemplate: 'carnival-big-top-backtrack', audio: 'audio-copper-carnival-018', dance: 'reverse-circus-strut', sourcePath: 'game/src/content/levels/level-018.ts' },
  { level: '019', palette: 'copper-carnival-19', mazeTemplate: 'carnival-midnight-matinee', audio: 'audio-copper-carnival-019', dance: 'moonlit-swing-off', sourcePath: 'game/src/content/levels/level-019.ts' },
  { level: '020', palette: 'copper-carnival-20', mazeTemplate: 'carnival-ringmaster-davel', audio: 'audio-copper-carnival-020', dance: 'evil-ringmaster-revue', sourcePath: 'game/src/content/levels/level-020.ts' },
  { level: '021', palette: 'toxic-boiler-21', mazeTemplate: 'boiler-pipework-promenade', audio: 'audio-toxic-boiler-021', dance: 'pipe-tap-tango', sourcePath: 'game/src/content/levels/level-021.ts' },
  { level: '022', palette: 'toxic-boiler-22', mazeTemplate: 'boiler-green-steam', audio: 'audio-toxic-boiler-022', dance: 'toxic-toe-tango', sourcePath: 'game/src/content/levels/level-022.ts' },
  { level: '023', palette: 'toxic-boiler-23', mazeTemplate: 'boiler-firemouth-fiesta', audio: 'audio-toxic-boiler-023', dance: 'flame-lick-flamenco', sourcePath: 'game/src/content/levels/level-023.ts' },
  { level: '024', palette: 'toxic-boiler-24', mazeTemplate: 'boiler-valve-velocity', audio: 'audio-toxic-boiler-024', dance: 'pressure-step-paso', sourcePath: 'game/src/content/levels/level-024.ts' },
  { level: '025', palette: 'toxic-boiler-25', mazeTemplate: 'boiler-crimson-pair', audio: 'audio-toxic-boiler-025', dance: 'duelling-tango', sourcePath: 'game/src/content/levels/level-025.ts' },
  { level: '026', palette: 'toxic-boiler-26', mazeTemplate: 'boiler-bombs-ballroom', audio: 'audio-toxic-boiler-026', dance: 'detonator-danzon', sourcePath: 'game/src/content/levels/level-026.ts' },
  { level: '027', palette: 'toxic-boiler-27', mazeTemplate: 'boiler-magenta-drain', audio: 'audio-toxic-boiler-027', dance: 'drainpipe-rumba', sourcePath: 'game/src/content/levels/level-027.ts' },
  { level: '028', palette: 'toxic-boiler-28', mazeTemplate: 'boiler-three-key-tango', audio: 'audio-toxic-boiler-028', dance: 'triple-key-cha-cha', sourcePath: 'game/src/content/levels/level-028.ts' },
  { level: '029', palette: 'toxic-boiler-29', mazeTemplate: 'boiler-fever-tunnels', audio: 'audio-toxic-boiler-029', dance: 'feverish-salsa', sourcePath: 'game/src/content/levels/level-029.ts' },
  { level: '030', palette: 'toxic-boiler-30', mazeTemplate: 'boiler-furnace-mouth', audio: 'audio-toxic-boiler-030', dance: 'inferno-flamenco-finale', sourcePath: 'game/src/content/levels/level-030.ts' },
  { level: '031', palette: 'cold-storage-31', mazeTemplate: 'cold-storage-reception', audio: 'audio-cold-storage-031', dance: 'chilly-funk-walk', sourcePath: 'game/src/content/levels/level-031.ts' },
  { level: '032', palette: 'cold-storage-32', mazeTemplate: 'cold-storage-slippery-smiles', audio: 'audio-cold-storage-032', dance: 'ice-slide-moonwalk', sourcePath: 'game/src/content/levels/level-032.ts' },
];

function originalRecord(recipe: OriginalLevelAssetRecipe): ProjectOriginalProvenanceRecord {
  const danceParts = recipe.danceParts ?? [
    `${recipe.dance}-feet-v1`, `${recipe.dance}-torso-v1`, `${recipe.dance}-arms-v1`,
    `${recipe.dance}-head-v1`, `${recipe.dance}-path-v1`,
  ];
  return {
    id: `campaign-level-${recipe.level}-originals`,
    assetIds: [recipe.palette, recipe.mazeTemplate, recipe.audio, recipe.dance, ...danceParts, `${recipe.dance}-reduced-v1`],
    assetKind: 'mixed',
    sourceType: 'project-original',
    creator: 'Quantum Billing Catch Davel contributors',
    licenseId: 'MIT',
    sourcePath: recipe.sourcePath,
    modifications: 'Original procedural palette, maze, WebAudio preset, and deterministic choreography authored in this repository.',
  };
}

export const CAMPAIGN_ASSET_PROVENANCE = {
  schemaVersion: 1,
  scope: 'campaign-level-content',
  records: ORIGINAL_LEVEL_ASSET_RECIPES.map(originalRecord),
} as const satisfies AssetProvenanceManifest;

export const PACKAGING_ASSET_PROVENANCE = {
  id: 'packaging-app-icon-original',
  assetIds: ['quantum-catch-davel-app-icon'],
  assetKind: 'mixed',
  sourceType: 'project-original',
  creator: 'Quantum Billing Catch Davel contributors',
  licenseId: 'MIT',
  sourcePath: 'game/src-tauri/icons/app-icon.svg',
  modifications: 'Original vector Davel face, Quantum ring, gradients, and generated Tauri desktop/mobile raster variants.',
} as const satisfies ProjectOriginalProvenanceRecord;

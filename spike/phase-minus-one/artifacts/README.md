# Phase -1 artifacts

`npm run spike:perf:browser` writes each local run beneath `artifacts/runs/` with:

- `run.json` — provenance, frozen configuration, host, browser, and renderer metadata;
- `samples.jsonl` — raw simulation and render samples;
- `summary.json` — distributions and harness result;
- `errors.jsonl` — console, page, and captured runtime errors.

Raw run directories are intentionally ignored because they can become large. Approved evidence is promoted by the report command as a compact manifest containing the source run's hashes; a run from development or virtual hardware must remain labeled `development-only` and cannot certify the baseline device matrix.

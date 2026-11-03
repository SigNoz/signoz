---
paths:
  - "frontend/scripts/geo-outlines/**"
  - "frontend/src/lib/visualization/charts/GeoMap/assets/**"
  - "frontend/src/lib/visualization/charts/GeoMap/geo/subdivisionCountries.ts"
---

# Geo Map outlines

- **Generated, committed, never hand-edited.** `GeoMap/assets/**` and `geo/subdivisionCountries.ts` come from `pnpm build:geo-outlines` (in `frontend/`).
- **Change the inputs, then rebuild.** Regions, aliases, merges and tuning live in `scripts/geo-outlines/config.mjs`; bumping Natural Earth means changing its pinned version there. Commit the rebuilt output with the input change.
- **CI enforces it.** The `geoci.yaml` workflow rebuilds and fails on any diff.

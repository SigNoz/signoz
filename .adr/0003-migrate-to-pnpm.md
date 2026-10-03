# Migrate from Yarn to pnpm

## Status

Accepted

## Context

Yarn install time is one of the slowest part of the CI, around 108s locally or 120s on CI. Also, we are using v1 that is
on maintenance mode since 2020, and [will eventually reach EOL](https://github.com/yarnpkg/yarn/issues/9062).

### Requirements

- Faster install times
- Better CI performance
- Reduced attack surface for supply chain attacks

## Decision

We decided to migrate to pnpm mostly due to the usage of this package manager already by
our [Component Library](https://github.com/SigNoz/components). We had good experience and the performance was great.

### Performance improvements

| CI Job    | Yarn   | pnpm  | Diff     |
|-----------|--------|-------|----------|
| tsc/js    | 2m56s  | 1m21s | -95s     |
| test/js   | 10m30s | 8m20s | -130s    |
| fmt/js    | 2m25s  | 33s   | -112s    |
| lint/js   | 2m56s  | 44s   | -130s    |
| authz     | 11m9s  | 9m24s | -105s    |
| openapi   | 2m41s  | 1m7s  | -94s     |
| **Total** |        |       | **-11m** |

Install time: 108s → 16s (5.8x faster)

### Security hardening

Added `pnpm-workspace.yaml` with minimum release age:

```yaml
trustPolicy: no-downgrade
minimumReleaseAge: 2880 # 2d
minimumReleaseAgeStrict: true
minimumReleaseAgeExclude:
  - '@signozhq/*'
blockExoticSubdeps: true
```

Prevents installing packages released less than 2 days ago — mitigates supply chain attacks where malicious code is
pushed and quickly removed.

## Consequences

- Replace `yarn` commands with `pnpm` equivalents
- `yarn add` → `pnpm add`
- `yarn install` → `pnpm install`
- `yarn run` → `pnpm run` (or just `pnpm <script>`)

### References

- PR #11158: https://github.com/SigNoz/signoz/pull/11158
- PR #11274: https://github.com/SigNoz/signoz/pull/11274

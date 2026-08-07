# Migrate from ESLint to Oxlint

## Status

Accepted

## Context

Current implementation (02/17/2025) uses ESLint v7 (latest is v10):

- **Dependencies**: 12 (without eslint itself)
- **Execution time**: 113s locally, 185s on CI
- **Memory usage**: 3472mb

Our pain with Eslint is caused by the integration of it when create a commit, causing the git commit to take multiple
seconds instead of being instant or feel instant.

### Requirements for new tooling

- Fast execution (primary goal)
- Community/plugin support
- IDE support (Cursor/VSCode, JetBrains)
- Fewer dependencies (install speed, reduced threat vector)

### Alternatives evaluated

| Feature           | ESLint | Biome | Oxlint |
|-------------------|--------|-------|--------|
| Lint Speed        | 195s   | 13s   | 6s     |
| Format Speed      | 20s    | 0.5s  | 1.3s   |
| Type-aware        | Yes    | Yes   | Yes*   |
| Plugin Support    | Yes    | No**  | Yes    |
| Dependencies      | 12     | 1     | 6      |
| Replaces Prettier | No     | Yes   | Yes*** |

\* Type-aware via tsgolint (uses Go-based TypeScript compiler)
\** Biome uses GritQL for custom rules
\*** Via oxfmt

## Decision

Migrate to Oxlint.

References:
- https://app.notion.com/p/signoz/Linting-Formatting-30cfcc6bcd1980a7bb47f04a41e67c21#30cfcc6bcd1980d28398c2fd8bcb53fb

### Rationale

1. **VoidZero ecosystem alignment**: Oxlint is part of Oxc project under VoidZero initiative (includes Vite, Vitest,
   Rolldown). Future migration to Vite benefits from consistent tooling.

2. **Performance**: Fastest option at 6s vs 195s (32x improvement). CI time: best among alternatives.

3. **JS plugin support**: Custom rules possible without learning GritQL. Example: `signoz/no-zustand-getstate-in-hooks`
   rule already implemented.

## Consequences

- **Development speed**: 32x faster linting (6s vs 195s)
- **CI time**: Significant reduction in pipeline duration
- **Memory usage**: Lower footprint than ESLint

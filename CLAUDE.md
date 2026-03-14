# SigNoz Monorepo

## Structure

| Path        | Language           | Description                                                       | Owner         |
| ----------- | ------------------ | ----------------------------------------------------------------- | ------------- |
| `frontend/` | TypeScript / React | SPA observability UI                                              | Frontend team |
| `pkg/`      | Go                 | Shared backend packages (API server, auth, alerting, cache, etc.) | Backend team  |
| `ee/`       | Go                 | Enterprise edition extensions                                     | Backend team  |
| `cmd/`      | Go                 | Service entrypoints                                               | Backend team  |
| `deploy/`   | —                  | Deployment configs                                                | Infra team    |

Each service has its own `CLAUDE.md` with team-specific conventions. Start there when working in a subdirectory.

## Repo-wide Conventions

- Frontend package manager: **yarn** (never npm)
- Go modules live at the repo root (`go.mod` / `go.sum`)
- CI is defined in `.github/workflows/`
- Commits must follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.)

<!-- Add new feature module guidelines here when patterns are established across the team. -->
<!-- Example:
## Module Guidelines

Feature modules in `src/modules/` should be self-contained:
- Own folder: `src/modules/FeatureName/`
- Co-locate: components, hooks, API calls, and tests in that folder
- Export only through an `index.ts` barrel file
-->

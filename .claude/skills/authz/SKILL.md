---
name: authz
description: Add authorization (authz) to a SigNoz backend feature end-to-end — register kinds/resources, grant managed-role permissions, wire routes with ResourceDefs, backfill tuples for existing orgs, and write the authz integration tests. Use this whenever the user mentions authz, authorization, permissions, access control, managed roles (admin/editor/viewer), OpenFGA, ResourceDef, CheckResources, 403/forbidden behavior on an endpoint, wiring or protecting a new route, registering a new resource/kind, or writing integration tests that assert role-based allow/deny. Also use it when a new API endpoint is being added and its access control hasn't been decided yet — every route needs an authz decision even if the user didn't say the word.
---

# SigNoz Authz Workflow

This skill automates the procedure documented in `docs/contributing/go/authz.md`. Read that doc first — it is the canonical explanation of the concepts (types, verbs, kinds, resources, selectors, tuples, the community/enterprise split). This skill tells you what to do; the doc tells you why it works.

The core model in one paragraph: permissions are never attached to users. They are attached to **roles** as OpenFGA tuples, and users/service accounts are made **assignees** of roles. You declare everything in code registries under `pkg/types/coretypes/`; tuples for new organizations are derived from those registries at org bootstrap. Routes declare what resource+verb they touch via `ResourceDef`s, and middleware turns that into a check that works in both community (role gate) and enterprise (per-resource FGA) editions.

## Before you start

Figure out what shape the work is. Ask the user if unclear:

- **New resource** (new kind + routes) → all steps below.
- **New route on an existing resource** → step 4 only (maybe step 3 if roles need new verbs).
- **Changing what a role can do** → steps 3, 5, 6, 7.
- **Just tests** → steps 6, 7.

Almost every feature resource is a `metaresource` (dashboards, rules, pipelines) or a `telemetryresource` (logs, traces, metrics). If the feature genuinely needs a brand-new FGA **type**, stop and flag it to the user — that requires editing both `pkg/authz/openfgaschema/base.fga` and `ee/authz/openfgaschema/base.fga` together and is almost never the right call. A new **kind** never touches the schema.

## Step 1: Register the kind

Edit `pkg/types/coretypes/registry_kind.go`. Add a var and append it to the `Kinds` slice (both are required — the slice is what gets validated and iterated):

```go
KindThing = MustNewKind("thing")
```

Kind names are lowercase, hyphen-separated (`quick-filter`, `trace-funnel`, `notification-channel`).

Also add the kind to `Kind.Enum()` in `pkg/types/coretypes/kind.go` — a second hand-maintained list mirroring `Kinds` that feeds the OpenAPI enum. It is easy to miss because nothing fails at build time without it; the drift only shows up in the generated spec.

## Step 2: Register the resource

Edit `pkg/types/coretypes/registry_resource.go`. Add a var and append it to the `Resources` slice:

```go
ResourceMetaResourceThing = NewResourceMetaResource(KindThing)
```

Use `NewResourceTelemetryResource(KindThing)` for telemetry data resources. Pass an explicit verb list only when the resource supports fewer verbs than the type default — see `ResourceMetaResourceFactorAPIKey` in that file for the shape.

## Step 3: Grant permissions to managed roles

Edit `pkg/types/coretypes/registry_managed_role.go`. Add `Transaction` entries to `ManagedRoleToTransactions` for each role that may act on the resource:

```go
{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindThing}, WildCardSelectorString)},
```

The convention: **admin** gets everything; **editor** gets full CRUD only on day-to-day observability resources (dashboards, rules, saved views — not access control or org settings); **viewer** gets `read`/`list`; **anonymous** gets nothing (public dashboards are the only exception). Match the file's existing style, including its one-line grouping comment per resource block (e.g. `// thing — editors manage, viewers read`) — that file uses grouping comments as structure; do not add comments anywhere else.

This map is the single source of truth: changing it affects only organizations created afterwards (see step 5 for existing orgs), and the integration suite asserts its contents via a golden file (see step 6).

## Step 4: Wire the route

Register routes in the existing domain file under `pkg/apiserver/signozapiserver/` — do not create new per-sub-resource route files. Each route needs three coordinated pieces:

1. **`provider.authzMiddleware.CheckResources(handlerFn, roles...)`** — the role list is the community-edition fallback gate (which managed roles may call this route when per-resource checks are unavailable).
2. **`handler.WithResourceDefs(...)`** — declares resource, verb, audit category, ID extractor, and selector.
3. **`SecuritySchemes: newScopedSecuritySchemes([]string{resource.Scope(verb)})`** — advertises the scope in the OpenAPI spec.

Selector rules (getting these wrong silently over- or under-authorizes):

| Operation | Selector | ID extractor |
|---|---|---|
| create | `WildcardSelector` | `ResponseJSONPath("data.id")` (ID exists only after the handler runs; recorded for audit) |
| list | `WildcardSelector` | none |
| read/update/delete of one instance | `IDSelector` | `PathParam("id")` or `BodyJSONPath(...)` |
| request ID ≠ FGA selector (e.g. route has a role UUID, FGA objects use role names) | custom `SelectorFunc` | as appropriate |

Routes that link two resources check **both** sides. Read `references/route-wiring.md` before wiring any create route, linking route (attach/detach, parent-child), or custom selector — it has complete real examples from `serviceaccount.go`.

Prefer `CheckResources` + `ResourceDef` for anything resource-shaped. The legacy gates `ViewAccess`/`EditAccess`/`AdminAccess` are coarse role-only checks — do not use them for new routes. `OpenAccess` means no authorization (authentication still applies); `CheckWithoutClaims` serves anonymous routes.

## Step 5: Backfill existing organizations (only if needed)

New organizations derive their tuples from the registries at creation — no migration needed for them. If **existing** organizations must get the new permissions, add a migration in `pkg/sqlmigration/` that does two things per org:

1. **Insert the FGA tuples** — follow `083_add_role_crud_tuples.go`: one `tuple` row (+ `changelog` row) per role/verb/object, with `ON CONFLICT ... DO NOTHING` so it stays idempotent, handling both the Postgres and SQLite tuple column layouts as that file does.
2. **Refresh the managed roles' JSON record** — since `099_add_role_transaction_groups.go`, each role row carries a `transaction_groups` JSON column that mirrors its permissions. Tuples and JSON must move together or the stored record drifts from the registry. Follow 099's managed-role loop: marshal `authtypes.NewTransactionGroupsFromTransactions(coretypes.ManagedRoleToTransactions[roleName])` and `UPDATE role SET transaction_groups = ? WHERE org_id = ? AND type = 'managed' AND name = ?`. Serializing from the registry (which already contains your new grants) makes this step self-updating. Custom roles need no changes — only managed roles mirror the registry.

Register the new migration factory in `NewSQLMigrationProviderFactories` in `pkg/signoz/provider.go`, appended after the existing entries. The factory name passed to `factory.MustNewName` must match `^[a-z][a-z0-9_-]{0,30}$` — at most 31 characters, or it panics at startup; prefer a short name like `notification_template_tuples` over `add_notification_template_tuples`.

Ask the user whether backfill is needed rather than assuming — shipping a feature to existing orgs almost always means yes.

## Step 6: Update the golden testdata and regenerate CI-checked artifacts

If you changed `ManagedRoleToTransactions`, update `tests/integration/testdata/role/managed_role_transactions.json` to match — the `role/01_register.py` integration test compares each managed role's verb/type/kind matrix against this file and will fail otherwise.

If you touched the registries or `Kind.Enum()`, regenerate the derived artifacts. The `goci` GitHub workflow reruns each of these and fails the PR on any uncommitted diff:

```bash
go run cmd/enterprise/*.go generate openapi                    # docs/api/openapi.yml
go run cmd/enterprise/*.go generate authz                      # frontend/src/lib/authz/hooks/useAuthZ/permissions.type.ts
go run cmd/enterprise/*.go generate config transaction-groups  # frontend/src/schemas/generated/transactionGroups.schema.json
```

Commit whatever they change; never hand-edit these generated files.

`generate authz` is allowlist-based: it only emits resources listed in the `allowedResources` map inside `runGenerateAuthz` in `cmd/authz.go`. For the new resource to surface in the UI's permission gating (AuthZButton and friends), add it there —

```go
coretypes.NewResourceRef(coretypes.ResourceMetaResourceThing).String(): true,
```

— then rerun `generate authz` and commit the regenerated `permissions.type.ts`. If the resource has no UI surface yet, skip the allowlist entry and the command produces no diff; that is expected.

## Step 7: Write integration tests

Read `references/integration-tests.md` for the suite layout, fixtures, and canonical allow/deny test shapes. The minimum bar for a new authz'd resource: each managed role's expected 200-vs-403 matrix on the new routes, and (if enterprise/FGA behavior matters) per-object scoping with a custom role — granted instance succeeds, non-granted instance gets 403, revoke flips it back to 403.

Python test conventions that are hard rules in this repo: inline `requests.*` calls directly (never wrap single API calls in helpers), always pass `timeout=`, and run `make py-fmt && make py-lint` before finishing.

## Verification

Run these before declaring the work done:

```bash
make go-build-community
```

Consistency greps — every one of these must hold:

- the new `Kind` var appears in BOTH the `Kinds` slice (`registry_kind.go`) and `Kind.Enum()` (`kind.go`)
- the three `generate` commands from step 6 have been run and leave `git diff` clean when re-run
- if the resource is UI-gated, it appears in `allowedResources` in `cmd/authz.go` and `permissions.type.ts` was regenerated
- the new `Resource` var appears in the `Resources` slice (`registry_resource.go`)
- every `ResourceDef` in the route file references the registered resource and one of its allowed verbs
- every route's `SecuritySchemes` scope matches its `ResourceDef` verb
- if `ManagedRoleToTransactions` changed, `managed_role_transactions.json` changed with it

Then run the relevant integration suites (`make py-test-setup` from the repo root boots the environment; pytest runs from `tests/`):

```bash
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/role/
uv run pytest --basetemp=./tmp/ -vv --reuse integration/tests/<your-suite>/
```

General repo conventions apply throughout: no code comments (the grouping comments in `registry_managed_role.go` are the sole exception), complete descriptive names, and never commit without an explicit ask.

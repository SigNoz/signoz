# Authz

SigNoz uses [OpenFGA](https://openfga.dev/), a relationship-based access control (ReBAC) system, to authorize every request. Transactions are never attached to users directly — they are attached to **roles** (as relationship tuples in OpenFGA), and users or service accounts (principals) are made **assignees** of those roles. The central interface is `AuthZ` in [pkg/authz/authz.go](/pkg/authz/authz.go), backed by an embedded OpenFGA server in [pkg/authz/openfgaserver](/pkg/authz/openfgaserver/server.go).

As a feature author, you will rarely touch OpenFGA directly. You interact with two layers:

1. **The registries** in [pkg/types/coretypes](/pkg/types/coretypes) — where every resource, verb, and managed-role permission is declared in code.
2. **The route wiring** in [pkg/apiserver/signozapiserver](/pkg/apiserver/signozapiserver) — where each route declares what resource it touches and which verb it needs, and the middleware turns that into a check.

## What are the building blocks?

### Type

A `Type` is the coarse FGA type of a resource. The set is finite and defined in [pkg/types/coretypes/registry_type.go](/pkg/types/coretypes/registry_type.go): `user`, `serviceaccount`, `anonymous`, `role`, `organization`, `metaresource`, and `telemetryresource`. Each type carries a selector regex (what a valid ID looks like) and the verbs allowed on it.

Almost every feature resource is a `metaresource` (dashboards, rules, pipelines, ...) or a `telemetryresource` (logs, traces, metrics). You should almost never need a new type.

### Verb

A `Verb` is the action being authorized. All verbs are defined in [pkg/types/coretypes/registry_verb.go](/pkg/types/coretypes/registry_verb.go): `create`, `read`, `update`, `delete`, `list`, `assignee`, `attach`, and `detach`.

- `assignee` is special: it is the membership relation between a subject and a role ("user X is an assignee of role Y"), not an action a route checks for.
- `attach`/`detach` authorize linking two resources together (e.g. assigning a role to a service account).

### Kind

A `Kind` is the fine-grained name of your resource — `dashboard`, `rule`, `quick-filter`. Kinds are registered in [pkg/types/coretypes/registry_kind.go](/pkg/types/coretypes/registry_kind.go). A kind rides on top of an existing type, so adding one does **not** require any OpenFGA schema change.

### Resource

A `Resource` ties a type and a kind together and knows how to render itself as an FGA object string. The interface lives in [pkg/types/coretypes/resource.go](/pkg/types/coretypes/resource.go):

```go
type Resource interface {
    Type() Type
    Kind() Kind
    Prefix(orgId valuer.UUID) string      // metaresource:organization/<orgID>/dashboard
    Object(orgId valuer.UUID, selector string) string
    Scope(verb Verb) string               // dashboard:read
    AllowedVerbs() []Verb
}
```

All resources are registered in [pkg/types/coretypes/registry_resource.go](/pkg/types/coretypes/registry_resource.go) using constructors like `NewResourceMetaResource(KindDashboard)` or `NewResourceTelemetryResource(KindLogs)`.

### Selector

A `Selector` identifies *which* instance(s) of a resource a check is about — a UUID, a role name, or the wildcard `*`. A `SelectorFunc` maps the extracted resource ID to selectors at request time. Two prebuilt ones cover most routes ([pkg/types/coretypes/selector.go](/pkg/types/coretypes/selector.go)):

- `WildcardSelector` — the check is against all instances of the resource (`create`, `list`).
- `IDSelector` — the check is against the specific instance *or* the wildcard (`read`, `update`, `delete` of one object). A subject authorized on `*` is authorized on every instance.

When the ID in the request is not what FGA needs (e.g. routes receive a role UUID but FGA objects use role names), write a custom `SelectorFunc` — see `roleSelector` in [pkg/apiserver/signozapiserver/serviceaccount.go](/pkg/apiserver/signozapiserver/serviceaccount.go).

### Roles, transactions, and tuples

SigNoz ships four managed roles, declared in [pkg/types/coretypes/registry_managed_role.go](/pkg/types/coretypes/registry_managed_role.go): `signoz-admin`, `signoz-editor`, `signoz-viewer`, and `signoz-anonymous`. Their permissions are declared in code as `Transaction`s (a verb on an object) in `ManagedRoleToTransactions` — this map is the single source of truth for what each managed role can do.

At organization bootstrap, `CreateManagedRoles` and `CreateManagedUserRoleTransactions` (see [pkg/authz/authz.go](/pkg/authz/authz.go)) persist the role rows and write one OpenFGA tuple per transaction, linking `role:organization/<orgID>/role/<name>#assignee` to each permitted object. Users and service accounts are then granted roles via `Grant`/`Revoke`, which writes `assignee` tuples. Custom roles (enterprise) are managed through the roles API in [pkg/authz/signozauthzapi/handler.go](/pkg/authz/signozauthzapi/handler.go).

### Schema

The OpenFGA authorization model is a hand-written DSL, embedded at build time: [pkg/authz/openfgaschema/base.fga](/pkg/authz/openfgaschema/base.fga) for community and [ee/authz/openfgaschema/base.fga](/ee/authz/openfgaschema/base.fga) for enterprise. The community model only supports role assignment; the enterprise model defines per-verb relations on every type, enabling genuine per-resource checks. This split is why `CheckWithTupleCreation` behaves differently per edition (see [How does a check work at runtime?](#how-does-a-check-work-at-runtime)). You only touch these files when introducing a brand-new **type** — never for a new kind.

## How do I add authz to my feature?

### 1. Register the kind

Add your kind in [pkg/types/coretypes/registry_kind.go](/pkg/types/coretypes/registry_kind.go) and append it to `Kinds`:

```go
KindThing = MustNewKind("thing")
```

### 2. Register the resource

Add the resource in [pkg/types/coretypes/registry_resource.go](/pkg/types/coretypes/registry_resource.go) and append it to `Resources`:

```go
ResourceMetaResourceThing = NewResourceMetaResource(KindThing)
```

Pass an explicit verb list to `NewResourceMetaResource` only if your resource supports fewer verbs than the type default.

### 3. Grant permissions to managed roles

Decide what each managed role can do with your resource and add the transactions in [pkg/types/coretypes/registry_managed_role.go](/pkg/types/coretypes/registry_managed_role.go):

```go
// thing — editors manage, viewers read
{Verb: VerbCreate, Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindThing}, WildCardSelectorString)},
```

The convention so far: admin gets everything, editor gets CRUD on day-to-day observability resources, viewer gets `read`/`list`, anonymous gets nothing (except public dashboards).

### 4. Wire the route

Register the route in [pkg/apiserver/signozapiserver](/pkg/apiserver/signozapiserver), wrapping your handler with `CheckResources` and declaring what the route touches via a `ResourceDef` ([pkg/http/handler/resourcedef.go](/pkg/http/handler/resourcedef.go)). A complete example from [pkg/apiserver/signozapiserver/serviceaccount.go](/pkg/apiserver/signozapiserver/serviceaccount.go):

```go
router.Handle("/api/v1/service_accounts", handler.New(
    provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Create, authtypes.SigNozAdminRoleName),
    handler.OpenAPIDef{
        ID: "CreateServiceAccount",
        // ...
        SecuritySchemes: newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbCreate)}),
    },
    handler.WithResourceDefs(handler.BasicResourceDef{
        Resource: coretypes.ResourceServiceAccount,
        Verb:     coretypes.VerbCreate,
        Category: coretypes.ActionCategoryAccessControl,
        ID:       coretypes.ResponseJSONPath("data.id"),
        Selector: coretypes.WildcardSelector,
    }),
)).Methods(http.MethodPost)
```

The pieces:

- **`CheckResources(handlerFn, roles...)`** — the resource-aware authorization wrapper from [pkg/http/middleware/authz.go](/pkg/http/middleware/authz.go). The role list is the community-edition fallback: which managed roles may call this route when per-resource checks are unavailable.
- **`ResourceDef`** — declares the resource, verb, audit category, how to extract the instance ID, and how to turn that ID into selectors. ID extractors live in [pkg/types/coretypes/extractor.go](/pkg/types/coretypes/extractor.go): `PathParam("id")`, `BodyJSONPath("data.id")`, `BodyJSONArray("ids")`, and `ResponseJSONPath("data.id")` for IDs only known after the handler runs (e.g. `create`).
- **`SecuritySchemes`** — advertises the required scope (`resource.Scope(verb)`, e.g. `serviceaccount:create`) in the OpenAPI spec.

For routes that link two resources, use `AttachDetachSiblingResourceDef` (both sides are authz-checked, e.g. attaching a role to a service account requires `attach` on **both** the service account and the role). For parent-child routes (e.g. creating an API key under a service account), both sides are checked too, but with different verbs: declare a `BasicResourceDef` checking the child with `create`/`delete`, alongside an `AttachDetachParentChildResourceDef` checking the parent with `attach`/`detach` (within that def the child is only recorded for audit) — see the `/api/v1/service_accounts/{id}/keys` route in [pkg/apiserver/signozapiserver/serviceaccount.go](/pkg/apiserver/signozapiserver/serviceaccount.go).

Prefer `CheckResources` with a `ResourceDef` for anything resource-shaped. The older coarse gates `ViewAccess`/`EditAccess`/`AdminAccess` only check "does the caller hold one of these roles" and give up per-resource granularity; `OpenAccess` performs no authorization (authentication still applies); `CheckWithoutClaims` serves anonymous routes such as public dashboards.

### 5. Backfill existing organizations (only if needed)

Managed-role tuples are written from the registry at organization creation, so **new resources need no migration for new organizations**. If existing organizations must get the new permissions, add a migration in [pkg/sqlmigration](/pkg/sqlmigration) that inserts the tuples — see [083_add_role_crud_tuples.go](/pkg/sqlmigration/083_add_role_crud_tuples.go) for the pattern.

## How does a check work at runtime?

1. The resource middleware ([pkg/http/middleware/resource.go](/pkg/http/middleware/resource.go)) runs on every request. It reads the matched handler's `ResourceDef`s, extracts the resource IDs from path/body, and stores the resolved resources in the request context.
2. `CheckResources` reads them back, runs each `SelectorFunc`, and calls `AuthZ.CheckWithTupleCreation(ctx, claims, orgID, relation, resource, selectors, roleSelectors)`.
3. What happens next depends on the edition:
   - **Community** ([pkg/authz/openfgaserver/server.go](/pkg/authz/openfgaserver/server.go)) ignores the resource and selectors and only checks whether the subject is an `assignee` of one of the allowed roles — a plain role gate.
   - **Enterprise** ([ee/authz/openfgaserver/server.go](/ee/authz/openfgaserver/server.go)) builds tuples via `authtypes.NewTuples` — subject `user:organization/<orgID>/user/<userID>`, relation `create`, object `serviceaccount:organization/<orgID>/serviceaccount/*` — and batch-checks them against OpenFGA: genuine per-resource authorization, including custom roles.

Because both paths go through the same middleware and the same `ResourceDef` declarations, a route wired once works correctly in both editions.

## What should I remember?

- Declare authz in the registries ([pkg/types/coretypes](/pkg/types/coretypes)), not in migrations — tuples for new organizations are derived from code at bootstrap.
- A new kind never needs an OpenFGA schema change; only a new type does, and then **both** [pkg/authz/openfgaschema/base.fga](/pkg/authz/openfgaschema/base.fga) and [ee/authz/openfgaschema/base.fga](/ee/authz/openfgaschema/base.fga) must be updated together.
- Prefer `CheckResources` + `ResourceDef` over the coarse `ViewAccess`/`EditAccess`/`AdminAccess` gates for new routes.
- Use `WildcardSelector` for `create`/`list`, `IDSelector` for instance operations, and a custom `SelectorFunc` when the request ID is not the FGA selector.
- Linking routes check **both** sides: peers via `AttachDetachSiblingResourceDef` (same verb on both), parent-child via a `BasicResourceDef` on the child (`create`/`delete`) paired with an `AttachDetachParentChildResourceDef` on the parent (`attach`/`detach`).
- Changing `ManagedRoleToTransactions` only affects organizations created afterwards — add a [pkg/sqlmigration](/pkg/sqlmigration) migration to backfill existing ones.

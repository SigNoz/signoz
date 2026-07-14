# Types

Domain types in `pkg/types/<domain>/` live on three serialization boundaries — inbound HTTP, outbound HTTP, and SQL — on top of an in-memory domain representation. SigNoz's convention is **core-type-first**: every domain defines a single canonical type `X`, and specialized flavors (`PostableX`, `GettableX`, `UpdatableX`, `StorableX`) are introduced **only when they actually differ from `X`**. This guide spells out when each flavor is warranted and how they relate to each other.

Before reading, make sure you have read [abstractions.md](abstractions.md) — the rules here build on its guidance that every new type must earn its place.

## The core type is required

Every domain package in `pkg/types/<domain>/` defines exactly one core type `X`: `AuthDomain`, `Channel`, `Rule`, `Dashboard`, `Role`, `PlannedMaintenance`. This is the canonical in-memory representation of the domain object. Domain methods, validation invariants, and business logic hang off `X` — not off the flavor types.

Two rules shape how the core type behaves:

- **Conversions can be either `New<Output>From<Input>` or a receiver-style `(x *X) ToY()` method.** Either form is fine; pick whichever reads best at the call site:

    ```go
    // Constructor form
    func NewGettableAuthDomainFromAuthDomain(d *AuthDomain, info *AuthNProviderInfo) *GettableAuthDomain

    // Receiver form
    func (m *PlannedMaintenanceWithRules) ToPlannedMaintenance() *PlannedMaintenance
    ```
- **`X` can double as the storage row** when the DB shape would be identical. `Channel` embeds `bun.BaseModel` directly, and there is no `StorableChannel`. This is the preferred shape when it works.

Domain packages under `pkg/types/` must not import from other `pkg/` packages. Keep the core type's methods lightweight and push orchestration out to the module layer.

## Add a flavor only when it differs

For each of the four flavors, create it only if its shape diverges from `X`. If a flavor would have the same fields and tags as `X`, reuse `X` directly, or declare a type alias. Every flavor must earn its place per [abstractions.md](abstractions.md) rule 6 ("Wrappers must add semantics, not just rename").

| Flavor       | Create it when it differs in…                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostableX`  | JSON shape differs from `X` — typically no `Id`, no audit fields, no server-computed fields. Often owns input validation via `Validate()` or a custom `UnmarshalJSON`.                                                            |
| `GettableX`  | Response shape adds server-computed fields that are not persisted — e.g., `GettableAuthDomain` adds `AuthNProviderInfo`, which is resolved at read time.                                                                          |
| `UpdatableX` | Only a strict subset of `PostableX` is replaceable on PUT. If the updatable shape equals `PostableX`, reuse `PostableX`.                                                                                                          |
| `StorableX`  | DB row shape differs from `X` — usually `X` carries nested typed config while `StorableX` carries a flat `Data string` JSON column, plus bun tags, audit mixins, and an `OrgID`. If `X` already has those, skip the flavor.       |

The failure mode this rule exists to prevent: minting all four flavors on reflex for every new resource, even when two or three are structurally identical. Each unnecessary flavor is another type contributors must understand and another conversion that can drift.

## Worked examples

### Channel — core type only

```go
type Channels         = []*Channel
type GettableChannels = []*Channel

type Channel struct {
    bun.BaseModel `bun:"table:notification_channel"`
    types.Identifiable
    types.TimeAuditable
    Name  string `json:"name"  required:"true" bun:"name"`
    Type  string `json:"type"  required:"true" bun:"type"`
    Data  string `json:"data"  required:"true" bun:"data"`
    OrgID string `json:"orgId" required:"true" bun:"org_id"`
}
```

`Channel` is both the domain type and the bun row. `GettableChannels` is a **type alias** because `*Channel` already serializes correctly as a response. There is no `StorableChannel`, `PostableChannel`, or `UpdatableChannel` — those would be identical to `Channel` and so do not exist. Prefer this shape when it works.

### AuthDomain — all four flavors

```go
type AuthDomain struct {
    storableAuthDomain *StorableAuthDomain
    authDomainConfig   *AuthDomainConfig
}

type StorableAuthDomain struct {
    bun.BaseModel `bun:"table:auth_domain"`
    types.Identifiable
    Name  string      `bun:"name"`
    Data  string      `bun:"data"`  // AuthDomainConfig serialized as JSON
    OrgID valuer.UUID `bun:"org_id"`
    types.TimeAuditable
}

type PostableAuthDomain struct {
    Config AuthDomainConfig `json:"config"`
    Name   string           `json:"name"`
}

type UpdateableAuthDomain struct {
    Config AuthDomainConfig `json:"config"` // Name intentionally absent
}

type GettableAuthDomain struct {
    *StorableAuthDomain
    *AuthDomainConfig
    AuthNProviderInfo *AuthNProviderInfo `json:"authNProviderInfo"`
}
```

Each flavor exists for a concrete reason:

- `StorableAuthDomain` stores the typed config as an opaque `Data string` column, so the schema does not need to migrate every time a config field is added.
- `PostableAuthDomain` carries the config as a structured object (not a string) for the request.
- `UpdateableAuthDomain` excludes `Name` because a domain's name cannot change after creation.
- `GettableAuthDomain` adds `AuthNProviderInfo`, which is derived at read time and never persisted.

The core `AuthDomain` holds the two live halves — `storableAuthDomain` and `authDomainConfig` — and owns business methods such as `Update(config)`. Conversions use the `New<Output>From<Input>` form: `NewAuthDomainFromConfig`, `NewAuthDomainFromStorableAuthDomain`, `NewGettableAuthDomainFromAuthDomain`.

## Conventions that tie the flavors together

- **Conversions** use either a `New<Output>From<Input>` constructor — e.g. `NewChannelFromReceiver`, `NewGettableAuthDomainFromAuthDomain` — or a receiver-style `ToY()` method. Both forms coexist in the codebase; use whichever fits the call site.
- **Validation belongs on the core type `X`.** Putting it on `X` means every write path — HTTP create, HTTP update, in-process migration, replay — runs the same checks. `Validate()` on `PostableX` is reserved for checks that are specific to the request shape and do not apply to `X`. `UnmarshalJSON` on `PostableX` is a separate tool that lives there because decoding only happens at the HTTP boundary — `PostableAuthDomain.UnmarshalJSON` rejecting a malformed domain name at decode time is the canonical example.

    ```go
    // Domain invariants: every write path re-runs these.
    func (x *X) Validate() error { ... }

    // Request-shape-only: checks that do not apply once the value is persisted.
    func (p *PostableX) Validate() error { ... }
    ```
- **Type aliases, not wrappers**, when two shapes are identical. `type GettableChannels = []*Channel` is correct because it adds no semantics beyond the underlying type.
- **Serialization tags** follow [handler.md](handler.md): `required:"true"` means the JSON key must be present, `nullable:"true"` is required on any slice or map that may serialize as `null`, and types with a fixed value set must implement `Enum() []any`.

## A note on `UpdatableX` and `PatchableX`

- `UpdatableX` — the body for PUT (full replace) when the shape is a strict subset of `PostableX`. If the updatable shape equals `PostableX`, reuse `PostableX`.
- `PatchableX` — the body for PATCH (partial update); only the fields a client is allowed to patch. For example, `PatchableRole` carries a single `Description` field even though `Role` has many — clients may patch the description but not anything else.

    ```go
    type PatchableRole struct {
        Description string `json:"description"`
    }
    ```

Both are optional. Do not introduce them if `PostableX` already covers the case.

## What to avoid

- **Do not mint a flavor that mirrors the core type.** If `StorableX` would have the same fields as `X`, use `X` directly with `bun.BaseModel` embedded. `Channel` is the canonical example.
- **Do not bolt domain methods onto `StorableX`.** Storage types are data carriers. Domain methods live on `X`.
- **Do not invent new suffixes** (`Creatable`, `Fetchable`, `Savable`). The core type plus `Postable` / `Gettable` / `Updatable` / `Patchable` / `Storable` covers every case that exists today.
- **Spelling — `Updatable`, not `Updateable`.** `Updateable` is a common typo. Prefer the shorter form when introducing new types, and rename any stragglers you come across.
- **Spelling — `Storable`, not `Storeable`.** `Storeable` is a common typo. Prefer the shorter form when introducing new types, and rename any stragglers you come across.

## What should I remember?

- Every domain package defines the core type `X`. Only `X` is mandatory.
- Add `PostableX` / `GettableX` / `UpdatableX` / `StorableX` one at a time, only when the shape actually diverges from `X`.
- Domain logic lives on `X`, not on the flavor types.
- Conversions can be a `New<Output>From<Input>` constructor or a receiver-style `ToY()` method — pick whichever reads best at the call site.
- Use a type alias when two shapes are truly identical.
- `pkg/types/<domain>/` must not import from other `pkg/` packages.

## Further reading

- [abstractions.md](abstractions.md) — when to introduce a new type at all.
- [handler.md](handler.md) — struct tag rules at the HTTP boundary.
- [packages.md](packages.md) — where types live under `pkg/types/`.
- [sql.md](sql.md) — star-schema requirements for `StorableX`.

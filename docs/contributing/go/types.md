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
    storableAuthDomain       *StorableAuthDomain
    storableAuthDomainConfig *StorableAuthDomainConfig
}

type StorableAuthDomain struct {
    bun.BaseModel `bun:"table:auth_domain"`
    types.Identifiable
    Name  string      `bun:"name"`
    Data  string      `bun:"data"`  // StorableAuthDomainConfig serialized as JSON
    OrgID valuer.UUID `bun:"org_id"`
    types.TimeAuditable
}

type PostableAuthDomain struct {
    Name        string           `json:"name" required:"true"`
    Enabled     bool             `json:"enabled"`
    Config      AuthDomainConfig `json:"config" required:"true"`
    RoleMapping *RoleMapping     `json:"roleMapping"`
}

type UpdatableAuthDomain struct {
    Enabled     bool             `json:"enabled"` // Name intentionally absent
    Config      AuthDomainConfig `json:"config" required:"true"`
    RoleMapping *RoleMapping     `json:"roleMapping"`
}

type GettableAuthDomain struct {
    StorableAuthDomain
    Enabled           bool               `json:"enabled"`
    Config            AuthDomainConfig   `json:"config"`
    RoleMapping       *RoleMapping       `json:"roleMapping"`
    AuthNProviderInfo *AuthNProviderInfo `json:"authNProviderInfo"`
}
```

Each flavor exists for a concrete reason:

- `StorableAuthDomain` stores the typed config as an opaque `Data string` column, so the schema does not need to migrate every time a config field is added.
- `PostableAuthDomain` carries the config as a structured object (not a string) for the request. `AuthDomainConfig` is a kind/spec envelope — see the next section.
- `UpdatableAuthDomain` excludes `Name` because a domain's name cannot change after creation.
- `GettableAuthDomain` adds `AuthNProviderInfo`, which is derived at read time and never persisted.

The core `AuthDomain` holds the two live halves — `storableAuthDomain` and `storableAuthDomainConfig` — and owns business methods such as `Update(updatable)`. Conversions use the `New<Output>From<Input>` form: `NewAuthDomainFromPostableAuthDomain`, `NewAuthDomainFromStorableAuthDomain`, `NewGettableAuthDomainFromAuthDomain`.

## Sum types: the kind/spec envelope

When a domain type is a *sum type* — exactly one of several variants, selected by a discriminator — model it as an envelope with a `kind` and a `spec`:

```go
type AuthDomainConfig struct {
    Kind AuthNProvider `json:"kind" required:"true"`
    Spec any           `json:"spec" required:"true"`
}
```

```json
{ "kind": "saml", "spec": { "entityId": "...", "ssoUrl": "...", "certificate": "..." } }
```

`Kind` is a `valuer.String` enum implementing `Enum()`; `Spec` holds exactly one concrete variant type. `RuleThresholdData` and `EvaluationEnvelope` in `pkg/types/ruletypes/` and `AuthDomainConfig` in `pkg/types/authtypes/` are the canonical examples. (`QueryEnvelope` in querybuildertypes uses `type` as the discriminator key for historical reasons; new envelopes use `kind`.)

### The envelope goes at the point of variance, not the resource root

Put the envelope on the field that actually varies. The resource root is almost never a sum type — an auth domain always has a `name`, `enabled`, and `roleMapping` regardless of provider; only its provider configuration varies, so the envelope is the `config` field:

```json
{ "name": "signoz.io", "enabled": true, "config": { "kind": "saml", "spec": { "..." : "..." } }, "roleMapping": null }
```

Hoisting `kind`/`spec` to the root would turn the whole resource into a `oneOf`: every flavor (`PostableX`, `UpdatableX`, `GettableX`) then needs one variant schema per kind, each repeating the common fields; every new common field has to be added to all of them; and generated clients get unions of large objects instead of one small union that narrows on `config.kind`. A root-level `kind` also collides with the resource-model meaning of the word — in the Kubernetes/Perses model, root `kind` answers "what resource is this" (`Dashboard`), never "which flavor of config does it hold".

The other domains already follow this placement:

- **Rules** — plain root; envelopes on the varying fields: `thresholds: {kind, spec}` and `evaluation: {kind, spec}`.
- **Dashboards** — Perses resource model: metadata at the root plus one typed `spec`; the unions sit deep inside, at each panel/query/variable plugin (`{kind, spec}` in `perses_plugin_wrappers.go`).
- **Saved views** — root `{schemaVersion, spec}`, where `spec` is a *versioning* envelope holding one fixed type, not a union; the unions are inside it (`spec.queries: [{type, spec}]`). Same word, different job — a versioned body is not a discriminated union.

### Why this tagging style

Of the union encodings in common use, the envelope is the *adjacently tagged* one — tag and payload side by side — as used by the Kubernetes resource model, Perses plugins, CloudFormation (`Type` + `Properties`), and Grafana provisioning (`type` + `settings`). Variant payloads stay collision-free, and each kind maps to a named wrapper schema that carries the discriminator, which is exactly what OpenAPI generators need. The alternatives lose on those points: *internally tagged* (`{"type": "saml", ...fields flattened}` — Stripe, GitHub webhooks) mixes common and variant fields, admits cross-variant key collisions, and forces every variant schema to redeclare the discriminator; *sibling optional fields* (`{"type": "saml", "samlConfig": {}, "oidcConfig": {}}` — classic Kubernetes `VolumeSource`, and the pre-envelope auth domain) is the anti-pattern the first rule below exists to prevent.

The rules that make the envelope work:

- **Never model variants as sibling fields.** A struct with `SAML *SamlConfig`, `Google *GoogleConfig`, `OIDC *OIDCConfig` next to a discriminator cannot be expressed as an OpenAPI discriminated union, forces nilability checks on every consumer, and silently admits contradictory payloads (kind=saml with a google config). The chosen variant *is* the payload.
- **The envelope owns `UnmarshalJSON`.** Decode `kind` first, then switch on it to decode and validate the matching concrete type into `Spec`. Unknown kinds and missing specs are rejected at the boundary:

    ```go
    func (typ *AuthDomainConfig) UnmarshalJSON(data []byte) error {
        var raw map[string]json.RawMessage
        // ... unmarshal raw, decode raw["kind"] ...
        switch kind {
        case AuthNProviderSAML:
            spec := SamlConfig{}
            if err := json.Unmarshal(raw["spec"], &spec); err != nil {
                return err
            }
            typ.Spec = spec
        // ... one case per kind, default rejects ...
        }
        typ.Kind = kind
        return nil
    }
    ```
- **Consumers type-assert on `Spec`** (`config.Spec.(SamlConfig)`) after switching on `Kind`. If assertion sites multiply, add typed accessors on the envelope (see `EvaluationEnvelope.GetEvaluation()`).
- **OpenAPI needs one unexported variant struct per kind** (`authDomainConfigSAML{Kind; Spec SamlConfig}`), exposed via `JSONSchemaOneOf()` and mapped via `PrepareJSONSchema` with the `x-signoz-discriminator` extension. The schema mechanics are covered in [handler.md](handler.md#oneof-with-a-discriminator).
- **A persisted legacy shape stays in a `StorableX`.** If rows were written before the envelope existed, keep the old JSON shape in a storable type (`StorableAuthDomainConfig` keeps `ssoType` + sibling configs) and convert to/from the envelope at the type boundary — the data layer never changes shape retroactively.

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
- Model sum types as a `{kind, spec}` envelope with a validating `UnmarshalJSON` — never as sibling variant fields next to a discriminator.
- The envelope goes on the field that varies, never at the resource root — common fields stay on the resource, outside the union.
- Domain logic lives on `X`, not on the flavor types.
- Conversions can be a `New<Output>From<Input>` constructor or a receiver-style `ToY()` method — pick whichever reads best at the call site.
- Use a type alias when two shapes are truly identical.
- `pkg/types/<domain>/` must not import from other `pkg/` packages.

## Further reading

- [abstractions.md](abstractions.md) — when to introduce a new type at all.
- [handler.md](handler.md) — struct tag rules at the HTTP boundary.
- [packages.md](packages.md) — where types live under `pkg/types/`.
- [sql.md](sql.md) — star-schema requirements for `StorableX`.

# Types

This guide covers how types are organised, named, constructed, and composed so you can add new ones consistently.

## Where do types live?

Types live in `pkg/types/` and its sub-packages:

```
pkg/types/
├── auditable.go          # TimeAuditable, UserAuditable
├── identity.go           # Identifiable (UUID primary key)
├── user.go               # User, PostableRegisterOrgAndAdmin, UserStore
├── alertmanagertypes/    # Alert manager domain types
│   ├── channel.go
│   ├── receiver.go
│   └── config.go
├── authtypes/            # Auth domain types
└── ruletypes/            # Rule domain types
    └── maintenance.go
```

Follow these rules:

1. **Embeddable building blocks** go in `pkg/types/` directly `Identifiable`, `TimeAuditable`, `UserAuditable`.
2. **Domain-specific types** go in a sub-package named `pkg/types/<domain>types/` (e.g., `alertmanagertypes`, `ruletypes`, `authtypes`).
3. **No domain logic** in type packages. Only data structures, constants, and simple methods. Domain services import from type packages, not the other way around.
4. **Domain services import types, not vice versa.** If a type needs a service, the design is likely wrong and you should restructure so the service operates on the type.

## Type variants

A domain entity often has multiple representations depending on where it appears in the system. We use naming prefixes to distinguish them:

| Prefix | Purpose | Example |
|---|---|---|
| `Postable<Type>` | API request input | `PostableRegisterOrgAndAdmin` |
| `Gettable<Type>` | API response output | `GettablePlannedMaintenance` |
| `Storable<Type>` | Database model (embeds `bun.BaseModel`) | `StorablePlannedMaintenance` |
| Plain `<Type>` | Domain logic type | `User` |

Not every entity needs all four variants. Start with the plain type and add variants only when the API or database representation genuinely differs.

Here is a concrete example from `pkg/types/ruletypes/maintenance.go`:

```go
// Database model embeds bun.BaseModel and composition types
type StorablePlannedMaintenance struct {
    bun.BaseModel `bun:"table:planned_maintenance"`
    types.Identifiable
    types.TimeAuditable
    types.UserAuditable
    Name        string    `bun:"name,type:text,notnull"`
    Description string    `bun:"description,type:text"`
    Schedule    *Schedule `bun:"schedule,type:text,notnull"`
    OrgID       string    `bun:"org_id,type:text"`
}

// API response: flat struct with JSON tags, computed fields like Status
type GettablePlannedMaintenance struct {
    Id          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Schedule    *Schedule `json:"schedule"`
    RuleIDs     []string  `json:"alertIds"`
    CreatedAt   time.Time `json:"createdAt"`
    CreatedBy   string    `json:"createdBy"`
    UpdatedAt   time.Time `json:"updatedAt"`
    UpdatedBy   string    `json:"updatedBy"`
    Status      string    `json:"status"`
    Kind        string    `json:"kind"`
}
```

When the API shape exactly matches the domain type, use a type alias instead of duplicating fields:

```go
// From pkg/types/user.go
type GettableUser = User
```

## Composition via embedding

`pkg/types/` provides small, reusable structs that you embed into your domain types:

```go
// pkg/types/identity.go
type Identifiable struct {
    ID valuer.UUID `json:"id" bun:"id,pk,type:text"`
}

// pkg/types/auditable.go
type TimeAuditable struct {
    CreatedAt time.Time `bun:"created_at" json:"createdAt"`
    UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
}

type UserAuditable struct {
    CreatedBy string `bun:"created_by,type:text" json:"createdBy"`
    UpdatedBy string `bun:"updated_by,type:text" json:"updatedBy"`
}
```

Compose them in a database model:

```go
type StorablePlannedMaintenance struct {
    bun.BaseModel `bun:"table:planned_maintenance"`
    types.Identifiable    // adds ID (UUID primary key)
    types.TimeAuditable   // adds CreatedAt, UpdatedAt
    types.UserAuditable   // adds CreatedBy, UpdatedBy
    Name        string    `bun:"name,type:text,notnull"`
    Description string    `bun:"description,type:text"`
}
```

See [SQL](sql.md) for full database patterns including migrations and queries.

## Constructors

Constructors validate inputs and return a ready-to-use value:

```go
// New<Type> validates and returns a pointer + error
func NewUser(displayName string, email valuer.Email, role Role, orgID valuer.UUID) (*User, error) {
    if email.IsZero() {
        return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
    }
    if role == "" {
        return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "role is required")
    }
    if orgID.IsZero() {
        return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
    }

    return &User{
        Identifiable:  Identifiable{ID: valuer.GenerateUUID()},
        DisplayName:   displayName,
        Email:         email,
        Role:          role,
        OrgID:         orgID,
        TimeAuditable: TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
    }, nil
}
```

Follow these conventions:

- **`New<Type>(args) (*Type, error)`**: validates inputs, returns an error on failure. Use this in production code.
- **Validation at construction**: check required fields, format constraints, and invariants in the constructor. Callers should not need to validate after construction.
- **Generate IDs internally**: constructors call `valuer.GenerateUUID()` callers do not pass IDs in.
- **Set timestamps internally**: constructors set `CreatedAt` and `UpdatedAt` to `time.Now()`.

## Typed domain values (`pkg/valuer/`)

The `pkg/valuer` package provides typed wrappers for common domain values. These types carry validation, normalization, and consistent serialization (JSON, SQL, text) that raw Go primitives do not.

| Type | Wraps | Invariant |
|---|---|---|
| `valuer.UUID` | `google/uuid.UUID` | Valid UUIDv7, generated via `GenerateUUID()` |
| `valuer.Email` | `string` | Valid email format, lowercased and trimmed |
| `valuer.String` | `string` | Lowercased and trimmed |
| `valuer.TextDuration` | `time.Duration` | Valid duration, text-serializable |

### When to use a valuer type

Use a valuer type instead of a raw primitive when the value represents a domain concept with any of:

- **Enums**: All enums in the codebase must be backed by `valuer.String`. Do not use raw `string` constants or `iota`-based `int` enums. A struct embedding `valuer.String` with predefined variables gives you normalization, serialization, and an `Enum()` method for OpenAPI schema generation in one place.
- **Validation**: emails must match a format, UUIDs must be parseable, durations must be valid.
- **Normalization**: `valuer.String` lowercases and trims input, so comparisons are consistent throughout the system.
- **Serialization boundary**: the value is stored in a database, sent over the wire, or bound from an HTTP parameter. Valuer types implement `Scan`, `Value`, `MarshalJSON`, `UnmarshalJSON`, and `UnmarshalParam` consistently.

```go
// Wrong: raw string constant with no validation or normalization.
const SignalTraces = "traces"

// Right: valuer-backed type that normalizes and serializes consistently.
type Signal struct {
    valuer.String
}

var SignalTraces = Signal{valuer.NewString("traces")}
```

Only primitive domain types that serve as shared infrastructure belong in `pkg/valuer`. If you need a new base type (like `Email` or `TextDuration`) that multiple packages will embed for validation and serialization, add it there. Domain-specific types that build on top of a valuer (like `Signal` embedding `valuer.String`) belong in their own domain package, not in `pkg/valuer`.

### The `Valuer` interface

Every valuer type implements the `Valuer` interface, which gives you serialization for free:

```go
type Valuer interface {
    IsZero() bool                        // check for zero value
    StringValue() string                 // raw string representation
    fmt.Stringer                         // String() for printing
    json.Marshaler / json.Unmarshaler    // JSON
    sql.Scanner / driver.Valuer          // database
    encoding.TextMarshaler / TextUnmarshaler  // text
    ginbinding.BindUnmarshaler           // HTTP query/path params
}
```

Use them in struct fields:

```go
type User struct {
    Identifiable
    Email valuer.Email `bun:"email" json:"email"`
    OrgID valuer.UUID  `bun:"org_id" json:"orgId"`
}
```

## Wrappers must add semantics, not just rename

A wrapper type is justified when it adds meaning, validation, or invariants that the underlying type does not carry. It is not justified when it merely renames fields or reorganizes the same data into a different shape.

```go
// Justified: adds validation that the underlying string does not carry.
type OrgID struct{ value string }
func NewOrgID(s string) (OrgID, error) { /* validates format */ }

// Not justified: renames fields with no new invariant or behavior.
type UserInfo struct {
    Name  string // same as source.Name
    Email string // same as source.Email
}
```

Ask: what does the wrapper guarantee that the underlying type does not? If the answer is nothing, use the underlying type directly.

## When a new type IS warranted

A new type earns its place when it meets **at least one** of these criteria:

- **Serialization boundary**: It must be persisted, sent over the wire, or written to config. The source type is unsuitable (unexported fields, function pointers, cycles).
- **Invariant enforcement**: The constructor or methods enforce constraints that raw data does not carry (e.g., non-empty, validated format, bounded range).
- **Multiple distinct consumers**: Three or more call sites use the type in meaningfully different ways. The type is the shared vocabulary between them.
- **Dependency firewall**: The type lives in a lightweight package so that consumers avoid importing a heavy dependency.

See [Abstractions](abstractions.md) for the full set of rules on when abstractions are and aren't justified.

## Store interfaces

Each domain type package defines a store interface for persistence. The store interface lives alongside the types it operates on:

```go
// From pkg/types/ruletypes/maintenance.go
type MaintenanceStore interface {
    CreatePlannedMaintenance(context.Context, GettablePlannedMaintenance) (valuer.UUID, error)
    DeletePlannedMaintenance(context.Context, valuer.UUID) error
    GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*GettablePlannedMaintenance, error)
    EditPlannedMaintenance(context.Context, GettablePlannedMaintenance, valuer.UUID) error
    GetAllPlannedMaintenance(context.Context, string) ([]*GettablePlannedMaintenance, error)
}
```

Conventions:

- Name the interface `<Domain>Store` (e.g., `UserStore`, `MaintenanceStore`).
- Accept `context.Context` as the first parameter.
- Use typed values (`valuer.UUID`, `valuer.Email`) instead of raw strings for identifiers.
- Implementations go in separate packages (e.g., `sqlstore/`), see [SQL](sql.md) for details.

## What should I remember?

- Shared types live in `pkg/types/`, domain types in `pkg/types/<domain>types/`.
- No domain logic in type packages only data structures, constants, and simple methods.
- Use `Storable`, `Gettable`, `Postable` prefixes when API or database representation differs from the domain type.
- Embed `Identifiable`, `TimeAuditable`, and `UserAuditable` for standard fields instead of repeating them.
- Constructors (`New<Type>`) validate, generate IDs, and set timestamps.
- Use `pkg/valuer/` types instead of raw strings for domain identifiers like UUIDs and emails.
- Store interfaces live alongside the types they persist and use `context.Context` as the first parameter.

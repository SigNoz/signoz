# Packages

All shared Go code in SigNoz lives under `pkg/`. Each package represents a distinct domain concept and exposes a clear public interface. This guide covers the conventions for creating, naming, and organising packages so the codebase stays consistent as it grows.

## How should I name a package?

Use short, lowercase, single-word names. No underscores or camelCase (`querier`, `cache`, `authz`, not `query_builder` or `dataStore`).

Names must be **domain-specific**. A package name should tell you what problem domain it deals with, not what data structure it wraps. Prefer `alertmanager` over `manager`, `licensing` over `checker`.

Avoid generic names like `util`, `helpers`, `common`, `misc`, or `base`. If you can't name it, the code probably belongs in an existing package.

## When should I create a new package?

Create a new package when:

- The functionality represents a **distinct domain concept** (e.g., `authz`, `licensing`, `cache`).
- Two or more other packages would import it; it serves as shared infrastructure.
- The code has a clear public interface that can stand on its own.

Do **not** create a new package when:

- There is already a package that covers the same domain. Extend the existing package instead.
- The code is only used in one place. Keep it local to the caller.
- You are splitting purely for file size. Use multiple files within the same package instead.

## How should I lay out a package?

A typical package looks like:

```
pkg/cache/
├── cache.go            # Public interface + exported types
├── config.go           # Configuration types if needed
├── memorycache/        # Implementation sub-package
├── rediscache/         # Another implementation
└── cachetest/          # Test helpers for consumers
```

Follow these rules:

1. **Interface-first file**: The file matching the package name (e.g., `cache.go` in `pkg/cache/`) should define the public interface and core exported types. Keep implementation details out of this file.

2. **One responsibility per file**: Name files after what they contain (`config.go`, `handler.go`, `service.go`), not after the package name. If a package merges two concerns, prefix files to group them (e.g., `memory_store.go`, `redis_store.go` in a storage package).

3. **Sub-packages for implementations**: When a package defines an interface with multiple implementations, put each implementation in its own sub-package (`memorycache/`, `rediscache/`). This keeps the parent package import-free of implementation dependencies.

4. **Test helpers in `{pkg}test/`**: If consumers need test mocks or builders, put them in a `{pkg}test/` sub-package (e.g., `cachetest/`, `sqlstoretest/`). This avoids polluting the main package with test-only code.

5. **Test files stay alongside source**: Unit tests go in `_test.go` files next to the code they test, in the same package.

## How should I name symbols?

### Exported symbols

- **Interfaces**: For single-method interfaces, follow the standard `-er` suffix convention (`Reader`, `Writer`, `Closer`). For multi-method interfaces, use clear nouns (`Cache`, `Store`, `Provider`).
- **Constructors**: `New<Type>(...)` (e.g., `NewMemoryCache()`).
- **Avoid stutter**: Since callers qualify with the package name, don't repeat it. Write `cache.Cache`, not `cache.CacheInterface`. Write `authz.FromRole`, not `authz.AuthzFromRole`.

### Unexported symbols

- Struct receivers: one or two characters (`c`, `f`, `br`).
- Helper functions: descriptive lowercase names (`parseToken`, `buildQuery`).

### Constants

- Use `PascalCase` for exported constants.
- When merging files from different origins into one package, watch out for **name collisions** across files. Prefix to disambiguate when two types share a natural name.

## How should I organise imports?

Group imports in three blocks separated by blank lines:

```go
import (
    // 1. Standard library
    "fmt"
    "net/http"

    // 2. External dependencies
    "github.com/gorilla/mux"

    // 3. Internal
    "github.com/SigNoz/signoz/pkg/errors"
    "github.com/SigNoz/signoz/pkg/types"
)
```

Never introduce circular imports. If package A needs package B and B needs A, extract the shared types into a third package (often under `pkg/types/`).

## Where do shared types go?

Most types belong in `pkg/types/` under a domain-specific sub-package (e.g., `pkg/types/ruletypes`, `pkg/types/authtypes`).

Do not put domain logic in `pkg/types/`. Only data structures, constants, and simple methods.

## How do I merge or move packages?

When two packages are tightly coupled (one imports the other's constants, they cover the same domain), merge them:

1. Pick a domain-specific name for the combined package.
2. Prefix files to preserve origin (e.g., `memory_store.go`, `redis_store.go`).
3. Resolve symbol conflicts explicitly; rename with a prefix rather than silently shadowing.
4. Update all consumers in a single change.
5. Delete the old packages. Do not leave behind re-export shims.
6. Verify with `go build ./...`, `go test ./<new-pkg>/...`, and `go vet ./...`.

## When should I add documentation?

Add a `doc.go` with a package-level comment for any package that is non-trivial or has multiple consumers. Keep it to 1–3 sentences:

```go
// Package cache provides a caching interface with pluggable backends
// for in-memory and Redis-based storage.
package cache
```

## What should I remember?

- Package names are domain-specific and lowercase. Never generic names like `util` or `common`.
- The file matching the package name (e.g., `cache.go`) defines the public interface. Implementation details go elsewhere.
- Never introduce circular imports. Extract shared types into `pkg/types/` when needed.
- Watch for symbol name collisions when merging packages, prefix to disambiguate.
- Put test helpers in a `{pkg}test/` sub-package, not in the main package.
- Before submitting, verify with `go build ./...`, `go test ./<your-pkg>/...`, and `go vet ./...`.
- Update all consumers when you rename or move symbols.

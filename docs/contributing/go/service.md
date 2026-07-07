# Service

A service is a component with a managed lifecycle: it starts, runs for the lifetime of the application, and stops gracefully.

Services are distinct from [providers](provider.md). A provider adapts an external dependency behind an interface. A service has a managed lifecycle that is tied to the lifetime of the application.

## When do you need a service?

You need a service when your component needs to do work that outlives a single method call:

- **Periodic work**: polling an external system, garbage-collecting expired data, syncing state on an interval.
- **Graceful shutdown**: holding resources (connections, caches, buffers) that must be flushed or closed before the process exits.
- **Blocking on readiness**: waiting for an external dependency to become available before the application can proceed.

If your component only responds to calls and holds no state that requires cleanup, it is a provider, not a service. If it does both (responds to calls *and* needs a lifecycle), embed `factory.Service` in the provider interface; see [How to create a service](#how-to-create-a-service).

## The interface

The `factory.Service` interface in `pkg/factory/service.go` defines two methods:

```go
type Service interface {
    // Starts a service. It should block and should not return until the service is stopped or it fails.
    Start(context.Context) error
    // Stops a service.
    Stop(context.Context) error
}
```

`Start` **must block**. It should not return until the service is stopped (returning `nil`) or something goes wrong (returning an error). If `Start` returns an error, the entire application shuts down.

`Stop` should cause `Start` to unblock and return. It must be safe to call from a different goroutine than the one running `Start`.

## Shutdown coordination

Every service uses a `stopC chan struct{}` to coordinate shutdown:

- **Constructor**: `stopC: make(chan struct{})`
- **Start**: blocks on `<-stopC` (or uses it in a `select` loop)
- **Stop**: `close(stopC)` to unblock `Start`

This is the standard pattern. Do not use `context.WithCancel` or other mechanisms for service-level shutdown coordination. See the examples in the next section.

## Service shapes

Two shapes recur across the codebase (these are not exhaustive, if a new shape is needed, bring it up for discussion before going ahead with the implementation), implemented by convention rather than base classes.

### Idle service

The service does work during startup or shutdown but has nothing to do while running. `Start` blocks on `<-stopC`. `Stop` closes `stopC` and optionally does cleanup.

The JWT tokenizer (`pkg/tokenizer/jwttokenizer/provider.go`) is a good example. It validates and creates tokens on demand via method calls, but has no periodic work to do. It still needs the service lifecycle so the registry can manage its lifetime:

```go
// pkg/tokenizer/jwttokenizer/provider.go

func (provider *provider) Start(ctx context.Context) error {
    <-provider.stopC
    return nil
}

func (provider *provider) Stop(ctx context.Context) error {
    close(provider.stopC)
    return nil
}
```

The instrumentation SDK (`pkg/instrumentation/sdk.go`) is idle while running but does real cleanup in `Stop` shutting down its OpenTelemetry tracer and meter providers:

```go
// pkg/instrumentation/sdk.go

func (i *SDK) Start(ctx context.Context) error {
    <-i.startCh
    return nil
}

func (i *SDK) Stop(ctx context.Context) error {
    close(i.startCh)
    return errors.Join(
        i.sdk.Shutdown(ctx),
        i.meterProviderShutdownFunc(ctx),
    )
}
```

### Scheduled service

The service runs an operation repeatedly on a fixed interval. `Start` runs a ticker loop with a `select` on `stopC` and the ticker channel.

The opaque tokenizer (`pkg/tokenizer/opaquetokenizer/provider.go`) garbage-collects expired tokens and flushes cached last-observed-at timestamps to the database on a configurable interval:

```go
// pkg/tokenizer/opaquetokenizer/provider.go

func (provider *provider) Start(ctx context.Context) error {
    ticker := time.NewTicker(provider.config.Opaque.GC.Interval)
    defer ticker.Stop()

    for {
        select {
        case <-provider.stopC:
            return nil
        case <-ticker.C:
            orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
            if err != nil {
                provider.settings.Logger().ErrorContext(ctx, "failed to get orgs data", "error", err)
                continue
            }

            for _, org := range orgs {
                if err := provider.gc(ctx, org); err != nil {
                    provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err, "org_id", org.ID)
                }

                if err := provider.flushLastObservedAt(ctx, org); err != nil {
                    provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err, "org_id", org.ID)
                }
            }
        }
    }
}
```

Its `Stop` does a final gc and flush before returning, so no data is lost on shutdown:

```go
// pkg/tokenizer/opaquetokenizer/provider.go

func (provider *provider) Stop(ctx context.Context) error {
    close(provider.stopC)

    orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
    if err != nil {
        return err
    }

    for _, org := range orgs {
        if err := provider.gc(ctx, org); err != nil {
            provider.settings.Logger().ErrorContext(ctx, "failed to garbage collect tokens", "error", err, "org_id", org.ID)
        }

        if err := provider.flushLastObservedAt(ctx, org); err != nil {
            provider.settings.Logger().ErrorContext(ctx, "failed to flush tokens", "error", err, "org_id", org.ID)
        }
    }

    return nil
}
```

The key points:

- In the loop, `select` on `stopC` and the ticker. Errors in iterations are logged but do not cause the service to return (which would shut down the application).
- Only return an error from `Start` if the failure is unrecoverable.
- Use `Stop` to flush or drain any in-memory state before the process exits.

## How to create a service

There are two cases: a standalone service and a provider that is also a service.

### Standalone service

A standalone service only has the `factory.Service` lifecycle i.e it does not serve as a dependency for other packages. The user reconciliation service is an example.

1. Define the service interface in your package. Embed `factory.Service`:

    ```go
    // pkg/modules/user/service.go
    package user

    type Service interface {
        factory.Service
    }
    ```

2. Create the implementation in an `impl` sub-package. Use an unexported struct with an exported constructor that returns the interface:

    ```go
    // pkg/modules/user/impluser/service.go
    package impluser

    type service struct {
        settings factory.ScopedProviderSettings
        // ... dependencies ...
        stopC    chan struct{}
    }

    func NewService(
        providerSettings factory.ProviderSettings,
        // ... dependencies ...
    ) user.Service {
        return &service{
            settings: factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/pkg/modules/user"),
            // ... dependencies ...
            stopC:    make(chan struct{}),
        }
    }

    func (s *service) Start(ctx context.Context) error { ... }
    func (s *service) Stop(ctx context.Context) error { ... }
    ```

### Provider that is also a service

Many providers need a managed lifecycle: they poll, sync, or garbage-collect in the background. In this case, embed `factory.Service` in the provider interface. The implementation satisfies both the provider methods and `Start`/`Stop`.

```go
// pkg/tokenizer/tokenizer.go
package tokenizer

type Tokenizer interface {
    factory.Service
    CreateToken(context.Context, *authtypes.Identity, map[string]string) (*authtypes.Token, error)
    GetIdentity(context.Context, string) (*authtypes.Identity, error)
    // ... other methods ...
}
```

The implementation (e.g. `pkg/tokenizer/opaquetokenizer/provider.go`) implements `Start`, `Stop`, and all the provider methods on the same struct. See the [provider guide](provider.md) for how to set up the factory, config, and constructor. The `stopC` channel and `Start`/`Stop` methods follow the same patterns described above.

## How to wire it up

Wiring happens in `pkg/signoz/signoz.go`.

### 1. Instantiate the service

For a standalone service, call the constructor directly:

```go
userService := impluser.NewService(providerSettings, store, module, orgGetter, authz, config.User.Root)
```

For a provider that is also a service, use `factory.NewProviderFromNamedMap` as described in the [provider guide](provider.md). The returned value already implements `factory.Service`.

### 2. Register in the registry

Wrap the service with `factory.NewNamedService` and pass it to `factory.NewRegistry`:

```go
registry, err := factory.NewRegistry(
    instrumentation.Logger(),
    // ... other services ...
    factory.NewNamedService(factory.MustNewName("user"), userService),
)
```

The name must be unique across all services. The registry handles the rest:

- **Start**: launches all services concurrently in goroutines.
- **Wait**: blocks until a service returns an error, the context is cancelled, or a SIGINT/SIGTERM is received. Any service error triggers application shutdown.
- **Stop**: stops all services concurrently, collects errors via `errors.Join`.

You do not call `Start` or `Stop` on individual services. The registry does it.

## What should I remember?

- A service has a managed lifecycle: `Start` blocks, `Stop` unblocks it.
- Use `stopC chan struct{}` for shutdown coordination. `close(stopC)` in `Stop`, `<-stopC` in `Start`.
- Service shapes: idle (block on `stopC`) and scheduled (ticker loop with `select`).
- Unexported struct, exported `NewService` constructor returning the interface.
- First constructor parameter is `factory.ProviderSettings`. Create scoped settings with `factory.NewScopedProviderSettings`.
- Register in `factory.Registry` with `factory.NewNamedService`. The registry starts and stops everything.
- Only return an error from `Start` if the failure is unrecoverable. Log and continue for transient errors in polling loops.

## Further reading

- [Google Guava - ServiceExplained](https://github.com/google/guava/wiki/ServiceExplained) - the service lifecycle pattern takes inspiration from this
- [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) - Worth studying for its approach to building composable components

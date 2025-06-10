# Provider

SigNoz is built on the provider pattern, a design approach where code is organized into providers that handle specific application responsibilities. Providers act as adapter components that integrate with external services and deliver required functionality to the application.

> 💡 **Note**: Coming from a DDD background? Providers are similar (not exactly the same) to adapter/infrastructure services.

## How to create a new provider?

To create a new provider, create a directory in the `pkg/` directory named after your provider. The provider package consists of four key components:

- **Interface** (`pkg/<name>/<name>.go`): Defines the provider's interface. Other packages should import this interface to use the provider.
- **Config** (`pkg/<name>/config.go`): Contains provider configuration, implementing the `factory.Config` interface from [factory/config.go](/pkg/factory/config.go).
- **Implementation** (`pkg/<name>/<implname><name>/provider.go`): Contains the provider implementation, including a `NewProvider` function that returns a `factory.Provider` interface from [factory/provider.go](/pkg/factory/provider.go).
- **Mock** (`pkg/<name>/<name>test.go`): Provides mocks for the provider, typically used by dependent packages for unit testing.

For example, the [prometheus](/pkg/prometheus) provider delivers a prometheus engine to the application:

- `pkg/prometheus/prometheus.go` - Interface definition
- `pkg/prometheus/config.go` - Configuration
- `pkg/prometheus/clickhouseprometheus/provider.go` - Clickhouse-powered implementation
- `pkg/prometheus/prometheustest/provider.go` - Mock implementation

## How to wire it up?

The `pkg/signoz` package contains the inversion of control container responsible for wiring providers. It handles instantiation, configuration, and assembly of providers based on configuration metadata.

> 💡 **Note**: Coming from a Java background? Providers are similar to Spring beans.

Wiring up a provider involves three steps:

1. Wiring up the configuration
Add your config from `pkg/<name>/config.go` to the `pkg/signoz/config.Config` struct and in new factories:

```go
type Config struct {
    ...
	MyProvider myprovider.Config `mapstructure:"myprovider"`
    ...
}

func NewConfig(ctx context.Context, resolverConfig config.ResolverConfig, ....) (Config, error) {
    ...
	configFactories := []factory.ConfigFactory{
        myprovider.NewConfigFactory(),
	}
    ...
}
```

2. Wiring up the provider
Add available provider implementations in `pkg/signoz/provider.go`:

```go
func NewMyProviderFactories() factory.NamedMap[factory.ProviderFactory[myprovider.MyProvider, myprovider.Config]] {
	return factory.MustNewNamedMap(
        myproviderone.NewFactory(),
        myprovidertwo.NewFactory(),
	)
}
```

3. Instantiate the provider by adding it to the `SigNoz` struct in `pkg/signoz/signoz.go`:

```go
type SigNoz struct {
    ...
    MyProvider myprovider.MyProvider
    ...
}

func New(...) (*SigNoz, error) {
    ...
    myprovider, err := myproviderone.New(ctx, settings, config.MyProvider, "one/two")
    if err != nil {
        return nil, err
    }
    ...
}
```

## How to use it?

To use a provider, import its interface. For example, to use the prometheus provider, import `pkg/prometheus/prometheus.go`:

```go
import "github.com/SigNoz/signoz/pkg/prometheus/prometheus"

func CreateSomething(ctx context.Context, prometheus prometheus.Prometheus) {
    ...
    prometheus.DoSomething()
    ...
}
```

## Why do we need this?

Like any dependency injection framework, providers decouple the codebase from implementation details. This is especially valuable in SigNoz's large codebase, where we need to swap implementations without changing dependent code. The provider pattern offers several benefits apart from the obvious one of decoupling:

- Configuration is **defined with each provider and centralized in one place**, making it easier to understand and manage through various methods (environment variables, config files, etc.)
- Provider mocking is **straightforward for unit testing**, with a consistent pattern for locating mocks
- **Multiple implementations** of the same provider are **supported**, as demonstrated by our sqlstore provider

## What should I remember?

- Use the provider pattern wherever applicable.
- Always create a provider **irrespective of the number of implementations**. This makes it easier to add new implementations in the future.

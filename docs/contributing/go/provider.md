# Provider

SigNoz is built on the provider pattern. This is a pattern where the code is organized into providers, each of which is responsible for a specific part of the application. Think of providers as core application components/adapter components/infrastructure components that are responsible for integrating with external services. Most frameworks make a distinction between the app layer and the infrastructure layer. We don't do that and instead have everything exposed as providers at the top level in `pkg/` directory.

## How to create a new provider?

To create a new provider, you need to create a new directory in the `pkg/` directory. The directory name should be the name of the provider. The provider package can be broken down into 3 parts:

- Interface: `pkg/<name>/<name>.go` - This file contains the interface of the provider. Dependent packages should import this interface to use the provider.
- Config: `pkg/<name>/config.go` - This file contains the configuration of the provider. This needs to implement the `factory.Config` interface which can be found at [factory/config.go](/pkg/factory/config.go).
- Implementation: `pkg/<name>/<implname><name>/provider.go` - This file contains the implementation of the provider. It needs to implement a `NewProvider` function (and of course the interface itself) that returns a `factory.Provider` interface which can be found at [factory/provider.go](/pkg/factory/provider.go).
- Test/Mock: `pkg/<name>/<name>test.go` - This file contains the mocks for the provider. This is typically used by dependent packages to get a mock of the provider for unit testing.

For instance, [prometheus](/pkg/prometheus) is a provider that is responsible for giving a prometheus engine to the application:

- `pkg/prometheus/prometheus.go` - This file contains the interface of prometheus.
- `pkg/prometheus/config.go` - This file contains the configuration of prometheus.
- `pkg/prometheus/clickhouseprometheus/provider.go` - This file contains the implementation of the provider powered by clickhouse.
- `pkg/prometheus/prometheustest/provider.go` - This file contains the mocks for prometheus.

## How to wire it up?

The package `pkg/signoz` contains the inversion of control container that is responsible for wiring up the providers. It is responsible for instantiating, configuring, and assembling the aforementioned providers. The container gets its instructions on what objects to instantiate, configure, and assemble by reading configuration metadata.

> 💡 **Note**: Coming from a Java background? Providers are similar to Spring beans.

Wiring up a provider can be broken down into 2 steps:

1. Wiring up the configuration
Add the config defined at `pkg/<name>/config.go` to the `pkg/signoz/config.Config` struct and in new factories

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
Add the available provider implementations in `pkg/signoz/provider.go`:

```go
func NewMyProviderFactories() factory.NamedMap[factory.ProviderFactory[myprovider.MyProvider, myprovider.Config]] {
	return factory.MustNewNamedMap(
		myproviderone.NewFactory(),
        myprovidertwo.NewFactory(),
	)
}
```

Now instantiate the provider in `pkg/signoz/signoz.go` and add it as part of the SigNoz struct:

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

To use a provider, you need to import the interface of the provider. For instance, to use the prometheus provider, you need to import the `pkg/prometheus/prometheus.go` file.

```go
import "github.com/SigNoz/signoz/pkg/prometheus/prometheus"

func CreateSomething(ctx context.Context, prometheus prometheus.Prometheus) {
    ...
    prometheus.DoSomething()
    ...
}
```

## Why do we need this?
As with any dependency injection framework, providers are a way to decouple the codebase from the underlying implementation details. This is particularly useful in a large codebase like SigNoz where we have a lot of dependencies and we want to be able to swap out the implementation details without having to change the codebase. Particularly for SigNoz, we also get the following benefits:

- Config is defined with each provider and wired up in a single place. This makes it easier to understand the configuration of the application and to use different methods to supply the configuration to the application. For instance, we support env based and file based configuration.

- We can easily mock the provider for unit testing. There is a single consistent pattern for finding the mocks for a provider.

- We can have multiple implementations of the same provider. For instance, we have multiple implementations of the sqlstore provider.

> 💡 **Note**: Even if it is strongly felt that a particular provider will only have one implementation, it is still a good idea to create a provider interface and a provider implementation. This makes it easier to add new implementations in the future.
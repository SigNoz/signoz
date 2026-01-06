# Flagger

Flagger is SigNoz's feature flagging system built on top of the [OpenFeature](https://openfeature.dev/) standard. It provides a unified interface for evaluating feature flags across the application, allowing features to be enabled, disabled, or configured dynamically without code changes.

> 💡 **Note**: OpenFeature is a CNCF project that provides a vendor-agnostic feature flagging API, making it easy to switch providers without changing application code.

## How does it work?

Flagger consists of three main components:

1. **Registry** (`pkg/flagger/registry.go`) - Contains all available feature flags with their metadata and default values
2. **Flagger** (`pkg/flagger/flagger.go`) - The consumer-facing interface for evaluating feature flags
3. **Providers** (`pkg/flagger/<provider>flagger/`) - Implementations that supply feature flag values (e.g., `configflagger` for config-based flags)

The evaluation flow works as follows:

1. The caller requests a feature flag value via the `Flagger` interface
2. Flagger checks the registry to validate the flag exists and get its default value
3. Each registered provider is queried for an override value
4. If a provider returns a value different from the default, that value is returned
5. Otherwise, the default value from the registry is returned

## How to add a new feature flag?

### 1. Register the flag in the registry

Add your feature flag definition in `pkg/flagger/registry.go`:

```go
var (
    // Export the feature name for use in evaluations
    FeatureMyNewFeature = featuretypes.MustNewName("my_new_feature")
)

func MustNewRegistry() featuretypes.Registry {
    registry, err := featuretypes.NewRegistry(
        // ...existing features...
        &featuretypes.Feature{
            Name:           FeatureMyNewFeature,
            Kind:           featuretypes.KindBoolean, // or KindString, KindFloat, KindInt, KindObject
            Stage:          featuretypes.StageStable, // or StageAlpha, StageBeta
            Description:    "Controls whether my new feature is enabled",
            DefaultVariant: featuretypes.MustNewName("disabled"),
            Variants:       featuretypes.NewBooleanVariants(),
        },
    )
    // ...
}
```

> 💡 **Note**: Feature names must match the regex `^[a-z_]+$` (lowercase letters and underscores only).

### 2. Configure the feature flag value (optional)

To override the default value, add an entry in your configuration file:

```yaml
flagger:
  config:
    boolean:
      my_new_feature: true
```

Supported configuration types:

| Type | Config Key | Go Type |
|------|------------|---------|
| Boolean | `boolean` | `bool` |
| String | `string` | `string` |
| Float | `float` | `float64` |
| Integer | `integer` | `int64` |
| Object | `object` | `any` |

## How to evaluate a feature flag?

Use the `Flagger` interface to evaluate feature flags. The interface provides typed methods for each value type:

```go
import (
    "github.com/SigNoz/signoz/pkg/flagger"
    "github.com/SigNoz/signoz/pkg/types/featuretypes"
)

func DoSomething(ctx context.Context, flagger flagger.Flagger) error {
    // Create an evaluation context (typically with org ID)
    evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
    
    // Evaluate with error handling
    enabled, err := flagger.Boolean(ctx, flagger.FeatureMyNewFeature, evalCtx)
    if err != nil {
        return err
    }
    
    if enabled {
        // Feature is enabled
    }
    
    return nil
}
```

### Empty variants 

For cases where you want to use a default value on error (and log the error), use the `*OrEmpty` methods:

```go
func DoSomething(ctx context.Context, flagger flagger.Flagger) {
    evalCtx := featuretypes.NewFlaggerEvaluationContext(orgID)
    
    // Returns false on error and logs the error
    if flagger.BooleanOrEmpty(ctx, flagger.FeatureMyNewFeature, evalCtx) {
        // Feature is enabled
    }
}
```

### Available evaluation methods

| Method | Return Type | Empty Variant Default |
|--------|-------------|---------------------|
| `Boolean()` | `(bool, error)` | `false` |
| `String()` | `(string, error)` | `""` |
| `Float()` | `(float64, error)` | `0.0` |
| `Int()` | `(int64, error)` | `0` |
| `Object()` | `(any, error)` | `struct{}{}` |

## What should I remember?

- Always define feature flags in the registry (`pkg/flagger/registry.go`) before using them
- Use descriptive feature names that clearly indicate what the flag controls
- Prefer `*OrEmpty` methods for non-critical features to avoid error handling overhead
- Export feature name variables (e.g., `FeatureMyNewFeature`) for type-safe usage across packages
- Consider the feature's lifecycle stage (`Alpha`, `Beta`, `Stable`) when defining it
- Providers are evaluated in order; the first non-default value wins

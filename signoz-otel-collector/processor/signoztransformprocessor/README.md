# Signoz Transform Processor

A transform processor with some extra ottl functions.
See [available custom OTTL functions](./ottlfunctions)

This processor is a copy of the official [transformprocessor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor)  
We need a copy since [adding custom functions requires working with the internal package](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/CONTRIBUTING.md#new-functions) right now.

This processor is only for supporting SigNoz generated configuration and not intended for direct use in otel collector config by users.
We expect to remove this package and register our custom functions directly with the official transformprocessor as public registration methods become available over time.
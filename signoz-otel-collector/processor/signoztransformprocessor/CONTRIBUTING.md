# Contributing

This guide is specific to the transform processor.  All guidelines in [Collector Contrib's CONTRIBUTING.MD](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/CONTRIBUTING.md) must also be followed.

## New Functions

If a new function is not specific to the transform processor it should be added to the [OpenTelemetry Transformation Language](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl) instead.

All new functions must be added via a new file.  Function files must start with `func_`.  Functions that are usable in multiple pipelines must be placed in `internal/common`.  Functions that are specific to a pipeline must be placed in `internal/<pipeline>`.

New functions must update the appropriate registry.  For common functions, update the registry in `internal/common/functions.go`.  For pipeline-specific functions, update the registry in `internal/<pipeline>/functions.go`

Unit tests must be added for all new functions.  Unit test files must start with `func_` and end in `_test`.  Unit tests must be placed in the same directory as the function.  Functions that are not specific to a pipeline should be tested independently of any specific pipeline. Functions that are specific to a pipeline should be tests against that pipeline.

All new functions should have integration tests added to any usable pipeline's `processing_test.go` tests.  The purpose of these tests is not to test the function's logic, but its ability to be used within a specific pipeline.  

## New Values

When adding new values to the grammar you must update the [OpenTelemetry Transformation Language](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/CONTRIBUTING.md)

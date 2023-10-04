# Versioned Config for Signal Pre-processing Features implemented via Otel Collectors (Agents)

Signal Ingestion (write path) for SigNoz is fulfilled by otel-collector instances.
So, any features that require pre-processing of signals before storage in clickhouse,
have to be implemented by running otel-collector instances with appropriate config.

This package provides core mechanisms for maintaining versioned settings for such
Signal Pre-processing features and provides their combined translated otel collector config
for deployment to otel collectors.

Specific implementations of Signal Pre-processing Features like [logs parsing pipelines](../app/logparsingpipeline/)
are implemented in their own independent packages on top of the APIs provided by this package.

TODO(Raj): Elaborate on this

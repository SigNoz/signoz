### Configure otel collector

#### Create collector config file

Save the collector config for monitoring postgres in a file named `postgres-collector-config.yaml`

Use the following configuration for SigNoz cloud. See further below for configuration for self hosted SigNoz 

```yaml
receivers:
  postgresql:
    # The endpoint of the postgresql server. Whether using TCP or Unix sockets, this value should be host:port. If transport is set to unix, the endpoint will internally be translated from host:port to /host.s.PGSQL.port
    endpoint: ${env:POSTGRESQL_ENDPOINT}
    # The frequency at which to collect metrics from the Postgres instance.
    collection_interval: 60s
    # The username used to access the postgres instance
    username: monitoring
    # The password used to access the postgres instance
    password: ${env:POSTGRESQL_PASSWORD}
    # The list of databases for which the receiver will attempt to collect statistics. If an empty list is provided, the receiver will attempt to collect statistics for all non-template databases
    databases: []
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `unix`
    # transport: tcp
    tls:
      # set to false if SSL is enabled on the server
      insecure: true
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/postgres.crt
    #   key_file: /etc/ssl/certs/postgres.key
    metrics:
      postgresql.database.locks:
        enabled: true
      postgresql.deadlocks:
        enabled: true
      postgresql.sequential_scans:
        enabled: true

processors:
  # enriches the data with additional host information
  # see https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor#resource-detection-processor
  resourcedetection/system:
    # add additional detectors if needed
    detectors: ["system"]
    system:
      hostname_sources: ["os"]

exporters:
  # export to SigNoz cloud
  otlp/postgres:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: ${env:OTLP_DESTINATION_TLS_INSECURE}
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

service:
  pipelines:
    metrics/postgresql:
      receivers: [postgresql]
      # note: remove this processor if the collector host is not running on the same host as the postgres instance
      processors: [resourcedetection/system]
      exporters: [otlp/postgres]
```

Use the following config if using self-hosted SigNoz. See the config above if using SigNoz cloud
```yaml
receivers:
  postgresql:
    # The endpoint of the postgresql server. Whether using TCP or Unix sockets, this value should be host:port. If transport is set to unix, the endpoint will internally be translated from host:port to /host.s.PGSQL.port
    endpoint: ${env:POSTGRESQL_ENDPOINT}
    # The frequency at which to collect metrics from the Postgres instance.
    collection_interval: 60s
    # The username used to access the postgres instance
    username: monitoring
    # The password used to access the postgres instance
    password: ${env:POSTGRESQL_PASSWORD}
    # The list of databases for which the receiver will attempt to collect statistics. If an empty list is provided, the receiver will attempt to collect statistics for all non-template databases
    databases: []
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `unix`
    # transport: tcp
    tls:
      # set to false if SSL is enabled on the server
      insecure: true
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/postgres.crt
    #   key_file: /etc/ssl/certs/postgres.key
    metrics:
      postgresql.database.locks:
        enabled: true
      postgresql.deadlocks:
        enabled: true
      postgresql.sequential_scans:
        enabled: true

processors:
  # enriches the data with additional host information
  # see https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor#resource-detection-processor
  resourcedetection/system:
    # add additional detectors if needed
    detectors: ["system"]
    system:
      hostname_sources: ["os"]

exporters:
  otlp/postgres:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: ${env:OTLP_DESTINATION_TLS_INSECURE}

service:
  pipelines:
    metrics/postgresql:
      receivers: [postgresql]
      # note: remove this processor if the collector host is not running on the same host as the postgres instance
      processors: [resourcedetection/system]
      exporters: [otlp/postgres]
```


#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# password for postgres monitoring user"
export POSTGRESQL_PASSWORD="password"

# postgres endpoint reachable from the otel collector"
export POSTGRESQL_ENDPOINT="host:port"

# A reachable OTLP destination for collected metrics. Eg: localhost:4317 or signoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# Set to true if using an endpoint without TLS
export OTLP_DESTINATION_TLS_INSECURE="false"

# your signoz ingestion key if using SigNoz cloud
export SIGNOZ_INGESTION_KEY="key"

```

#### Use collector config file

Make the `postgres-collector-config.yaml` file available to your otel collector and add the flag `--config postgres-collector-config.yaml` to the command for running your otel collector.    
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

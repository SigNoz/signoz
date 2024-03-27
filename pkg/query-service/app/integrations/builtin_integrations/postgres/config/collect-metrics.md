### Collect Postgres Metrics

You can configure Postgres metrics collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting postgres metrics in a file named `postgres-metrics-collection-config.yaml`

```yaml
receivers:
  postgresql:
    # The endpoint of the postgresql server. Whether using TCP or Unix sockets, this value should be host:port. If transport is set to unix, the endpoint will internally be translated from host:port to /host.s.PGSQL.port
    endpoint: ${env:POSTGRESQL_ENDPOINT}
    # The frequency at which to collect metrics from the Postgres instance.
    collection_interval: 60s
    # The username used to access the postgres instance
    username: ${env:POSTGRESQL_USERNAME}
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
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/postgres:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

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

# password for Postgres monitoring user"
export POSTGRESQL_USERNAME="monitoring"

# password for Postgres monitoring user"
export POSTGRESQL_PASSWORD="<PASSWORD>"

# Postgres endpoint reachable from the otel collector"
export POSTGRESQL_ENDPOINT="host:port"


# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config postgres-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

### Configure otel collector

#### Save collector config file

Save the following collector config in a file named `postgres-collector-config.yaml`

```bash
receivers:
  postgresql:
    # The endpoint of the postgresql server. Whether using TCP or Unix sockets, this value should be host:port. If transport is set to unix, the endpoint will internally be translated from host:port to /host.s.PGSQL.port
    endpoint: "localhost:5432"
    # The frequency at which to collect metrics from the Postgres instance.
    collection_interval: 60s
    # The username used to access the postgres instance
    username: monitoring
    # The password used to access the postgres instance
    password: ${env:POSTGRESQL_PASSWORD}
    # The list of databases for which the receiver will attempt to collect statistics. If an empty list is provided, the receiver will attempt to collect statistics for all non-template databases
    databases: []
    # List of databases which will be excluded when collecting statistics.
    exclude_databases: []
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
  # export to local collector
  otlp/local:
    endpoint: "localhost:4317"
    tls:
      insecure: true
  # export to SigNoz cloud
  otlp/signoz:
    endpoint: "ingest.{region}.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "<SIGNOZ_INGESTION_KEY>"

service:
  pipelines:
    metrics/postgresql:
      receivers: [postgresql]
      # note: remove this processor if the collector host is not running on the same host as the postgres instance
      processors: [resourcedetection/system]
      exporters: [otlp/local]
```

#### Use collector config file

Run your collector with the added flag `--config postgres-collector-config.yaml`

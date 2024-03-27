### Collect Redis Metrics

You can configure Redis metrics collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting Redis metrics in a file named `redis-metrics-collection-config.yaml`


```yaml
receivers:
  redis:
    # The hostname and port of the Redis instance, separated by a colon.
    endpoint: ${env:REDIS_ENDPOINT}
    # The frequency at which to collect metrics from the Redis instance.
    collection_interval: 60s
    # # The password used to access the Redis instance; must match the password specified in the requirepass server configuration option.
    password: ${env:REDIS_PASSWORD}
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `Unix`
    # transport: tcp
    # tls:
    #   insecure: false
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/redis.crt
    #   key_file: /etc/ssl/certs/redis.key
    metrics:
      redis.maxmemory:
        enabled: true
      redis.cmd.latency:
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
  otlp/redis:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/redis:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    metrics/redis:
      receivers: [redis]
      # note: remove this processor if the collector host is not running on the same host as the redis instance
      processors: [resourcedetection/system]
      exporters: [otlp/redis]
```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# redis endpoint reachable from the otel collector"
export REDIS_ENDPOINT="localhost:6379"

# password used to access the Redis instance.
# must match the password specified in the requirepass server configuration option.
# can be left empty if the redis server is not configured to require a password.
export REDIS_PASSWORD=""

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config redis-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

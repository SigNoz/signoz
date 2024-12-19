### Collect MongoDB Metrics

You can configure MongoDB metrics collection by providing the required collector config to your collector.

#### Create collector config file

Save the following config for collecting mongodb metrics in a file named `mongodb-metrics-collection-config.yaml`

```yaml
receivers:
  mongodb:
    # - For standalone MongoDB deployments this is the hostname and port of the mongod instance
    # - For replica sets specify the hostnames and ports of the mongod instances that are in the replica set configuration. If the replica_set field is specified, nodes will be autodiscovered.
    # - For a sharded MongoDB deployment, please specify a list of the mongos hosts.
    hosts:
      - endpoint: ${env:MONGODB_ENDPOINT}
    # If authentication is required, the user can with clusterMonitor permissions can be provided here
    username: ${env:MONGODB_USERNAME}
    # If authentication is required, the password can be provided here.
    password: ${env:MONGODB_PASSWORD}
    collection_interval: 60s
    # If TLS is enabled, the following fields can be used to configure the connection
    tls:
      insecure: true
      insecure_skip_verify: true
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/mongodb.crt
    #   key_file: /etc/ssl/certs/mongodb.key
    metrics:
      mongodb.lock.acquire.count:
        enabled: true
      mongodb.lock.acquire.time:
        enabled: true
      mongodb.lock.acquire.wait_count:
        enabled: true
      mongodb.lock.deadlock.count:
        enabled: true
      mongodb.operation.latency.time:
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
  otlp/mongodb:
    endpoint: "${env:OTLP_DESTINATION_ENDPOINT}"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "${env:SIGNOZ_INGESTION_KEY}"

  # export to local collector
  # otlp/mongodb:
  #   endpoint: "localhost:4317"
  #   tls:
  #     insecure: true

service:
  pipelines:
    metrics/mongodb:
      receivers: [mongodb]
      # note: remove this processor if the collector host is not running on the same host as the mongo instance
      processors: [resourcedetection/system]
      exporters: [otlp/mongodb]

```

#### Set Environment Variables

Set the following environment variables in your otel-collector environment:

```bash

# MongoDB endpoint reachable from the otel collector"
export MONGODB_ENDPOINT="host:port"

# password for MongoDB monitoring user"
export MONGODB_USERNAME="monitoring"

# password for MongoDB monitoring user"
export MONGODB_PASSWORD="<PASSWORD>"

# region specific SigNoz cloud ingestion endpoint
export OTLP_DESTINATION_ENDPOINT="ingest.us.signoz.cloud:443"

# your SigNoz ingestion key
export SIGNOZ_INGESTION_KEY="signoz-ingestion-key"

```

#### Use collector config file

Make the collector config file available to your otel collector and use it by adding the following flag to the command for running your collector  
```bash
--config mongodb-metrics-collection-config.yaml
```  
Note: the collector can use multiple config files, specified by multiple occurrences of the --config flag.

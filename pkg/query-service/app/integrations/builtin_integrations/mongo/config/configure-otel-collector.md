### Configure otel collector

#### Save collector config file

Save the following collector config in a file named `mongo-collector-config.yaml`

```
receivers:
  mongodb:
    # - For standalone MongoDB deployments this is the hostname and port of the mongod instance
    # - For replica sets specify the hostnames and ports of the mongod instances that are in the replica set configuration. If the replica_set field is specified, nodes will be autodiscovered.
    # - For a sharded MongoDB deployment, please specify a list of the mongos hosts.
    hosts:
      - endpoint: 127.0.0.1:27017
    # If authentication is required, the user can with clusterMonitor permissions can be provided here
    username: monitoring
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
    metrics/mongodb:
      receivers: [mongodb]
      # note: remove this processor if the collector host is not running on the same host as the mongo instance
      processors: [resourcedetection/system]
      exporters: [otlp/local]

```

#### Use collector config file

Run your collector with the added flag `--config mongo-collector-config.yaml`

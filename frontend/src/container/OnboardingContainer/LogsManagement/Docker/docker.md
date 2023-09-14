## Collect Syslogs in SigNoz cloud

### Setup Otel Collector as agent

- Add `config.yaml`
  ```yaml {22-26}
  receivers:
   filelog:
    include: [/tmp/python.log]
    start_at: beginning
    operators:
     - type: json_parser
       timestamp:
        parse_from: attributes.time
        layout: '%Y-%m-%d,%H:%M:%S %z'
     - type: move
       from: attributes.message
       to: body
     - type: remove
       field: attributes.time
  processors:
   batch:
    send_batch_size: 10000
    send_batch_max_size: 11000
    timeout: 10s
  exporters:
   otlp:
    endpoint: 'ingest.{region}.signoz.cloud:443'
    tls:
     insecure: false
    headers:
     'signoz-access-token': '<SIGNOZ_INGESTION_KEY>'
  service:
   pipelines:
    logs:
     receivers: [filelog]
     processors: [batch]
     exporters: [otlp/log]
  ```

````
Depending on the choice of your region for SigNoz cloud, the otlp endpoint will vary according to this table.

| Region | Endpoint                   |
| ------ | -------------------------- |
| US     | ingest.us.signoz.cloud:443 |
| IN     | ingest.in.signoz.cloud:443 |
| EU     | ingest.eu.signoz.cloud:443 |

* We will start our otel-collector container.
```bash
docker run -d --name signoz-host-otel-collector -p 2255:2255 --user root -v $(pwd)/config.yaml:/etc/otel/config.yaml signoz/signoz-otel-collector:0.79.0
````

### Run logspout to collect docker container logs and send it to local otel collector.

Logspout helps in collecting Docker logs by connecting to Docker socket.

- Run logspout

  ```bash
  docker run --net=host --rm --name="logspout" \
          --volume=/var/run/docker.sock:/var/run/docker.sock \
          gliderlabs/logspout \
          syslog+tcp://<host>:2255
  ```

  For finding the right host for your SigNoz cluster please follow the guide [here](../install/troubleshooting.md#signoz-otel-collector-address-grid).

- If there are no errors your logs will be exported and will be visible on the SigNoz UI.

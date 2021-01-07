# Flattener Processor

Flattener Processor is a spream processing application that reads spans from topic `otlp_spans` and writes to topic `flattened_spans`. It is written in **Golang**. Flattener Processor is responsible to convert the incoming spans into a flat model that can be ingested to Apache Druid. 


#### Configuration
Flattener Processor needs below `env` variables to run:
```
  KAFKA_BROKER: signoz-kafka:9092
  KAFKA_INPUT_TOPIC: otlp_spans
  KAFKA_OUTPUT_TOPIC: flattened_spans
```
The above values are the default ones used by SigNoz and are kept at `deploy/kubernetes/platform/signoz-charts/flattener-processor/values.yaml`

#### Build and Run locally
```console
cd pkg/processors/flattener
go build -o build/flattener-processor main.go
KAFKA_BROKER=xxxx KAFKA_INPUT_TOPIC=otlp_spans KAFKA_OUTPUT_TOPIC=flattened_spans build/flattener-processor
```

#### Docker Images
The docker images of flattener-processor is available at https://hub.docker.com/r/signoz/flattener-processor
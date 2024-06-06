## Prerequisite

- An AKS cluster
- `kubectl` installed and logged in to the AKS cluster
- Helm

&nbsp;


## Quick Start

To start sending Logs to SigNoz from your AKS cluster:

```bash

helm repo add signoz <https://charts.signoz.io>
helm install -n signoz  --create-namespace kubelet-otel signoz/k8s-infra \\
--set signozApiKey={{SIGNOZ_INGESTION_KEY}} --set otelCollectorEndpoint="ingest.{{REGION}}.signoz.cloud:443" --set otelInsecure=false

```

This will start sending your logs to SigNoz.
### Install otel-collectors in your Kubernetes infra

Add the SigNoz Helm Chart repository
```bash
helm repo add signoz https://charts.signoz.io
```

If the chart is already present, update the chart to the latest using:
```bash
helm repo update
```

Install the Kubernetes Infrastructure chart provided by SigNoz
```bash
helm install my-release signoz/k8s-infra  \
--set otelCollectorEndpoint=ingest.{region}.signoz.cloud:443 \
--set otelInsecure=false \
--set signozApiKey=<SIGNOZ_INGESTION_KEY> \
--set global.clusterName=<CLUSTER_NAME>
```

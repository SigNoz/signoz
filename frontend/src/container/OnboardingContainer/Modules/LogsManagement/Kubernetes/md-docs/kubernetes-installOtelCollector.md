## Install otel-collector in your Kubernetes infra
&nbsp;

Add the SigNoz Helm Chart repository
```bash
helm repo add signoz https://charts.signoz.io
```
&nbsp;

If the chart is already present, update the chart to the latest using:
```bash
helm repo update
```
&nbsp;

Install the Kubernetes Infrastructure chart provided by SigNoz
```bash
helm install my-release signoz/k8s-infra  \
--set otelCollectorEndpoint=ingest.{{REGION}}.signoz.cloud:443 \
--set otelInsecure=false \
--set signozApiKey={{SIGNOZ_INGESTION_KEY}} \
--set global.clusterName=<CLUSTER_NAME>
```
- Replace `<CLUSTER_NAME>` with the name of the Kubernetes cluster or a unique identifier of the cluster.

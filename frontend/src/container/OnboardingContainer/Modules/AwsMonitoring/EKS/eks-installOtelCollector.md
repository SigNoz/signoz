### Install otel-collector in your Kubernetes infra

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

For generic Kubernetes clusters, you can create *override-values.yaml* with the following configuration:

```yaml
global:
  cloud: aws
  clusterName: <CLUSTER_NAME>
  deploymentEnvironment: <DEPLOYMENT_ENVIRONMENT>
otelCollectorEndpoint: ingest.{region}.signoz.cloud:443
otelInsecure: false
signozApiKey: <SIGNOZ_INGESTION_KEY>
presets:
  otlpExporter:
    enabled: true
  loggingExporter:
    enabled: false
  resourceDetection:
    detectors:
      - eks
      - system
```

- Replace `<CLUSTER_NAME>` with the name of the Kubernetes cluster or a unique identifier of the cluster.
- Replace `<DEPLOYMENT_ENVIRONMENT>` with the deployment environment of your application. Example: **"staging"**, **"production"**, etc.

&nbsp;

To install the k8s-infra chart with the above configuration, run the following command:

```bash
helm install my-release signoz/k8s-infra -f override-values.yaml
```

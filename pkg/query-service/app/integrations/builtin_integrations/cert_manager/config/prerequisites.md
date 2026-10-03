## Before You Begin

To monitor cert-manager with SigNoz, make sure the following pieces are already in place.

- **A running cert-manager deployment**
  The integration expects the standard controller metrics endpoint to be available inside your cluster.

- **A Prometheus-compatible scrape path**
  Expose cert-manager metrics through a `ServiceMonitor`, `PodMonitor`, or equivalent scrape config so the OpenTelemetry Collector can ingest them.

- **An OTEL Collector that can reach your cluster metrics**
  If needed, install an OTEL Collector first. The collector must be able to scrape the cert-manager metrics endpoint and forward metrics to SigNoz.

- **Kubernetes metadata enrichment**
  It is strongly recommended to add `k8sattributes` so dashboard filters such as namespace remain useful in multi-tenant clusters.

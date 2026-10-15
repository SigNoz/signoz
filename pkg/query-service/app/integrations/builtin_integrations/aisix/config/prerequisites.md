# Prerequisites

Before setting up the AISIX AI Gateway integration in SigNoz, ensure:

1. **AISIX AI Gateway** (v1.2.0 or newer) is running with its dedicated `/metrics` endpoint enabled.
2. **SigNoz Cloud** or **SigNoz v0.135.0+** with an OpenTelemetry Collector instance configured to scrape Prometheus endpoints.
3. Network accessibility between the OpenTelemetry Collector and the AISIX AI Gateway `/metrics` HTTP port.

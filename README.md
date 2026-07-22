<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-assets/signoz-hero-dark.png" width="900">
    <source media="(prefers-color-scheme: light)" srcset="docs/readme-assets/signoz-hero-light.png" width="900">
    <img alt="SigNoz - Observability on Your Terms, Powered by Open Standards." src="docs/readme-assets/signoz-hero-light.png" width="900">
  </picture>
</p>

<p align="center">
  <a href="README.zh-cn.md">中文</a> ·
  <a href="README.de-de.md">Deutsch</a> ·
  <a href="README.pt-br.md">Português</a>
</p>

<p align="center">
  <a href="https://github.com/SigNoz/signoz/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/SigNoz/signoz"></a>
  <a href="https://github.com/SigNoz/signoz/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/SigNoz/signoz?label=release"></a>
  <a href="https://signoz.io/slack"><img alt="Slack community" src="https://img.shields.io/badge/slack-community-4A154B?logo=slack&logoColor=white"></a>
  <a href="https://www.linkedin.com/company/signozio/"><img alt="LinkedIn" src="https://img.shields.io/badge/linkedin-SigNoz-0A66C2?logo=linkedin&logoColor=white"></a>
  <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"><img alt="Tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"></a>
</p>

SigNoz is an open-source observability platform built on OpenTelemetry. We’re building an enterprise-grade alternative to fragmented monitoring stacks, with logs, metrics, traces, alerts, and dashboards in one place.

### Choose how to run SigNoz

#### SigNoz Cloud (Recommended)

Fully managed SigNoz with a 30-day free trial, no credit card required, usage-based pricing that starts at $49, and regional data hosting.

[**Start free →**](https://signoz.io/teams/)

#### Enterprise

Enterprise Cloud, BYOC, or Enterprise Self-Hosted with compliance, support, custom retention, RBAC, ingestion controls, data residency, and region selection.

[**Explore Enterprise →**](https://signoz.io/enterprise/)

#### Community

Free open-source SigNoz that runs in your own infrastructure. Deploy with Docker, Kubernetes, or Linux and keep full control of your data plane.

[**Install SigNoz →**](https://signoz.io/docs/install/self-host/)

### What can you monitor?

SigNoz helps teams debug production issues faster by connecting logs, metrics, traces, alerts, dashboards, exceptions, and agent-native workflows in one place.

#### APM Overview

Monitor service latency, error rate, throughput, Apdex, top endpoints, database calls, and external calls.

<p align="center">
  <img alt="SigNoz APM dashboard showing latency, throughput, Apdex, and key operations" src="docs/readme-assets/monitor/apm.png" width="900">
</p>

Learn more: [APM documentation](https://signoz.io/docs/instrumentation/overview/)

#### Log Management

Ingest, search, aggregate, and correlate logs with traces and metrics using a visual query builder.

<p align="center">
  <img alt="SigNoz logs explorer with filters, frequency chart, and log lines" src="docs/readme-assets/monitor/log-management.svg" width="900">
</p>

Learn more: [Log management documentation](https://signoz.io/docs/logs-management/overview/)

#### Metrics and Dashboards

Build dashboards for application, infrastructure, and custom metrics using Query Builder, PromQL, or ClickHouse SQL.

<p align="center">
  <img alt="SigNoz host metrics dashboard with system load and network charts" src="docs/readme-assets/monitor/metrics.png" width="900">
</p>

Learn more: [Metrics documentation](https://signoz.io/docs/metrics-management/overview/)

#### Infrastructure Monitoring

Monitor Kubernetes clusters, pods, nodes, workloads, and host-level CPU, memory, disk, network, logs, and traces.

<p align="center">
  <img alt="SigNoz Kubernetes infrastructure dashboard with pod and node metrics" src="docs/readme-assets/monitor/infrastructure.png" width="900">
</p>

Learn more: [Infrastructure monitoring documentation](https://signoz.io/docs/infrastructure-monitoring/overview/)

#### LLM and AI Observability

Trace LLM apps, RAG pipelines, prompts, tool calls, tokens, latency, and costs alongside application and infrastructure telemetry.

<p align="center">
  <img alt="SigNoz LLM observability dashboard for traces, token usage, latency, and costs" src="docs/readme-assets/monitor/llm.png" width="900">
</p>

Learn more: [LLM observability documentation](https://signoz.io/docs/llm-observability/)

#### Agent-Native Observability and MCP

Use the SigNoz MCP server to bring telemetry into coding agents, or use Noz inside SigNoz to investigate incidents, tune alerts, and build dashboards with production context. [Noz](https://signoz.io/docs/ai/noz/) is available only on SigNoz Cloud.

<p align="center">
  <img alt="SigNoz Noz interface alongside MCP-powered agent workflow" src="docs/readme-assets/monitor/agent-native.png" width="900">
</p>

Learn more: [SigNoz MCP server docs](https://signoz.io/docs/ai/signoz-mcp-server/) · [Agent skills docs](https://signoz.io/docs/ai/agent-skills/#install-the-plugin)

#### Distributed Tracing

Follow requests across services with flamegraphs, waterfalls, span events, filters, and trace analytics.

<p align="center">
  <img alt="SigNoz distributed trace view with flamegraph and waterfall spans" src="docs/readme-assets/monitor/distributed-tracing.png" width="900">
</p>

Learn more: [Distributed tracing documentation](https://signoz.io/docs/instrumentation/)

#### Trace Funnels

Create funnels from traces to understand request-flow drop-offs, failed transitions, and systemic workflow issues.

<p align="center">
  <img alt="SigNoz trace funnels showing request-flow drop-offs and failed transitions" src="docs/readme-assets/monitor/trace-funnels.png" width="900">
</p>

Learn more: [Trace funnels documentation](https://signoz.io/docs/trace-funnels/overview/)

Also monitor: [**exceptions**](https://signoz.io/docs/userguide/exceptions/), [**alerts**](https://signoz.io/docs/alerts/), [**external APIs**](https://signoz.io/docs/external-api-monitoring/overview/), and [**integrations**](https://signoz.io/docs/integrations/integrations-list/) for OpenTelemetry, Prometheus, Kubernetes, cloud providers, language SDKs, application frameworks, databases, and LLM tools.

### Why teams use SigNoz

1. **OpenTelemetry-native**<br>
   Instrument once with open standards and keep ownership of your telemetry.
2. **Correlated signals**<br>
   Move from service charts to traces, logs, infra metrics, and exceptions without switching tools.
3. **Single columnar database**<br>
   Built for high-cardinality, high-volume observability workloads.
4. **Predictable pricing**<br>
   No per-host pricing, no user-seat pricing, and no special pricing for custom metrics.
5. **Enterprise ready**<br>
   SOC 2 Type II and HIPAA compliance, RBAC, ingestion controls, custom retention, support, BYOC, and self-hosting.

### Getting started

#### Start on Cloud

Create a managed SigNoz workspace and get your first dashboard without running observability infrastructure.

[**Start free on SigNoz Cloud**](https://signoz.io/teams/)

#### Self-host SigNoz

Run SigNoz in your own infrastructure with Foundry, Docker, Kubernetes, or Linux.

[**Foundry**](https://github.com/SigNoz/foundry) · [**Docker**](https://signoz.io/docs/install/docker/) · [**Kubernetes**](https://signoz.io/docs/install/kubernetes/) · [**Linux**](https://signoz.io/docs/install/linux/)

#### Send data

Instrument applications and infrastructure with OpenTelemetry, Prometheus, language SDKs, and integrations.

[**Instrumentation**](https://signoz.io/docs/instrumentation/) · [**Integrations**](https://signoz.io/docs/integrations/integrations-list/)

### Comparisons to familiar tools

SigNoz is often adopted by teams moving from a stack of single-purpose tools or commercial platforms with unpredictable pricing.

**Prometheus**<br>
Good if you just need metrics. SigNoz keeps metrics, logs, traces, dashboards, and alerts together so teams can debug with correlated context.

**Jaeger**<br>
Jaeger only does distributed tracing. SigNoz adds metrics, logs, trace analytics, dashboards, alerts, exceptions, and trace-to-log workflows.

**Elastic**<br>
SigNoz uses columnar database for efficient observability analytics and high-cardinality log workloads, with 50% lower resource requirement compared to Elastic during ingestion. Check the [detailed study](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark).

**Loki**<br>
In the linked benchmark, SigNoz indexed all keys in the test setup, while Loki hit max stream errors when more labels were added. Check the [detailed study](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark).

## Contributing

We ❤️ contributions big or small. Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started with making contributions to SigNoz.

Not sure how to get started? **Just ping us on `#contributing` in our [slack community](https://signoz.io/slack).**

As always, thanks to our amazing contributors!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img alt="SigNoz contributors" src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>

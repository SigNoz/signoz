<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-assets/signoz-hero-dark.png" width="900">
    <source media="(prefers-color-scheme: light)" srcset="docs/readme-assets/signoz-hero-light.png" width="900">
    <img alt="SigNoz - 按你的方式运行的可观测性，由开放标准驱动。" src="docs/readme-assets/signoz-hero-light.png" width="900">
  </picture>
</p>

<p align="center">
  <a href="README.md">English</a> ·
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

SigNoz 是一个基于 OpenTelemetry 构建的开源可观测性平台。我们正在构建一个企业级替代方案，用来替代分散的监控工具栈，把日志、指标、链路追踪、告警和仪表盘放在同一个地方。

### 选择 SigNoz 的运行方式

#### SigNoz Cloud（推荐）

完全托管的 SigNoz，提供 30 天免费试用，无需信用卡，按用量计费，起价为 49 美元，并支持区域化数据托管。

[**免费开始 →**](https://signoz.io/teams/)

#### 企业版

Enterprise Cloud、BYOC 或 Enterprise Self-Hosted，提供合规、支持、自定义保留期、RBAC、摄取控制、数据驻留和区域选择。

[**了解企业版 →**](https://signoz.io/enterprise/)

#### 社区版

免费的开源 SigNoz，可运行在你自己的基础设施中。使用 Docker、Kubernetes 或 Linux 部署，并完全掌控你的数据平面。

[**安装 SigNoz →**](https://signoz.io/docs/install/self-host/)

### 你可以监控什么？

SigNoz 将日志、指标、链路追踪、告警、仪表盘、异常和面向 Agent 的工作流连接在一起，帮助团队更快地调试生产问题。

#### APM 概览

监控服务延迟、错误率、吞吐量、Apdex、核心端点、数据库调用和外部调用。

<p align="center">
  <img alt="SigNoz APM 仪表盘，展示延迟、吞吐量、Apdex 和关键操作" src="docs/readme-assets/monitor/apm.png" width="900">
</p>

了解更多：[APM 文档](https://signoz.io/docs/instrumentation/overview/)

#### 日志管理

摄取、搜索、聚合日志，并通过可视化查询构建器将日志与链路追踪和指标关联起来。

<p align="center">
  <img alt="SigNoz 日志浏览器，包含过滤器、频率图和日志行" src="docs/readme-assets/monitor/log-management.svg" width="900">
</p>

了解更多：[日志管理文档](https://signoz.io/docs/logs-management/overview/)

#### 指标和仪表盘

使用 Query Builder、PromQL 或 ClickHouse SQL 为应用、基础设施和自定义指标构建仪表盘。

<p align="center">
  <img alt="SigNoz 主机指标仪表盘，展示系统负载和网络图表" src="docs/readme-assets/monitor/metrics.png" width="900">
</p>

了解更多：[指标文档](https://signoz.io/docs/metrics-management/overview/)

#### 基础设施监控

监控 Kubernetes 集群、Pod、节点、工作负载，以及主机级 CPU、内存、磁盘、网络、日志和链路追踪。

<p align="center">
  <img alt="SigNoz Kubernetes 基础设施仪表盘，展示 Pod 和节点指标" src="docs/readme-assets/monitor/infrastructure.png" width="900">
</p>

了解更多：[基础设施监控文档](https://signoz.io/docs/infrastructure-monitoring/overview/)

#### LLM 和 AI 可观测性

追踪 LLM 应用、RAG 流水线、Prompt、工具调用、Token、延迟和成本，并与应用和基础设施遥测数据放在一起分析。

<p align="center">
  <img alt="SigNoz LLM 可观测性仪表盘，展示链路追踪、Token 使用、延迟和成本" src="docs/readme-assets/monitor/llm.png" width="900">
</p>

了解更多：[LLM 可观测性文档](https://signoz.io/docs/llm-observability/)

#### Agent 原生可观测性和 MCP

使用 SigNoz MCP server 将遥测数据带入编程 Agent，或在 SigNoz 中使用 Noz，基于生产上下文调查事故、优化告警并构建仪表盘。[Noz](https://signoz.io/docs/ai/noz/) 仅适用于 SigNoz Cloud。

<p align="center">
  <img alt="SigNoz Noz 界面与基于 MCP 的 Agent 工作流" src="docs/readme-assets/monitor/agent-native.png" width="900">
</p>

了解更多：[SigNoz MCP server 文档](https://signoz.io/docs/ai/signoz-mcp-server/) · [Agent skills 文档](https://signoz.io/docs/ai/agent-skills/#install-the-plugin)

#### 分布式链路追踪

通过火焰图、瀑布图、Span 事件、过滤器和 Trace 分析，跟踪请求在各个服务之间的流转。

<p align="center">
  <img alt="SigNoz 分布式链路追踪视图，包含火焰图和瀑布图 Span" src="docs/readme-assets/monitor/distributed-tracing.png" width="900">
</p>

了解更多：[分布式链路追踪文档](https://signoz.io/docs/instrumentation/)

#### Trace Funnels

基于链路追踪创建漏斗，用于理解请求流中的掉点、失败转换和系统性工作流问题。

<p align="center">
  <img alt="SigNoz Trace Funnels，展示请求流掉点和失败转换" src="docs/readme-assets/monitor/trace-funnels.png" width="900">
</p>

了解更多：[Trace Funnels 文档](https://signoz.io/docs/trace-funnels/overview/)

你还可以监控：[**异常**](https://signoz.io/docs/userguide/exceptions/)、[**告警**](https://signoz.io/docs/alerts/)、[**外部 API**](https://signoz.io/docs/external-api-monitoring/overview/)，以及面向 OpenTelemetry、Prometheus、Kubernetes、云服务商、语言 SDK、应用框架、数据库和 LLM 工具的[**集成**](https://signoz.io/docs/integrations/integrations-list/)。

### 为什么团队选择 SigNoz

1. **OpenTelemetry 原生**<br>
   用开放标准完成一次接入，并保持对遥测数据的所有权。
2. **信号关联**<br>
   在服务图表、链路追踪、日志、基础设施指标和异常之间切换时，不需要更换工具。
3. **单一列式数据库**<br>
   为高基数、高吞吐量的可观测性工作负载而构建。
4. **可预测的定价**<br>
   不按主机收费，不按用户席位收费，也不对自定义指标设置特殊价格。
5. **企业就绪**<br>
   SOC 2 Type II 和 HIPAA 合规、RBAC、摄取控制、自定义保留期、支持、BYOC 和自托管。

### 快速开始

#### 从 Cloud 开始

创建一个托管的 SigNoz 工作区，无需运行可观测性基础设施，即可获得第一个仪表盘。

[**免费开始使用 SigNoz Cloud**](https://signoz.io/teams/)

#### 自托管 SigNoz

在你自己的基础设施中通过 Foundry、Docker、Kubernetes 或 Linux 运行 SigNoz。

[**Foundry**](https://github.com/SigNoz/foundry) · [**Docker**](https://signoz.io/docs/install/docker/) · [**Kubernetes**](https://signoz.io/docs/install/kubernetes/) · [**Linux**](https://signoz.io/docs/install/linux/)

#### 发送数据

使用 OpenTelemetry、Prometheus、语言 SDK 和集成来接入应用与基础设施。

[**接入文档**](https://signoz.io/docs/instrumentation/) · [**集成列表**](https://signoz.io/docs/integrations/integrations-list/)

### 与常见工具的对比

许多团队在从单一用途工具或价格不可预测的商业平台迁移时，会选择 SigNoz。

**Prometheus**<br>
如果你只需要指标，Prometheus 很合适。SigNoz 将指标、日志、链路追踪、仪表盘和告警放在一起，让团队可以通过关联上下文进行调试。

**Jaeger**<br>
Jaeger 只做分布式链路追踪。SigNoz 增加了指标、日志、Trace 分析、仪表盘、告警、异常和 Trace 到日志的工作流。

**Elastic**<br>
SigNoz 使用列式数据库来高效处理可观测性分析和高基数日志工作负载。在摄取阶段，相比 Elastic 可降低 50% 的资源需求。查看[详细评测](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)。

**Loki**<br>
在链接的评测中，SigNoz 在测试设置中索引了所有键，而 Loki 在增加更多标签时遇到了 max stream 错误。查看[详细评测](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)。

## 贡献

无论贡献大小，我们都非常欢迎。请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，开始为 SigNoz 做贡献。

不确定如何开始？**可以在我们的 [Slack 社区](https://signoz.io/slack)中通过 `#contributing` 联系我们。**

一如既往，感谢所有出色的贡献者！

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img alt="SigNoz 贡献者" src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>

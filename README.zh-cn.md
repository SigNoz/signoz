<img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

<p align="center">监控你的应用，并且可排查已部署应用的问题，这是一个可替代 DataDog、NewRelic 的开源方案</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/query-service?label=Docker Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>

<h3 align="center">
  <a href="https://signoz.io/docs"><b>文档</b></a> •
  <a href="https://github.com/SigNoz/signoz/blob/main/README.zh-cn.md"><b>中文ReadMe</b></a> •
  <a href="https://github.com/SigNoz/signoz/blob/main/README.de-de.md"><b>德文ReadMe</b></a> •
  <a href="https://github.com/SigNoz/signoz/blob/main/README.pt-br.md"><b>葡萄牙语ReadMe</b></a> •
  <a href="https://signoz.io/slack"><b>Slack 社区</b></a> •
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

##

SigNoz 帮助开发人员监控应用并排查已部署应用的问题。你可以使用 SigNoz 实现如下能力:

👉 在同一块面板上，可视化 Metrics, Traces 和 Logs 内容。

👉 你可以关注服务的 p99 延迟和错误率， 包括外部 API 调用和个别的端点。

👉 你可以找到问题的根因，通过提取相关问题的 traces 日志、单独查看请求 traces 的火焰图详情。

👉 执行 trace 数据聚合，以获取业务相关的 metrics

👉 对日志过滤和查询，通过日志的属性建立看板和告警

👉 通过 Python，java，Ruby 和 Javascript 自动记录异常

👉 轻松的自定义查询和设置告警

### 应用 Metrics 展示

![application_metrics](https://user-images.githubusercontent.com/83692067/226637410-900dbc5e-6705-4b11-a10c-bd0faeb2a92f.png)

### 分布式追踪

<img width="2068" alt="distributed_tracing_2 2" src="https://user-images.githubusercontent.com/83692067/226536447-bae58321-6a22-4ed3-af80-e3e964cb3489.png">

<img width="2068" alt="distributed_tracing_1" src="https://user-images.githubusercontent.com/83692067/226536462-939745b6-4f9d-45a6-8016-814837e7f7b4.png">

### 日志管理

<img width="2068" alt="logs_management" src="https://user-images.githubusercontent.com/83692067/226536482-b8a5c4af-b69c-43d5-969c-338bd5eaf1a5.png">

### 基础设施监控

<img width="2068" alt="infrastructure_monitoring" src="https://user-images.githubusercontent.com/83692067/226536496-f38c4dbf-e03c-4158-8be0-32d4a61158c7.png">

### 异常监控

![exceptions_light](https://user-images.githubusercontent.com/83692067/226637967-4188d024-3ac9-4799-be95-f5ea9c45436f.png)

### 告警

<img width="2068" alt="alerts_management" src="https://user-images.githubusercontent.com/83692067/226536548-2c81e2e8-c12d-47e8-bad7-c6be79055def.png">

<br /><br />

## 加入我们 Slack 社区

来 [Slack](https://signoz.io/slack) 和我们打招呼吧 👋

<br /><br />

## 特性:

- 为 metrics, traces and logs 制定统一的 UI。 无需切换 Prometheus 到 Jaeger 去查找问题，也无需使用想 Elastic 这样的日志工具分开你的 metrics 和 traces

- 默认统计应用的 metrics 数据，像 RPS (每秒请求数)， 50th/90th/99th 的分位数延迟数据，还有相关的错误率

- 找到应用中最慢的端点

- 查看准确的请求跟踪数据，找到下游服务的问题了，比如 DB 慢查询，或者调用第三方的支付网关等

- 通过 服务名、操作方式、延迟、错误、标签/注释 过滤 traces 数据

- 通过聚合 trace 数据而获得业务相关的 metrics。 比如你可以通过 `customer_type: gold` 或者 `deployment_version: v2` 或者 `external_call: paypal` 获取错误率和 P99 延迟数据

- 原生支持 OpenTelemetry 日志，高级日志查询，自动收集 k8s 相关日志

- 快如闪电的日志分析 ([Logs Perf. Benchmark](https://signoz.io/blog/logs-performance-benchmark/))

- 可视化点到点的基础设施性能，提取有所有类型机器的 metrics 数据

- 轻易自定义告警查询

<br /><br />

## 为什么使用 SigNoz?

作为开发者, 我们发现 SaaS 厂商对一些大家想要的小功能都是闭源的，这种行为真的让人有点恼火。 闭源厂商还会在月底给你一张没有明细的巨额账单。

我们想做一个自托管并且可开源的工具，像 DataDog 和 NewRelic 那样， 为那些担心数据隐私和安全的公司提供第三方服务。

作为开源的项目，你完全可以自己掌控你的配置、样本和更新。你同样可以基于 SigNoz 拓展特定的业务模块。

### 支持的编程语言:

我们支持 [OpenTelemetry](https://opentelemetry.io)。作为一个观测你应用的库文件。所以任何 OpenTelemetry 支持的框架和语言，对于 SigNoz 也同样支持。 一些主要支持的语言如下：

- Java
- Python
- NodeJS
- Go
- PHP
- .NET
- Ruby
- Elixir
- Rust

你可以在这里找到全部支持的语言列表 - https://opentelemetry.io/docs/

<br /><br />

## 让我们开始吧

### 使用 Docker 部署

请一步步跟随 [这里](https://signoz.io/docs/install/docker/) 通过 docker 来安装。

这个 [排障说明书](https://signoz.io/docs/install/troubleshooting/) 可以帮助你解决碰到的问题。

<p>&nbsp  </p>

### 使用 Helm 在 Kubernetes 部署

请一步步跟随 [这里](https://signoz.io/docs/deployment/helm_chart) 通过 helm 来安装

<br /><br />

## 比较相似的工具

### SigNoz vs Prometheus

Prometheus 是一个针对 metrics 监控的强大工具。但是如果你想无缝的切换 metrics 和 traces 查询，你当前大概率需要在 Prometheus 和 Jaeger 之间切换。

我们的目标是提供一个客户观测 metrics 和 traces 整合的 UI。就像 SaaS 供应商 DataDog，它提供很多 jaeger 缺失的功能，比如针对 traces 过滤功能和聚合功能。

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger 仅仅是一个分布式追踪系统。 但是 SigNoz 可以提供 metrics, traces 和 logs 所有的观测。

而且, SigNoz 相较于 Jaeger 拥有更对的高级功能:

- Jaegar UI 不能提供任何基于 traces 的 metrics 查询和过滤。

- Jaeger 不能针对过滤的 traces 做聚合。 比如， p99 延迟的请求有个标签是 customer_type='premium'。 而这些在 SigNoz 可以轻松做到。

<p>&nbsp  </p>

### SigNoz vs Elastic

- SigNoz 的日志管理是基于 ClickHouse 实现的，可以使日志的聚合更加高效，因为它是基于 OLAP 的数据仓储。

- 与 Elastic 相比，可以节省 50% 的资源成本

我们已经公布了 Elastic 和 SigNoz 的性能对比。 请点击 [这里](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNoz 支持大容量高基数的聚合，但是 loki 是不支持的。

- SigNoz 支持索引的高基数查询，并且对索引没有数量限制，而 Loki 会在添加部分索引后到达最大上限。

- 相较于 SigNoz，Loki 在搜索大量数据下既困难又缓慢。

我们已经发布了基准测试对比 Loki 和 SigNoz 性能。请点击 [这里](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<br /><br />

## 贡献

我们 ❤️ 你的贡献，无论大小。 请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 再开始给 SigNoz 做贡献。

如果你不知道如何开始？ 只需要在 [slack 社区](https://signoz.io/slack) 通过 `#contributing` 频道联系我们。

### 项目维护人员

#### 后端

- [Ankit Nayan](https://github.com/ankitnayan)
- [Nityananda Gohain](https://github.com/nityanandagohain)
- [Srikanth Chekuri](https://github.com/srikanthccv)
- [Vishal Sharma](https://github.com/makeavish)

#### 前端

- [Palash Gupta](https://github.com/palashgdev)
- [Yunus M](https://github.com/YounixM)
- [Rajat Dabade](https://github.com/Rajat-Dabade)

#### 运维开发

- [Prashant Shahi](https://github.com/prashant-shahi)

<br /><br />

## 文档

你可以通过 https://signoz.io/docs/ 找到相关文档。如果你需要阐述问题或者发现一些确实的事件， 通过标签为 `documentation` 提交 Github 问题。或者通过 slack 社区频道。

<br /><br />

## 社区

加入 [slack 社区](https://signoz.io/slack) 去了解更多关于分布式追踪、可观测性系统 。或者与 SigNoz 其他用户和贡献者交流。

如果你有任何想法、问题、或者任何反馈， 请通过 [Github Discussions](https://github.com/SigNoz/signoz/discussions) 分享。

不管怎么样，感谢这个项目的所有贡献者!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>

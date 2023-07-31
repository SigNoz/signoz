<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

  <p align="center">监视你的应用，并可排查已部署应用中的问题，这是一个开源的可替代DataDog、NewRelic的方案</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/frontend?label=Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>

##

SigNoz帮助开发人员监控应用并排查已部署应用中的问题。SigNoz使用分布式追踪来增加软件技术栈的可见性。

👉 你能看到一些性能指标，服务、外部api调用、每个终端(endpoint)的p99延迟和错误率。

👉 通过准确的追踪来确定是什么引起了问题，并且可以看到每个独立请求的帧图(framegraph)，这样你就能找到根本原因。

👉 聚合trace数据来获得业务相关指标。

![screenzy-1644432902955](https://user-images.githubusercontent.com/504541/153270713-1b2156e6-ec03-42de-975b-3c02b8ec1836.png)
<br />
![screenzy-1644432986784](https://user-images.githubusercontent.com/504541/153270725-0efb73b3-06ed-4207-bf13-9b7e2e17c4b8.png)
<br />
![screenzy-1647005040573](https://user-images.githubusercontent.com/504541/157875938-a3d57904-ea6d-4278-b929-bd1408d7f94c.png)

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## 加入我们的Slack社区

来[Slack](https://signoz.io/slack) 跟我们打声招呼👋

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Features.svg" width="50px" />

## 功能:

- 应用概览指标(metrics)，如RPS, p50/p90/p99延迟率分位值，错误率等。
- 应用中最慢的终端(endpoint)
- 查看特定请求的trace数据来分析下游服务问题、慢数据库查询问题 及调用第三方服务如支付网关的问题
- 通过服务名称、操作、延迟、错误、标签来过滤traces。
- 聚合trace数据(events/spans)来得到业务相关指标。比如，你可以通过过滤条件`customer_type: gold` or `deployment_version: v2` or `external_call: paypal` 来获取指定业务的错误率和p99延迟
- 为metrics和trace提供统一的UI。排查问题不需要在Prometheus和Jaeger之间切换。

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/WhatsCool.svg" width="50px" />

## 为何选择SigNoz？

作为开发人员，我们发现依赖闭源的SaaS厂商提供的每个小功能有些麻烦，闭源厂商通常会给你一份巨额月付账单，但不提供足够的透明度，你不知道你为哪些功能付费。

我们想做一个自服务的开源版本的工具，类似于DataDog和NewRelic，用于那些对客户数据流入第三方有隐私和安全担忧的厂商。

开源也让你对配置、采样和正常运行时间有完整的控制，你可以在SigNoz基础上构建模块来满足特定的商业需求。

### 语言支持

我们支持[OpenTelemetry](https://opentelemetry.io)库，你可以使用它来装备应用。也就是说SigNoz支持任何支持OpenTelemetry库的框架和语言。 主要支持语言包括:

- Java
- Python
- NodeJS
- Go

你可以在这个文档里找到完整的语言列表 - https://opentelemetry.io/docs/

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Philosophy.svg" width="50px" />

## 入门


### 使用Docker部署

请按照[这里](https://signoz.io/docs/install/docker/)列出的步骤使用Docker来安装

如果你遇到任何问题，这个[排查指南](https://signoz.io/docs/install/troubleshooting/)会对你有帮助。

<p>&nbsp  </p>


### 使用Helm在Kubernetes上部署

请跟着[这里](https://signoz.io/docs/deployment/helm_chart)的步骤使用helm charts安装

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/UseSigNoz.svg" width="50px" />

## 与其他方案的比较

### SigNoz vs Prometheus

如果你只是需要监控指标(metrics)，那Prometheus是不错的，但如果你要无缝的在metrics和traces之间切换，那目前把Prometheus & Jaeger串起来的体验并不好。

我们的目标是为metrics和traces提供统一的UI - 类似于Datadog这样的Saas厂提供的方案。并且能够对trace进行过滤和聚合，这是目前Jaeger缺失的功能。

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger只做分布式追踪(distributed tracing)，SigNoz则支持metrics,traces,logs ，即可视化的三大支柱。

并且SigNoz有一些Jaeger没有的高级功能：

- Jaegar UI无法在traces或过滤的traces上展示metrics。
- Jaeger不能对过滤的traces做聚合操作。例如，拥有tag为customer_type='premium'的所有请求的p99延迟。而这个功能在SigNoz这儿是很容易实现。

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributors.svg" width="50px" />

## 贡献


我们 ❤️ 任何贡献无论大小。 请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 然后开始给Signoz做贡献。

还不清楚怎么开始？ 只需在[slack社区](https://signoz.io/slack)的`#contributing`频道里ping我们。

### Project maintainers

#### Backend

- [Ankit Nayan](https://github.com/ankitnayan)
- [Nityananda Gohain](https://github.com/nityanandagohain)
- [Srikanth Chekuri](https://github.com/srikanthccv)
- [Vishal Sharma](https://github.com/makeavish)

#### Frontend

- [Palash Gupta](https://github.com/palashgdev)

#### DevOps

- [Prashant Shahi](https://github.com/prashant-shahi)

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/DevelopingLocally.svg" width="50px" />

## 文档

文档在这里：https://signoz.io/docs/. 如果你觉得有任何不清楚或者有文档缺失，请在Github里发一个问题，并使用标签 `documentation` 或者在社区stack频道里告诉我们。

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## 社区

加入[slack community](https://signoz.io/slack)，了解更多关于分布式跟踪、可观察性(observability)，以及SigNoz。同时与其他用户和贡献者一起交流。

如果你有任何想法、问题或者反馈，请在[Github Discussions](https://github.com/SigNoz/signoz/discussions)分享给我们。

最后，感谢我们这些优秀的贡献者们。 

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>




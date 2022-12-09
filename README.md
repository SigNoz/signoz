<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

  <p align="center">Monitor your applications and troubleshoot problems in your deployed applications, an open-source alternative to DataDog, New Relic, etc.</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/query-service?label=Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>
  
  
<h3 align="center">
  <a href="https://signoz.io/docs"><b>Documentation</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.zh-cn.md"><b>ReadMe in Chinese</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.de-de.md"><b>ReadMe in German</b></a> &bull;
  <a href="https://github.com/SigNoz/signoz/blob/develop/README.pt-br.md"><b>ReadMe in Portuguese</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Slack Community</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

##

SigNoz helps developers monitor applications and troubleshoot problems in their deployed applications. SigNoz uses distributed tracing to gain visibility into your software stack.

👉 Visualise Metrics, Traces and Logs in a single pane of glass

👉 You can see metrics like p99 latency, error rates for your services, external API calls and individual end points.

👉 You can find the root cause of the problem by going to the exact traces which are causing the problem and see detailed flamegraphs of individual request traces.

👉 Run aggregates on trace data to get business relevant metrics

👉 Filter and query logs, build dashboards and alerts based on attributes in logs

![screenzy-1670570187181](https://user-images.githubusercontent.com/504541/206646629-829fdafe-70e2-4503-a9c4-1301b7918586.png)
<br />
![screenzy-1670570193901](https://user-images.githubusercontent.com/504541/206646676-a676fdeb-331c-4847-aea9-d1cabf7c47e1.png)
<br />
![screenzy-1670570199026](https://user-images.githubusercontent.com/504541/206646754-28c5534f-0377-428c-9c6e-5c7c0d9dd22d.png)
<br />
![screenzy-1670569888865](https://user-images.githubusercontent.com/504541/206645819-1e865a56-71b4-4fde-80cc-fbdb137a4da5.png)



<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Join our Slack community

Come say Hi to us on [Slack](https://signoz.io/slack) 👋

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Features.svg" width="50px" />

## Features:

- Application overview metrics like RPS, 50th/90th/99th Percentile latencies, and Error Rate
- Slowest endpoints in your application
- See exact request trace to figure out issues in downstream services, slow DB queries, call to 3rd party services like payment gateways, etc
- Filter traces by service name, operation, latency, error, tags/annotations.
- Run aggregates on trace data (events/spans) to get business relevant metrics. e.g. You can get error rate and 99th percentile latency of `customer_type: gold` or `deployment_version: v2` or `external_call: paypal`
- Unified UI for metrics and traces. No need to switch from Prometheus to Jaeger to debug issues.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/WhatsCool.svg" width="50px" />

## Why SigNoz?

Being developers, we found it annoying to rely on closed source SaaS vendors for every small feature we wanted. Closed source vendors often surprise you with huge month end bills without any transparency.

We wanted to make a self-hosted & open source version of tools like DataDog, NewRelic for companies that have privacy and security concerns about having customer data going to third party services.

Being open source also gives you complete control of your configuration, sampling, uptimes. You can also build modules over SigNoz to extend business specific capabilities

### Languages supported:

We support [OpenTelemetry](https://opentelemetry.io) as the library which you can use to instrument your applications. So any framework and language supported by OpenTelemetry is also supported by SigNoz. Some of the main supported languages are:

- Java
- Python
- NodeJS
- Go
- PHP
- .NET
- Ruby
- Elixir
- Rust


You can find the complete list of languages here - https://opentelemetry.io/docs/

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Philosophy.svg" width="50px" />

## Getting Started

### Deploy using Docker

Please follow the steps listed [here](https://signoz.io/docs/deployment/docker/) to install using docker

The [troubleshooting instructions](https://signoz.io/docs/deployment/troubleshooting) may be helpful if you face any issues.

<p>&nbsp  </p>
  
  
### Deploy in Kubernetes using Helm

Please follow the steps listed [here](https://signoz.io/docs/deployment/helm_chart) to install using helm charts

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/UseSigNoz.svg" width="50px" />

## Comparisons to Familiar Tools

### SigNoz vs Prometheus

Prometheus is good if you want to do just metrics. But if you want to have a seamless experience between metrics and traces, then current experience of stitching together Prometheus & Jaeger is not great.

Our goal is to provide an integrated UI between metrics & traces - similar to what SaaS vendors like Datadog provides - and give advanced filtering and aggregation over traces, something which Jaeger currently lack.

<p>&nbsp  </p>

### SigNoz vs Jaeger

Jaeger only does distributed tracing. SigNoz supports metrics, traces and logs - all the 3 pillars of observability.

Moreover, SigNoz has few more advanced features wrt Jaeger:

- Jaegar UI doesn’t show any metrics on traces or on filtered traces
- Jaeger can’t get aggregates on filtered traces. For example, p99 latency of requests which have tag - customer_type='premium'. This can be done easily on SigNoz

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributors.svg" width="50px" />

## Contributing

We ❤️ contributions big or small. Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started with making contributions to SigNoz.

Not sure how to get started? Just ping us on `#contributing` in our [slack community](https://signoz.io/slack)

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

## Documentation

You can find docs at https://signoz.io/docs/. If you need any clarification or find something missing, feel free to raise a GitHub issue with the label `documentation` or reach out to us at the community slack channel.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Community

Join the [slack community](https://signoz.io/slack) to know more about distributed tracing, observability, or SigNoz and to connect with other users and contributors.

If you have any ideas, questions, or any feedback, please share on our [Github Discussions](https://github.com/SigNoz/signoz/discussions)

As always, thanks to our amazing contributors!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>

<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

  <p align="center">Monitor your applications and troubleshoot problems in your deployed applications, an open-source alternative to DataDog, New Relic, etc.</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/query-service?label=Docker Downloads"> </a>
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

SigNoz helps developers monitor applications and troubleshoot problems in their deployed applications. With SigNoz, you can:

👉 Visualise Metrics, Traces and Logs in a single pane of glass

👉 You can see metrics like p99 latency, error rates for your services, external API calls and individual end points.

👉 You can find the root cause of the problem by going to the exact traces which are causing the problem and see detailed flamegraphs of individual request traces.

👉 Run aggregates on trace data to get business relevant metrics

👉 Filter and query logs, build dashboards and alerts based on attributes in logs

👉 Record exceptions automatically in Python, Java, Ruby, and Javascript

👉 Easy to set alerts with DIY query builder


### Application Metrics

![application_metrics](https://user-images.githubusercontent.com/83692067/226637410-900dbc5e-6705-4b11-a10c-bd0faeb2a92f.png)


### Distributed Tracing
<img width="2068" alt="distributed_tracing_2 2" src="https://user-images.githubusercontent.com/83692067/226536447-bae58321-6a22-4ed3-af80-e3e964cb3489.png">

<img width="2068" alt="distributed_tracing_1" src="https://user-images.githubusercontent.com/83692067/226536462-939745b6-4f9d-45a6-8016-814837e7f7b4.png">

### Logs Management

<img width="2068" alt="logs_management" src="https://user-images.githubusercontent.com/83692067/226536482-b8a5c4af-b69c-43d5-969c-338bd5eaf1a5.png">

### Infrastructure Monitoring

<img width="2068" alt="infrastructure_monitoring" src="https://user-images.githubusercontent.com/83692067/226536496-f38c4dbf-e03c-4158-8be0-32d4a61158c7.png">

### Exceptions Monitoring

![exceptions_light](https://user-images.githubusercontent.com/83692067/226637967-4188d024-3ac9-4799-be95-f5ea9c45436f.png)


### Alerts

<img width="2068" alt="alerts_management" src="https://user-images.githubusercontent.com/83692067/226536548-2c81e2e8-c12d-47e8-bad7-c6be79055def.png">


<br /><br />


## Join our Slack community

Come say Hi to us on [Slack](https://signoz.io/slack) 👋

<br /><br />


## Features:

- Unified UI for metrics, traces and logs. No need to switch from Prometheus to Jaeger to debug issues, or use a logs tool like Elastic separate from your metrics and traces stack. 
- Application overview metrics like RPS, 50th/90th/99th Percentile latencies, and Error Rate
- Slowest endpoints in your application
- See exact request trace to figure out issues in downstream services, slow DB queries, call to 3rd party services like payment gateways, etc
- Filter traces by service name, operation, latency, error, tags/annotations.
- Run aggregates on trace data (events/spans) to get business relevant metrics. e.g. You can get error rate and 99th percentile latency of `customer_type: gold` or `deployment_version: v2` or `external_call: paypal`
- Native support for OpenTelemetry Logs, advanced log query builder, and automatic log collection from k8s cluster
- Lightning quick log analytics ([Logs Perf. Benchmark](https://signoz.io/blog/logs-performance-benchmark/))
- End-to-End visibility into infrastructure performance, ingest metrics from all kinds of host environments
- Easy to set alerts with DIY query builder

<br /><br />


## Why SigNoz?

Being developers, we found it annoying to rely on closed source SaaS vendors for every small feature we wanted. Closed source vendors often surprise you with huge month end bills without any transparency.

We wanted to make a self-hosted & open source version of tools like DataDog, NewRelic for companies that have privacy and security concerns about having customer data going to third party services.

Being open source also gives you complete control of your configuration, sampling, uptimes. You can also build modules over SigNoz to extend business specific capabilities

### Languages supported:

We support [OpenTelemetry](https://opentelemetry.io) as the library which you can use to instrument your applications. So any framework and language supported by OpenTelemetry is also supported by SigNoz. Some of the main supported languages are:

- Java
- Python
- Node.js
- Go
- PHP
- .NET
- Ruby
- Elixir
- Rust


You can find the complete list of languages here - https://opentelemetry.io/docs/

<br /><br />


## Getting Started

### Deploy using Docker

Please follow the steps listed [here](https://signoz.io/docs/install/docker/) to install using docker

The [troubleshooting instructions](https://signoz.io/docs/install/troubleshooting/) may be helpful if you face any issues.

<p>&nbsp  </p>
  
  
### Deploy in Kubernetes using Helm

Please follow the steps listed [here](https://signoz.io/docs/deployment/helm_chart) to install using helm charts

<br /><br />


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

<p>&nbsp  </p>

### SigNoz vs Elastic 

- SigNoz Logs management are based on ClickHouse, a columnar OLAP datastore which makes aggregate log analytics queries much more efficient
- 50% lower resource requirement compared to Elastic during ingestion

We have published benchmarks comparing Elastic with SigNoz. Check it out [here](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<p>&nbsp  </p>

### SigNoz vs Loki

- SigNoz supports aggregations on high-cardinality data over a huge volume while loki doesn’t.
- SigNoz supports indexes over high cardinality data and has no limitations on the number of indexes, while Loki reaches max streams with a few indexes added to it.
- Searching over a huge volume of data is difficult and slow in Loki compared to SigNoz

We have published benchmarks comparing Loki with SigNoz. Check it out [here](https://signoz.io/blog/logs-performance-benchmark/?utm_source=github-readme&utm_medium=logs-benchmark)

<br /><br />


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

- [Yunus M](https://github.com/YounixM)
- [Vikrant Gupta](https://github.com/vikrantgupta25)
- [Sagar Rajput](https://github.com/SagarRajput-7)

#### DevOps

- [Prashant Shahi](https://github.com/prashant-shahi)
- [Vibhu Pandey](https://github.com/grandwizard28)

<br /><br />


## Documentation

You can find docs at https://signoz.io/docs/. If you need any clarification or find something missing, feel free to raise a GitHub issue with the label `documentation` or reach out to us at the community slack channel.

<br /><br />


## Community

Join the [slack community](https://signoz.io/slack) to know more about distributed tracing, observability, or SigNoz and to connect with other users and contributors.

If you have any ideas, questions, or any feedback, please share on our [Github Discussions](https://github.com/SigNoz/signoz/discussions)

As always, thanks to our amazing contributors!

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>

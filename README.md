<p align="center"><img src="https://signoz.io/img/SigNozLogo-200x200.svg" alt="SigNoz Logo" width="100"></p>

# SigNoz
SigNoz is an opensource observability platform. SigNoz uses distributed tracing to gain visibility into your systems and powers data using [Kafka](https://kafka.apache.org/) (to handle high ingestion rate and backpressure) and [Apache Druid](https://druid.apache.org/) (Apache Druid is a high performance real-time analytics database), both proven in industry to handle scale.


![SigNoz Feature](https://signoz.io/img/readme_feature1.jpg)


### Features:
- Application overview metrics like RPS, 50th/90th/99th Percentile latencies and Error Rate
- Slowest endpoints in your application
- See exact request trace to figure out issues in downstream services, slow DB queries, call to 3rd party services like payment gateways, etc
- Filter traces by service name, operation, latency, error, tags/annotations. 
- Aggregate metrics on filtered traces. Eg, you can get error rate and 99th percentile latency of `customer_type: gold` or `deployment_version: v2` or `external_call: paypal`
- Unified UI for metrics and traces. No need to switch from Prometheus to Jaeger to debug issues.
- In-built workflows to reduce your efforts in detecting common issues like new deployment failures, 3rd party slow APIs, etc (Coming Soon)
- Anomaly Detection Framework (Coming Soon)


### Motivation:
- SaaS vendors charge insane amount to provide Application Monitoring. They often surprise you by huge month end bills without any tranparency of data sent to them.
- Data privacy and compliance demands data to not leave the network boundary
- Highly scalalable architecture
- No more magic happening in agents installed in your infra. You take control of sampling, uptime, configuration.
- Build modules over SigNoz to extend business specific capabilities




# Getting Started

Deploy in Kubernetes using Helm. Below steps will install the SigNoz in platform namespace inside you k8s cluster. 


```console
git clone https://github.com/SigNoz/signoz.git && cd signoz
helm dependency update deploy/kubernetes/platform
kubectl create ns platform
helm -n platform install signoz deploy/kubernetes/platform
kubectl -n platform apply -Rf deploy/kubernetes/jobs
kubectl -n platform apply -f deploy/kubernetes/otel-collector
```
 
 **You can choose a different namespace too. In that case, you need to point your applications to correct address to send traces. In our sample application just change the `JAEGER_ENDPOINT` environment variable in `sample-apps/hotrod/deployment.yaml`*

### Test HotROD application with SigNoz

```console
kubectl create ns sample-application
kubectl -n sample-application apply -Rf sample-apps/hotrod/
```

### How to generate load

`kubectl -n sample-application run strzal --image=djbingham/curl --restart='OnFailure' -i --tty --rm --command -- curl -X POST -F 'locust_count=6' -F 'hatch_rate=2' http://locust-master:8089/swarm`

### See UI
`kubectl -n platform port-forward svc/signoz-frontend 3000:3000`

### How to stop load

`kubectl -n sample-application run strzal --image=djbingham/curl --restart='OnFailure' -i --tty --rm --command -- curl http://locust-master:8089/stop`


# Documentation
You can find docs at https://signoz.io/docs/deployment/docker. If you need any clarification or find something missing, feel free to raise a github issue with label `documentation` or reach out to us at community slack channel.

# Community
Join the [slack community](https://app.slack.com/client/T01HWUTP0LT#/) to know more about distributed tracing, observability or SigNoz and to connect with other users and contributors.

If you have any ideas, questions or any feedback, please share on our [Github Discussions](https://github.com/SigNoz/signoz/discussions)

# Configuring OpenTelemetry Demo App with SigNoz

[The OpenTelemetry Astronomy Shop](https://github.com/open-telemetry/opentelemetry-demo) is an e-commerce web application, with **15 core microservices** in a **distributed system**. Designed as a **polyglot** environment, it leverages a diverse set of programming languages, including Go, Python, .NET, Java, and others, showcasing cross-language instrumentation with OpenTelemetry.

This guide provides a step-by-step walkthrough for setting up the **OpenTelemetry Demo App** with **SigNoz** as backend for observability. It outlines the steps to export telemetry data to **SigNoz Cloud**, covering deployment scenarios for OTel Demo App using **Docker** for containerized execution and **Kubernetes** for cluster-orchestrated management.



# Send data to SigNoz Cloud from OpenTelemetery Demo App [Docker]

You can follow the below guide if you intend to install the OTel Demo application with **docker**. Instead, if wish to install it using **Kubernetes/ Helm charts**, you can check the next section.



## Prerequisites
- Docker and Docker Compose installed
- 6 GB of RAM for the application [as per Opentelemetry documentation]
- Nice to have Docker Desktop, for easy monitoring

## Get your SigNoz cloud endpoint
1. Sign up or log in to [SigNoz Cloud](https://signoz.io/)
2. Generate a new access token within the ingestion settings. This token will serve as your authentication method for transmitting telemetry data.


## Clone the OpenTelemetry Demo App Repository
Clone the OTel demo app to any folder of your choice.
```sh
# Clone the OpenTelemetry Demo repository
git clone https://github.com/open-telemetry/opentelemetry-demo.git
cd opentelemetry-demo
```

## Modify OpenTelemetry Collector Config

By default, the collector in the demo application will merge the configuration from two files:

1. otelcol-config.yml &nbsp;&nbsp;[we don't touch this]
2. otelcol-config-extras.yml &nbsp;&nbsp; [we modify this]

To add SigNoz as the backend, open the file `src/otel-collector/otelcol-config-extras.yml` and add the following,
```yaml
exporters:
  otlp:
    endpoint: "https://ingest.{your-region}.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      signoz-access-token: <SIGNOZ-KEY>
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      exporters: [otlp]
    traces:
      exporters: [spanmetrics, otlp]
    logs: 
      exporters: [otlp]
```
Remember to replace the region and ingestion key with proper values as obtained from your account.

When merging extra configuration values with the existing collector config (`src/otel-collector/otelcol-config.yml`), objects are merged and arrays are replaced resulting in previous pipeline configurations getting overriden.

>Note: The spanmetrics exporter must be included in the array of exporters for the traces pipeline if overridden. Not including this exporter will result in an error.

## Start the OpenTelemetry Demo App
Run the application using Docker Compose,
```sh
docker compose up -d
```
This spins up multiple microservices, with OpenTelemetry instrumentation enabled. you can verify this by,
```sh
docker compose ps -a
```
The result should look similar to this,
![](/docs/contributing/img/docker_containers.png)

## Monitor with SigNoz
1. Open your SigNoz account
2. Navigate to Services to see multiple services listed down as shown in the snapshot below.

![](/docs/contributing/img/demo_services.png)


# Send data to SigNoz Cloud from OpenTelemetery Demo App [Kubernetes/ Helm charts]

You can follow the below guide if you intend to install the OTel Demo application with  **Kubernetes/ Helm charts**.



## Prerequisites

- Helm charts installed
- 6 GB of free RAM for the application [as per OpenTelemetry documentation]
- A kubernetes cluster (EKS, GKS, Minikube)
- kubectl [CLI for Kubernetes]

>Note: We will be installing OTel demo app using Helm charts, since it is recommended by OpenTelemetry. If you wish to install using kubectl, follow [this](https://opentelemetry.io/docs/demo/kubernetes-deployment/#install-using-kubectl).

## Get your SigNoz cloud endpoint
1. Sign up or log in to [SigNoz Cloud](https://signoz.io/)
2. Generate a new access token from ingestion settings. This token will serve as your authentication method for transmitting telemetry data.

## Install Helm Repo and Charts
You’ll need to **install the Helm repository** to start sending data to SigNoz cloud.

```sh
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
```
The OpenTelemetry Collector’s configuration is exposed in the Helm chart. All additions made will be merged into the default configuration. We use this capability to add SigNoz as an exporter, and make pipelines as desired.

For this we have to create a `values.yml` which will override the existing configurations that comes with the Helm chart.
```sh
opentelemetry-collector:
  config:
    exporters:
      otlp:
        endpoint: "https://ingest.{your-region}.signoz.cloud:443"
        tls:
          insecure: false
        headers:
          signoz-acess-token: <SIGNOZ-KEY>
      debug:
        verbosity: detailed
    service:
      pipelines:
        traces:
          exporters: [spanmetrics, otlp] 
        metrics:
          exporters: [otlp]
        logs:
          exporters: [otlp]
```
This file will replace the chart’s existing settings with our new ones, ensuring telemetry data is sent to SigNoz Cloud.

> Note: The spanmetrics exporter must be included in the array of exporters for the traces pipeline if overridden. Not including this exporter will result in an error.

Now **install the helm chart** with a release name and namespace of your choice. Let's take *my-otel-demo* as the release name and *otel-demo* as the namespace for the context of the code snippet below,
```sh
# Create a new Kubernetes namespace called "otel-demo"
kubectl create namespace otel-demo
# Install the OpenTelemetry Demo Helm chart with the release name "my-otel-demo"
helm install my-otel-demo open-telemetry/opentelemetry-demo --namespace otel-demo -f values.yaml
```
You should see a similar output on your terminal,
![](/docs/contributing/img/otel_demo_helm.png)

To verify if all the pods are running,
```sh
kubectl get pods -n otel-demo 
```
The output should look similar to this,

![](/docs/contributing/img/otel_demo_pods.png)


## Monitor with SigNoz
1. Open your SigNoz account
2. Navigate to Services to see multiple services listed down as shown in the snapshot below.

![](/docs/contributing//img/demo_services.png)


# SigNoz Monitoring - Beyond the Cloud

We have already understood about monitoring applications using the SigNoz cloud. What if we require *fine-grained control over resource allocation* or *tailored scalability options*? How do we attain such *customization* while maintaining *robust observability*? SigNoz provides a **Docker standalone** implementation, **Kubernetes** orchestrated deployment and a **single binary** installation to address these needs.

- For Kubernetes based deployment, check [this](https://signoz.io/docs/install/kubernetes/others/#optional-install-opentelemetry-demo).
- For docker based deployment, check [this](https://signoz.io/docs/install/kubernetes/others/#optional-install-opentelemetry-demo).


# What's next?

If you’re eager to deepen your expertise in OpenTelemetry, explore this [blog]() for a comprehensive analysis of its advanced features such as error tracking, exception handling, and manual instrumentation explored using the OTel Demo app.

Don't forget to check our OpenTelemetry [track](https://signoz.io/resource-center/opentelemetry/), guaranteed to take you from a newbie to sensei in no time!

Also from a fellow OTel fan to another, we at [SigNoz](https://signoz.io/) are building an opensource, OTel native, observability platform (one of it's kind). So, show us love - star us on [GitHub](https://github.com/SigNoz/signoz), nitpick our [docs](https://signoz.io/docs/introduction/), or just tell your app we’re the ones who’ll catch its crashes mid-flight and finally shush all the 3am panic calls!


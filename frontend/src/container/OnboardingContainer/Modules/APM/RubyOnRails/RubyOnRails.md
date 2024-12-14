## Send Traces to SigNoz Cloud

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- Send traces directly to SigNoz Cloud (quick start)
- Send traces via OTel Collector binary (recommended)

#### **Send traces directly to SigNoz Cloud**

**Step 1. Install dependencies**

Install dependencies related to OpenTelemetry SDK and exporter using gem.

```go
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```

Include the required packages into your gemfile.

```go
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
```

Run the bundle install command:

```go
bundle install
```

**Step 2. Initialize the OpenTelemetry SDK**

Initialize the otel sdk by adding below lines to `config/environment.rb` of your Ruby on Rails application.

```jsx
require 'opentelemetry/sdk'
require_relative 'application'

OpenTelemetry::SDK.configure do |c|
  c.use_all
end

Rails.application.initialize!
```

**Step 3. Running your Ruby application**

Run the application using the below:

```jsx
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}} \
rails server
```

---
#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Ruby on Rails application.

**Step 1. Install dependencies**

Install dependencies related to OpenTelemetry SDK and exporter using gem.

```go
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```

Include the required packages into your gemfile.

```go
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
```

Run the bundle install command:

```go
bundle install
```

**Step 2. Initialize the OpenTelemetry SDK**

Initialize the otel sdk by adding below lines to `config/environment.rb` of your Ruby on Rails application.

```jsx
require 'opentelemetry/sdk'
require_relative 'application'

OpenTelemetry::SDK.configure do |c|
  c.use_all
end

Rails.application.initialize!
```

**Step 3. Running your Ruby application**

Run the application using the below:

```jsx
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
rails server
```

In case you have OtelCollector Agent in different VM, replace localhost:4318 with `<IP Address of the VM>:4318`.

---

### Applications Deployed on Kubernetes

For Ruby on Rails application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/).



**Step 1. Install dependencies**

Install dependencies related to OpenTelemetry SDK and exporter using gem.

```go
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```

Include the required packages into your gemfile.

```go
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
```

Run the bundle install command:

```go
bundle install
```

**Step 2. Initialize the OpenTelemetry SDK**

Initialize the otel sdk by adding below lines to `config/environment.rb` of your Ruby on Rails application.

```jsx
require 'opentelemetry/sdk'
require_relative 'application'

OpenTelemetry::SDK.configure do |c|
  c.use_all
end

Rails.application.initialize!
```

**Step 3. Running your Ruby application**

Run the application using the below:

```jsx
OTEL_EXPORTER=otlp \
OTEL_SERVICE_NAME={{MYAPP}} \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
rails server
```

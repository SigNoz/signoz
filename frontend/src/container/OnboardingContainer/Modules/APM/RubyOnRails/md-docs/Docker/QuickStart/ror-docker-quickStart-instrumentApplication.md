&nbsp;

### Step 1: Install dependencies
Install dependencies related to OpenTelemetry SDK and exporter using gem
```bash
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```
&nbsp;

Include the required packages into your gemfile
```bash
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
```
&nbsp;

Run the bundle install command:
```bash
bundle install
```
&nbsp;

### Step 2: Initialize the OpenTelemetry SDK
Initialize the otel sdk by adding below lines to `config/environment.rb` of your Ruby on Rails application

```bash
require 'opentelemetry/sdk'
require_relative 'application'

OpenTelemetry::SDK.configure do |c|
  c.use_all
end

Rails.application.initialize!
```

&nbsp;

### Step 3: Dockerize your application

Update your dockerfile to include the environment variables:

```bash
...
# Set environment variables
ENV OTEL_EXPORTER=otlp \
    OTEL_SERVICE_NAME={{MYAPP}} \
    OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
    OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}}
...
```
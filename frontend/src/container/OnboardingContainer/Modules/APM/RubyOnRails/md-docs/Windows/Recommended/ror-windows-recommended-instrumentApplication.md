&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your Ruby On Rails Application

&nbsp;

**Step 1. Install dependencies**

Install dependencies related to OpenTelemetry SDK and exporter using gem.

```bash
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```

&nbsp;

Include the required packages into your gemfile.

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

**Step 2. Initialize the OpenTelemetry SDK**

Initialize the otel sdk by adding below lines to `config/initializers/opentelemetry.rb` of your Ruby on Rails application.

```bash
require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.add_span_processor(
    OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor.new(
      OpenTelemetry::Exporter::OTLP::Exporter.new(
        endpoint: 'http://localhost:4318'
      )
    )
  )
  c.resource = OpenTelemetry::SDK::Resources::Resource.create({
    OpenTelemetry::SemanticConventions::Resource::HOST_NAME => '<your-host-name>',
  })
  c.service_name = '{{MYAPP}}'    # The name of the application.
  c.use_all()    # The libraries supported by automatic OpenTelemetry observation. 
end
```

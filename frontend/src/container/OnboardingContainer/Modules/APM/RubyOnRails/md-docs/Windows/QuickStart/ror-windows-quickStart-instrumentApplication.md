### Send traces directly to SigNoz Cloud

**Step 1. Install dependencies**

Install dependencies related to OpenTelemetry SDK and exporter using gem.

```ruby
gem install opentelemetry-sdk
gem install opentelemetry-exporter-otlp
gem install opentelemetry-instrumentation-all
```

Include the required packages into your gemfile.

```ruby
gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-all'
```

Run the bundle install command:

```go
bundle install
```

**Step 2. Initialize the OpenTelemetry SDK**

Initialize the otel sdk by adding below lines to `config/initializers/opentelemetry.rb` of your Ruby on Rails application.

```ruby
require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.add_span_processor(
    OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor.new(
      OpenTelemetry::Exporter::OTLP::Exporter.new(
        endpoint: '<SIGNOZ_URL>',
        headers: { 'signoz-access-token' => '{{SIGNOZ_INGESTION_KEY}}' } 
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
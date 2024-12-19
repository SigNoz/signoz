&nbsp;

Follow the steps below to instrument your Elixir (Phoenix + Ecto) Application

### Step 1: Add dependencies
Install dependencies related to OpenTelemetry by adding them to `mix.exs` file 

```bash
    {:opentelemetry_exporter, "~> 1.6"},
    {:opentelemetry_api, "~> 1.2"},
    {:opentelemetry, "~> 1.3"},
    {:opentelemetry_semantic_conventions, "~> 0.2"},
    {:opentelemetry_cowboy, "~> 0.2.1"},
    {:opentelemetry_phoenix, "~> 1.1"},
    {:opentelemetry_ecto, "~> 1.1"}
```
&nbsp;

In your application start, usually the `application.ex` file, setup the telemetry handlers 

```bash
    :opentelemetry_cowboy.setup()
    OpentelemetryPhoenix.setup(adapter: :cowboy2)
    OpentelemetryEcto.setup([:{{MYAPP}}, :repo])
```
&nbsp;

As an example, this is how you can setup the handlers in your application.ex file for an application called demo :

```bash
# application.ex
@impl true
def start(_type, _args) do
  :opentelemetry_cowboy.setup()
  OpentelemetryPhoenix.setup(adapter: :cowboy2)
  OpentelemetryEcto.setup([:demo, :repo])

end
```

&nbsp;

### Step 2: Configure Application
You need to configure your application to send telemetry data by adding the following config to your `runtime.exs` file:

```bash
config :opentelemetry, :resource, service: %{name: "{{MYAPP}}"}

config :opentelemetry, :processors,
  otel_batch_processor: %{
    exporter: {
      :opentelemetry_exporter,
      %{
        endpoints: ["https://ingest.{{REGION}}.signoz.cloud:443"],
        headers: [
          {"signoz-ingestion-key", {{SIGNOZ_ACCESS_TOKEN}} }
        ]
      }
    }
  }
```

&nbsp;

### Step 3: Dockerize your application

Since the environment variables like SIGNOZ_INGESTION_KEY, Ingestion Endpoint and Service name are set in the above steps, you don't need to add any additional steps in your Dockerfile.
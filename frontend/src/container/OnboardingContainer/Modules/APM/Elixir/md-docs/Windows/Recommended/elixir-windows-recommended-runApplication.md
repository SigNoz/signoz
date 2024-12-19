
OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Elixir (Phoenix + Ecto) application.

**Step 1. Add dependencies**

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

In your application start, usually the `application.ex` file, setup the telemetry handlers

```elixir
    :opentelemetry_cowboy.setup()
    OpentelemetryPhoenix.setup(adapter: :cowboy2)
    OpentelemetryEcto.setup([:YOUR_APP_NAME, :repo])
```

As an example, this is how you can setup the handlers in your `application.ex` file for an application called `demo` :

```elixir
# application.ex
@impl true
def start(_type, _args) do
  :opentelemetry_cowboy.setup()
  OpentelemetryPhoenix.setup(adapter: :cowboy2)
  OpentelemetryEcto.setup([:demo, :repo])

end
```

**Step 2. Configure Application**

You need to configure your application to send telemtry data by adding the follwing config to your `runtime.exs` file:

```elixir
config :opentelemetry, :resource, service: %{name: "{{MYAPP}}"}

config :opentelemetry, :processors,
    otel_batch_processor: %{
      exporter: 
      {:opentelemetry_exporter, 
      %{endpoints: ["http://localhost:4318"]}
      }
  }
```
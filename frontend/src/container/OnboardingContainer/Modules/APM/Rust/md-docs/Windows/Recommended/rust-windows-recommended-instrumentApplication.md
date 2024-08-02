&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your Rust Application

&nbsp;

**Step 1 : Instrument your application with OpenTelemetry**

To configure our Rust application to send traces we need to initialize OpenTelemetry, Otel has already created some crates which you need to add into your `Cargo.toml` file, just below `[dependencies]` section.

```
opentelemetry = { version = "0.18.0", features = ["rt-tokio", "metrics", "trace"] }
opentelemetry-otlp = { version = "0.11.0", features = ["trace", "metrics"] }
opentelemetry-semantic-conventions = { version = "0.10.0" }
opentelemetry-proto = { version = "0.1.0"}
tokio = { version = "1", features = ["full"] }
tonic = { version = "0.8.2", features = ["tls-roots"] }
```
after adding these in `Cargo.toml` , you need to use these in entry point of your Rust application , which is `main.rs` file in majority of applications. 

```rust
use opentelemetry::global::shutdown_tracer_provider;
use opentelemetry::sdk::Resource;
use opentelemetry::trace::TraceError;
use opentelemetry::{
    global, sdk::trace as sdktrace,
    trace::{TraceContextExt, Tracer},
    Context, Key, KeyValue,
};
use opentelemetry_otlp::WithExportConfig;
use tonic::metadata::{MetadataMap, MetadataValue};
```

**Step 2: Initialize the tracer and create env file**

Add this function in main.rs file, `init_tracer` is initializing an OpenTelemetry tracer with the OpenTelemetry OTLP exporter which is sending data to SigNoz Cloud. 

This tracer initializes the connection with the OTel collector from the system variables passed while starting the app. 

```rust
fn init_tracer() -> Result<sdktrace::Tracer, TraceError> {
    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").expect("OTEL_EXPORTER_OTLP_ENDPOINT not set")),
        )
        .with_trace_config(
            sdktrace::config().with_resource(Resource::new(vec![
                KeyValue::new(
                    opentelemetry_semantic_conventions::resource::SERVICE_NAME,
                    std::env::var("APP_NAME").expect("APP_NAME not set"),
                ),
            ])),
        )
        .install_batch(opentelemetry::runtime::Tokio)
}
```

**Step 3: Add the OpenTelemetry instrumentation for your Rust app**

You need call init_tracer function inside `main()` at starting so that as soon as your rust application starts, tracer will be available globally.
```rust 
let _ = init_tracer();
```

also change
```rust
fn main(){
    //rest of the code
}
```
to 
```rust
#[tokio::main]
async fn main() {
    //rest of the code
}
```

Now comes the most interesting part, Sending data to SigNoz to get sense of your traces. After adding the below block you can send traces to SigNoz cloud

```rust
  let tracer = global::tracer("global_tracer");
    let _cx = Context::new();
  
    tracer.in_span("operation", |cx| {
        let span = cx.span();
        span.set_attribute(Key::new("KEY").string("value"));

        span.add_event(
            format!("Operations"),
            vec![
                Key::new("SigNoz is").string("Awesome"),
            ],
        );
    });
    shutdown_tracer_provider()
```

**Step 4: Set environment variables and run app**

Create a `.env` file in root of project , the structure should look like this.
```
project_root/
|-- Cargo.toml
|-- src/
|   |-- main.rs
|-- .env
```

Paste these in `.env` file 
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_RESOURCE_ATTRIBUTES={{MYAPP}}
```

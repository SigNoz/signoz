&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your Rust Application

### Step 1: Add dependencies
Add these crates just below the `[dependencies]` section of your `cargo.toml` file

```rust
opentelemetry = { version = "0.18.0", features = ["rt-tokio", "metrics", "trace"] }
opentelemetry-otlp = { version = "0.11.0", features = ["trace", "metrics"] }
opentelemetry-semantic-conventions = { version = "0.10.0" }
opentelemetry-proto = { version = "0.1.0"}
tokio = { version = "1", features = ["full"] }
tonic = { version = "0.8.2", features = ["tls-roots"] }
```
&nbsp;

Use the above crates in entry point of your Rust application, which is generally your `main.rs` file 

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
&nbsp;

### Step 2: Initialize tracer
Add `init_tracer` function to your `main.rs` file. It initializes an OpenTelemetry tracer with the OpenTelemetry OTLP exporter which is sending data to SigNoz Cloud.

```rust
fn init_tracer() -> Result<sdktrace::Tracer, TraceError> {
    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_exporter().tonic().with_env())
        .with_trace_config(
            sdktrace::config().with_resource(Resource::default()),
        )
        .install_batch(opentelemetry::runtime::Tokio)
}
```
### Step 3: Add OpenTelemetry instrumentation

Call the `init_tracer` function inside `main()` at starting so that as soon as your rust application starts, tracer will be available globally.

```rust
    let _ = init_tracer();
```

Modify your `main()` function from

```rust
fn main(){
    //rest of the code
}
```

&nbsp;

to

```rust
#[tokio::main]
async fn main() {
    //rest of the code
}
```

Add the below code block within a function or a section of your code where you're setting up and using the tracer for distributed tracing. After adding the below code block you can send traces to SigNoz Cloud

```rust
  let tracer = global::tracer("global_tracer");
    let _cx = Context::new();
  
    tracer.in_span("operation", |cx| {
        let span = cx.span();
        span.set_attribute(Key::new("KEY").string("value"));

        span.add_event(
            format!("Operations"),
            vec![
                Key::new("SigNoz is").string("working!"),
            ],
        );
    });
    shutdown_tracer_provider()
```

The above code block will create a span named operation which sets an attribute and an event to it saying "SigNoz is working!".

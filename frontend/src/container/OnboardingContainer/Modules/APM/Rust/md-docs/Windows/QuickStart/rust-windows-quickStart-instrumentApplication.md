**Step 1 : Instrument your application with OpenTelemetry**

To configure our Rust application to send data we need to initialize OpenTelemetry, Otel has already created some crates which you need to add into your `Cargo.toml` file, just below `[dependencies]` section.

```bash
opentelemetry = { version = "0.18.0", features = ["rt-tokio", "metrics", "trace"] }
opentelemetry-otlp = { version = "0.11.0", features = ["trace", "metrics"] }
opentelemetry-semantic-conventions = { version = "0.10.0" }
opentelemetry-proto = { version = "0.1.0"}
tokio = { version = "1", features = ["full"] }
tonic = { version = "0.8.2", features = ["tls-roots"] }
```

&nbsp;

after adding these in `Cargo.toml` , you need to use these in entry point of your Rust application , which is `main.rs` file in majority of applications. 

&nbsp;

```bash
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

**Step 2: Initialize the tracer and create env file**

Add this function in main.rs file, `init_tracer` is initializing an OpenTelemetry tracer with the OpenTelemetry OTLP exporter which is sending data to SigNoz Cloud. 

```bash
fn init_tracer() -> Result<sdktrace::Tracer, TraceError> {
    let signoz_access_token = std::env::var("SIGNOZ_ACCESS_TOKEN").expect("SIGNOZ_ACCESS_TOKEN not set");
    let mut metadata = MetadataMap::new();
    metadata.insert(
        "signoz-ingestion-key",
        MetadataValue::from_str(&signoz_access_token).unwrap(),
    );
    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_metadata(metadata)
                .with_endpoint(std::env::var("SIGNOZ_ENDPOINT").expect("SIGNOZ_ENDPOINT not set")),
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

&nbsp;

After adding this function, you need to create a `.env` file in root of project , the structure should look like this.


```bash
project_root/
|-- Cargo.toml
|-- src/
|   |-- main.rs
|-- .env
```

&nbsp;

Paste these in `.env` file 

&nbsp;


```bash 
PORT=3000
APP_NAME={{MYAPP}}
SIGNOZ_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443/v1/traces
SIGNOZ_ACCESS_TOKEN={{SIGNOZ_INGESTION_KEY}}
```

&nbsp;


**Step 3: Add the OpenTelemetry instrumentation for your Rust app**

Open your Cargo.toml file and paste these below `[dependencies]`

```bash
dotenv = "0.15.0"
```

&nbsp;


Import these at top, so you can use variables from `.env` file

```bash
use dotenv::dotenv;
```

&nbsp;


After importing , just call these functions inside `main()` function by pasting this at starting of `main()` function

```bash 
dotenv().ok();
let _ = init_tracer();
```

&nbsp;


also change
```bash
fn main(){
    //rest of the code
}
```

&nbsp;


to 


```bash
#[tokio::main]
async fn main() {
    //rest of the code
}
```
&nbsp;


Now comes the most interesting part, Sending data to SigNoz to get sense of your traces. After adding the below block you can send data to SigNoz cloud

```bash
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

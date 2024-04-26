&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your Swift Application

### Step 1: Add dependencies

To configure your Swift application to send data you need to initialize OpenTelemetry. Add these dependency in `Package.swift` file of your project or if you are using XCode then you need to add this [dependency](https://github.com/open-telemetry/opentelemetry-swift) and then import these below dependencies in the main file.

```swift
import Foundation
import GRPC
import NIO
import NIOSSL
import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetryProtocolExporterGrpc
import OpenTelemetrySdk
import ResourceExtension
import SignPostIntegration
import StdoutExporter
import ZipkinExporter
```

&nbsp;

### Step 2: Initialize tracer
Initialize the tracer using the code block below in the `main.swift` file : 

```swift
var resources = DefaultResources().get()

let instrumentationScopeName = "{{MYAPP}}"
let instrumentationScopeVersion = "semver:0.1.0"

let otlpConfiguration: OtlpConfiguration = OtlpConfiguration(timeout: TimeInterval(10))

let grpcChannel = ClientConnection.usingPlatformAppropriateTLS(for: MultiThreadedEventLoopGroup(numberOfThreads:1)).connect(host: <OTEL_EXPORTER_OTLP_ENDPOINT>, port: 4317)

let otlpTraceExporter = OtlpTraceExporter(channel: grpcChannel,
                                      config: otlpConfiguration)
let stdoutExporter = StdoutExporter()

let spanExporter = MultiSpanExporter(spanExporters: [otlpTraceExporter, stdoutExporter])

let spanProcessor = SimpleSpanProcessor(spanExporter: spanExporter)
OpenTelemetry.registerTracerProvider(tracerProvider:
    TracerProviderBuilder()
        .add(spanProcessor: spanProcessor)
        .build()
)
```
- <OTEL_EXPORTER_OTLP_ENDPOINT> - The default value for this is `http://localhost:4317`


### Step 3: Add OpenTelemetry instrumentation

```swift
func doWork() {
    let childSpan = tracer.spanBuilder(spanName: "doWork").setSpanKind(spanKind: .client).startSpan()
    childSpan.setAttribute(key: sampleKey, value: sampleValue)
    Thread.sleep(forTimeInterval: Double.random(in: 0 ..< 10) / 100)
    childSpan.end()
}
```

&nbsp;

If you call this `doWork` function, it will add a trace with span name "doWork" and attributes with key-value pair.

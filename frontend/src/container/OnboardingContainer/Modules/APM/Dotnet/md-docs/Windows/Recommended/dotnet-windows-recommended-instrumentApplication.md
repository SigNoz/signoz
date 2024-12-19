After setting up the Otel collector agent, follow the steps below to instrument your .NET Application

&nbsp;
&nbsp;

### Step 1: Install OpenTelemetry Dependencies
Install the following dependencies in your application.

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol 
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.Runtime
dotnet add package OpenTelemetry.Instrumentation.AspNetCore 
dotnet add package OpenTelemetry.AutoInstrumentation
```

&nbsp;

### Step 2:  Adding OpenTelemetry as a service and configuring exporter options

In your `Program.cs` file, add OpenTelemetry as a service. Here, we are configuring these variables:

&nbsp;

Here’s a sample `Program.cs` file with the configured variables:

```bash
using System.Diagnostics;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry with tracing and auto-start.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => 
        resource.AddService(serviceName: "{{MYAPP}}"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter(otlpOptions =>
        {
            otlpOptions.Endpoint = new Uri("http://localhost:4317");

            otlpOptions.Protocol = OtlpExportProtocol.Grpc;
        }));

var app = builder.Build();

//The index route ("/") is set up to write out the OpenTelemetry trace information on the response:
app.MapGet("/", () => $"Hello World! OpenTelemetry Trace: {Activity.Current?.Id}");

app.Run();
```
&nbsp;

The OpenTelemetry.Exporter.Options get or set the target to which the exporter is going to send traces. Here, we’re configuring it to send traces to the OTel Collector agent. The target must be a valid Uri with the scheme (http or https) and host and may contain a port and a path.

This is done by configuring an OpenTelemetry [TracerProvider](https://github.com/open-telemetry/opentelemetry-dotnet/tree/main/docs/trace/customizing-the-sdk#readme) using extension methods and setting it to auto-start when the host is started.




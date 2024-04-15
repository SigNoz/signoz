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

`serviceName` - It is the name of your service.

`otlpOptions.Endpoint` - It is the endpoint for your OTel Collector agent.

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


&nbsp;

### Step 3: Dockerize your application

Since the crucial environment variables like SIGNOZ_INGESTION_KEY, Ingestion Endpoint and Service name are set in the `program.cs` file, you don't need to add any additional steps in your Dockerfile.

An **example** of a Dockerfile could look like this:

```bash

# Use the Microsoft official .NET SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy the CSPROJ file and restore any dependencies (via NUGET)
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the project files and build the application
COPY . ./
RUN dotnet publish -c Release -o out

# Generate the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/out .

# Expose port 5145 for the application
EXPOSE 5145

# Set the ASPNETCORE_URLS environment variable to listen on port 5145
ENV ASPNETCORE_URLS=http://+:5145

ENTRYPOINT ["dotnet", "YOUR-APPLICATION.dll"]
```
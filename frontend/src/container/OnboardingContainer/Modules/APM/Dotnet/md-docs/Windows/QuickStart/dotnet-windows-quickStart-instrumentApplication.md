**Step 1: Installing the OpenTelemetry dependency packages:**

```bash
dotnet add package OpenTelemetry
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol 
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.Runtime
dotnet add package OpenTelemetry.Instrumentation.AspNetCore 
dotnet add package OpenTelemetry.AutoInstrumentation
```

**Step 2: Adding OpenTelemetry as a service and configuring exporter options in `Program.cs`:**

In your `Program.cs` file, add OpenTelemetry as a service. Here, we are configuring these variables:

- `serviceName` - It is the name of your service.
- `otlpOptions.Endpoint` - It is the endpoint for SigNoz Cloud.
- `<SIGNOZ_INGESTION_KEY>` - You will get your ingestion key when you [sign up](https://signoz.io/teams/) for SigNoz cloud.

Here’s a sample `Program.cs` file with the configured variables.

```bash
using System.Diagnostics;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry with tracing and auto-start.
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => 
		resource.AddService(serviceName: "sample-net-app"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddOtlpExporter(otlpOptions =>
        {
						//SigNoz Cloud Endpoint 
            otlpOptions.Endpoint = new Uri("https://ingest.{region}.signoz.cloud:443");

            otlpOptions.Protocol = OtlpExportProtocol.Grpc;
						
						//SigNoz Cloud account Ingestion key
            string headerKey = "signoz-access-token";
            string headerValue = "<SIGNOZ_INGESTION_KEY>";

            string formattedHeader = $"{headerKey}={headerValue}";
            otlpOptions.Headers = formattedHeader;
        }));

var app = builder.Build();

// The index route ("/") is set up to write out the OpenTelemetry trace information on the response:
app.MapGet("/", () => $"Hello World! OpenTelemetry Trace: {Activity.Current?.Id}");

app.Run();
```

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint |
| --- | --- |
| US | ingest.us.signoz.cloud:443 |
| IN | ingest.in.signoz.cloud:443 |
| EU | ingest.eu.signoz.cloud:443 |

The program uses the <a href = "https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/src/OpenTelemetry.Instrumentation.AspNetCore/README.md" rel="noopener noreferrer nofollow" target="_blank" >OpenTelemetry.Instrumentation.AspNetCore</a> package to automatically create traces for incoming ASP.NET Core requests.

The `OpenTelemetry.Exporter.Options` get or set the target to which the exporter is going to send traces. Here, we’re configuring it to send traces to the SigNoz cloud. The target must be a valid Uri with the scheme (`http` or `https`) and host and may contain a port and a path.

This is done by configuring an OpenTelemetry <a href = "https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.MD#tracerprovider" rel="noopener noreferrer nofollow" target="_blank" >TracerProvider</a> using extension methods and setting it to auto-start when the host is started.

<Admonition>
You can find your Signoz cloud address and ingestion key under the settings of your Signoz cloud account.
</Admonition>


<figure data-zoomable align='center'>
    <img src="/img/docs/ingestion_key_details.webp" alt="Access the ingestion key details in SigNoz UI"/>
    <figcaption><i>Access the ingestion key details in SigNoz UI</i></figcaption>
</figure>


**Step 3. Running the .NET application:**

```bash
dotnet build
dotnet run
```

**Step 4: Generating some load data and checking your application in SigNoz UI**

Once your application is running, generate some traffic by interacting with it.

In the SigNoz account, open the `Services` tab. Hit the `Refresh` button on the top right corner, and your application should appear in the list of `Applications`. Ensure that you're checking data for the `time range filter` applied in the top right corner. You might have to wait for a few seconds before the data appears on SigNoz UI.
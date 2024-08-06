
1. **Install Dependencies**<br></br>
   Dependencies related to OpenTelemetry exporter and SDK have to be installed first. Note that we are assuming you are using `gin` request router. If you are using other request routers, check out the [corresponding package](#request-routers).
   
   Run the below commands after navigating to the application source folder:
    
    ```bash
    go get go.opentelemetry.io/otel \
      go.opentelemetry.io/otel/trace \
      go.opentelemetry.io/otel/sdk \
      go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin \
      go.opentelemetry.io/otel/exporters/otlp/otlptrace \
      go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
    ```
    &nbsp;
    
2. **Declare environment variables for configuring OpenTelemetry**<br></br>
   Declare the following global variables in `main.go` which we will use to configure OpenTelemetry:
   
   ```go
    var (
        serviceName  = os.Getenv("SERVICE_NAME")
        collectorURL = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        insecure     = os.Getenv("INSECURE_MODE")
    )
    ```
    &nbsp;
    
3. **Instrument your Go application with OpenTelemetry**<br></br>
   To configure your application to send data we will need a function to initialize OpenTelemetry. Add the following snippet of code in your `main.go` file.
    
   ```go
        
    import (
        .....

        "google.golang.org/grpc/credentials"
        "github.com/gin-gonic/gin"
        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/attribute"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"

        "go.opentelemetry.io/otel/sdk/resource"
        sdktrace "go.opentelemetry.io/otel/sdk/trace"
    )

    func initTracer() func(context.Context) error {

        var secureOption otlptracegrpc.Option

        if strings.ToLower(insecure) == "false" || insecure == "0" || strings.ToLower(insecure) == "f" {
            secureOption = otlptracegrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, ""))
        } else {
            secureOption = otlptracegrpc.WithInsecure()
        }

        exporter, err := otlptrace.New(
            context.Background(),
            otlptracegrpc.NewClient(
                secureOption,
                otlptracegrpc.WithEndpoint(collectorURL),
            ),
        )

        if err != nil {
            log.Fatalf("Failed to create exporter: %v", err)
        }
        resources, err := resource.New(
            context.Background(),
            resource.WithAttributes(
                attribute.String("service.name", serviceName),
                attribute.String("library.language", "go"),
            ),
        )
        if err != nil {
            log.Fatalf("Could not set resources: %v", err)
        }

        otel.SetTracerProvider(
            sdktrace.NewTracerProvider(
                sdktrace.WithSampler(sdktrace.AlwaysSample()),
                sdktrace.WithBatcher(exporter),
                sdktrace.WithResource(resources),
            ),
        )
        return exporter.Shutdown
    }
    ```

    &nbsp;
    
4. **Initialize the tracer in main.go**<br></br>
   Modify the main function to initialise the tracer in `main.go`. Initiate the tracer at the very beginning of our main function.
    
    ```go
    func main() {
        cleanup := initTracer()
        defer cleanup(context.Background())
    
        ......
    }
    ```
    &nbsp;
    
5. **Add the OpenTelemetry Gin middleware**<br></br>
   Configure Gin to use the middleware by adding the following lines in `main.go`.
    
    ```go
    import (
        ....
      "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
    )
    
    func main() {
        ......
        r := gin.Default()
        r.Use(otelgin.Middleware(serviceName))
        ......
    }
    ```
    
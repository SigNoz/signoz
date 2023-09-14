## Send Traces to SigNoz Cloud

### Application on VMs

From VMs, there are two ways to send data to SigNoz Cloud.

- [Send traces directly to SigNoz Cloud](#send-traces-directly-to-signoz-cloud)
- [Send traces via OTel Collector binary](#send-traces-via-otel-collector-binary) (recommended)

#### **Send traces directly to SigNoz Cloud**

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
    
2. **Declare environment variables for configuring OpenTelemetry**<br></br>
   
   Declare the following global variables in `main.go` which we will use to configure OpenTelemetry:
   
   ```bash
    var (
        serviceName  = os.Getenv("SERVICE_NAME")
        collectorURL = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        insecure     = os.Getenv("INSECURE_MODE")
    )
    ```
    
3. **Instrument your Go application with OpenTelemetry**<br></br>
   
   To configure your application to send data we will need a function to initialize OpenTelemetry. Add the following snippet of code in your `main.go` file.
   
    ```go
        
    import (
        .....

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
    
4. **Initialize the tracer in main.go**<br></br>
   
   Modify the main function to initialise the tracer in `main.go`. Initiate the tracer at the very beginning of our main function.
    
    ```go
    func main() {
        cleanup := initTracer()
        defer cleanup(context.Background())
    
        ......
    }
    ```
    
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

6. **Set environment variables and run your Go Gin application**<br></br>
   
   The run command must have some environment variables to send data to SigNoz cloud. The run command:
    
    ```bash
    SERVICE_NAME=goApp INSECURE_MODE=false OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<SIGNOZ-INGESTION-TOKEN> OTEL_EXPORTER_OTLP_ENDPOINT=ingest.{region}.signoz.cloud:443 go run main.go
    ```

    We can replace the placeholders based on our environment. 
    
    `SERVICE_NAME`: goGinApp (you can name it whatever you want)

    `OTEL_EXPORTER_OTLP_HEADERS`: `signoz-access-token=<SIGNOZ-INGESTION-TOKEN>`. Update `<SIGNOZ-INGESTION-TOKEN>` with the ingestion token provided by SigNoz
    
    `OTEL_EXPORTER_OTLP_ENDPOINT`: ingest.{region}.signoz.cloud:443. Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

    
    US - ingest.us.signoz.cloud:443 <br></br>

    IN - ingest.in.signoz.cloud:443 <br></br>

    EU - ingest.eu.signoz.cloud:443 <br></br>


---

#### **Send traces via OTel Collector binary**

OTel Collector binary helps to collect logs, hostmetrics, resource and infra attributes. It is recommended to install Otel Collector binary to collect and send traces to SigNoz cloud. You can correlate signals and have rich contextual data through this way.

You can find instructions to install OTel Collector binary [here](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your VM. Once you are done setting up your OTel Collector binary, you can follow the below steps for instrumenting your Golang application.

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
    
2. **Declare environment variables for configuring OpenTelemetry**<br></br>
   
   Declare the following global variables in `main.go` which we will use to configure OpenTelemetry:
   
   ```go
    var (
        serviceName  = os.Getenv("SERVICE_NAME")
        collectorURL = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        insecure     = os.Getenv("INSECURE_MODE")
    )
    ```
    
3. **Instrument your Go application with OpenTelemetry**<br></br>
   
   To configure your application to send data we will need a function to initialize OpenTelemetry. Add the following snippet of code in your `main.go` file.
    
   ```go
        
    import (
        .....

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
    
4. **Initialize the tracer in main.go**<br></br>
   
   Modify the main function to initialise the tracer in `main.go`. Initiate the tracer at the very beginning of our main function.
    
    ```go
    func main() {
        cleanup := initTracer()
        defer cleanup(context.Background())
    
        ......
    }
    ```
    
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
    
6. **Set environment variables and run your Go Gin application**<br></br>
   
   The run command must have some environment variables to send data to SigNoz. The run command:
    
    ```bash
    SERVICE_NAME=goGinApp INSECURE_MODE=true OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 go run main.go
    ```
    
    If you want to update your `service_name`, you can modify the `SERVICE_NAME` variable.<br></br>
    `SERVICE_NAME`: goGinApp (you can name it whatever you want)

---

### Applications Deployed on Kubernetes

For Golang application deployed on Kubernetes, you need to install OTel Collector agent in your k8s infra to collect and send traces to SigNoz Cloud. You can find the instructions to install OTel Collector agent [here](/docs/tutorial/kubernetes-infra-metrics/).

Once you have set up OTel Collector agent, you can proceed with OpenTelemetry Golang instrumentation by following the below steps:

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
    
2. **Declare environment variables for configuring OpenTelemetry**<br></br>
   
   Declare the following global variables in `main.go` which we will use to configure OpenTelemetry:
   
   ```go
    var (
        serviceName  = os.Getenv("SERVICE_NAME")
        collectorURL = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        insecure     = os.Getenv("INSECURE_MODE")
    )
    ```
    
3. **Instrument your Go application with OpenTelemetry**<br></br>
   
   To configure your application to send data we will need a function to initialize OpenTelemetry. Add the following snippet of code in your `main.go` file.
    
   ```go
        
    import (
        .....

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
    
4. **Initialize the tracer in main.go**<br></br>
   
   Modify the main function to initialise the tracer in `main.go`. Initiate the tracer at the very beginning of our main function.
    
    ```go
    func main() {
        cleanup := initTracer()
        defer cleanup(context.Background())
    
        ......
    }
    ```
    
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
    
6. **Set environment variables and run your Go Gin application**<br></br>

   The run command must have some environment variables to send data to SigNoz. The run command:
    
    ```bash
    SERVICE_NAME=goGinApp INSECURE_MODE=true OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 go run main.go
    ```
    
    If you want to update your `service_name`, you can modify the `SERVICE_NAME` variable.<br></br>
    `SERVICE_NAME`: goGinApp (you can name it whatever you want)
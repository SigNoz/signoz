**Set environment variables and run your Go Gin application**<br></br>
   The run command must have some environment variables to send data to SigNoz. Then run the following commands:
   &nbsp;
    
    ```bash
    setx SERVICE_NAME={{MYAPP}}
    setx INSECURE_MODE=true
    setx OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
    ```

&nbsp;
&nbsp;

    ```bash
    go run main.go
    ```
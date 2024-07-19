**Set environment variables and run your Go Gin application**<br></br>
   The run command must have some environment variables to send data to SigNoz. Then run the following commands:
    
    ```bash
    set SERVICE_NAME=goGinApp
    set INSECURE_MODE=true
    set OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317
    ```

    ```bash
    go run main.go
    ```
    
    If you want to update your `service_name`, you can modify the `SERVICE_NAME` variable.<br></br>
    `SERVICE_NAME`: goGinApp (you can name it whatever you want)
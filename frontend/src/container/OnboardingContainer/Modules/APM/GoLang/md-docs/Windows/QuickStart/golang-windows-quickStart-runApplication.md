**Set environment variables and run your Go Gin application**<br></br>
   The run command must have some environment variables to send data to SigNoz cloud. The run commands:
    
    ```bash
    set SERVICE_NAME=goApp
    set INSECURE_MODE=false
    set OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<SIGNOZ-INGESTION-TOKEN>
    set OTEL_EXPORTER_OTLP_ENDPOINT=ingest.{region}.signoz.cloud:443
    ```

    ```bash
    go run main.go
    ```

    We can replace the placeholders based on our environment. 
    
    `SERVICE_NAME`: goGinApp (you can name it whatever you want)

    `OTEL_EXPORTER_OTLP_HEADERS`: `signoz-access-token=<SIGNOZ-INGESTION-TOKEN>`. Update `<SIGNOZ-INGESTION-TOKEN>` with the ingestion token provided by SigNoz
    
    `OTEL_EXPORTER_OTLP_ENDPOINT`: ingest.`{region}`.signoz.cloud:443. Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

    | Region | Endpoint |
    | --- | --- |
    | US |	ingest.us.signoz.cloud:443 |
    | IN |	ingest.in.signoz.cloud:443 |
    | EU | ingest.eu.signoz.cloud:443 |
---

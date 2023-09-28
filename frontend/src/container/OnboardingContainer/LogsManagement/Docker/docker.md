## Collect Docker Container Logs in SigNoz Cloud

- Clone this [repository](https://github.com/SigNoz/docker-container-logs)

- Update `otel-collector-config.yaml` and set the values of `<SIGNOZ_INGESTION_KEY>` and `{region}`.

    Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary accordingly.

    US -	ingest.us.signoz.cloud:443 

    IN -	ingest.in.signoz.cloud:443 

    EU - ingest.eu.signoz.cloud:443 


 - Start the containers
 
    ```bash
    docker compose up -d
    ```

 - If there are no errors your logs will be exported and will be visible on the SigNoz UI.


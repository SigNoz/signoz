## Collect Docker Container Logs in SigNoz Cloud

**Step 1. Clone this repository**

Clone the GitHub repository as a first step to collect logs 

```bash
git clone https://github.com/SigNoz/docker-container-logs.git
```

**Step 2. Update your `.env` file**

In the repository that you cloned above, update `.env` file by putting the values of `<SIGNOZ_INGESTION_KEY>` and `{region}`.

Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary accordingly.

US -	ingest.us.signoz.cloud:443 

IN -	ingest.in.signoz.cloud:443 

EU - ingest.eu.signoz.cloud:443 

**Step 3. Start the containers**
 
   ```bash
    docker compose up -d
   ```

If there are no errors your logs will be exported and will be visible on the SigNoz UI.


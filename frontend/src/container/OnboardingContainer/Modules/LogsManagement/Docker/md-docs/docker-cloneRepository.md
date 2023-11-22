
### Step 1: Clone this repository
Clone this GitHub repository as a first step to collect logs

```bash
git clone https://github.com/SigNoz/docker-container-logs.git
```

&nbsp;

### Step 2: Update your `.env` file
In the repository that you cloned above, update `.env` file by updating it with values **`SIGNOZ_INGESTION_KEY`** and **`OTEL_COLLECOTR_ENDPOINT`** shown below

```bash
OTEL_COLLECOTR_ENDPOINT=ingest.{{REGION}}.signoz.cloud:443
SIGNOZ_INGESTION_KEY={{SIGNOZ_INGESTION_KEY}}
```
Paste these values in the **`.env`** file.
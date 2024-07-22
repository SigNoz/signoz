
**Step 4: Set environment variables and run app**

Go to your `.env` file and update the value of required variables i.e

```bash
APP_NAME={{MYAPP}}
SIGNOZ_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443
SIGNOZ_ACCESS_TOKEN={{SIGNOZ_INGESTION_KEY}}
```

Now run `cargo run` in terminal to start the application!
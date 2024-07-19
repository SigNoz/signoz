## Running your Ruby application**

Run the application using the below:

```jsx
rails server
```

- `<YOUR_SERVICE_NAME>` : Name of service. For example, `sampleRailsApp`
- `<SIGNOZ_INGESTION_KEY>` : The ingestion key sent by SigNoz over email. It can also be found in the `settings` section of your SigNoz Cloud UI.

- `<SIGNOZ_URL>` : Depending on the choice of your region for SigNoz cloud, the ingest endpoint will vary according to this table.

| Region | Endpoint |
| --- | --- |
| US |	ingest.us.signoz.cloud:443 |
| IN |	ingest.in.signoz.cloud:443 |
| EU | ingest.eu.signoz.cloud:443 |
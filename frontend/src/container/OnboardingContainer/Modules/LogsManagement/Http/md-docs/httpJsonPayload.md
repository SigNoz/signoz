## Payload Structure

To send logs to SigNoz over HTTP, we have a payload structure which is an array of JSON logs which adheres to the [OTEL Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/).

&nbsp;

The structure of the Payload has the following fields:

```bash
[
  {
    "timestamp": <uint64>,
    "trace_id": <hex string>,
    "span_id": <hex string>,
    "trace_flags": <int>,
    "severity_text": <string>,
    "severity_number": <int>,
    "attributes": <map>,
    "resources": <map>,
    "body": <string>,
  }
]
```
**Notes:**
* `timestamp` is an int64 representing nanaseconds since the Unix epoch.
*  You can use **body** or **message** to denote the log content.

&nbsp;

Any other fields present apart from the ones mentioned above will be moved to the **attributes map**. For example: 

```bash
[
  {
    "host": "myhost",
    "method": "GET",
    "body": "this is a log line"
  }
]
```

Will be treated as:
```bash
[
  {
    "attributes": {
      "host": "myhost",
      "method": "GET"
    },
    "body": "this is a log line"
  }
]
```
&nbsp;

## Send logs 

This is a **sample cURL request** which can be used as a template: 

&nbsp;

```bash
curl --location 'https://ingest.{{REGION}}.signoz.cloud:443/logs/json' \
--header 'Content-Type: application/json' \
--header 'signoz-ingestion-key: {{SIGNOZ_INGESTION_KEY}}' \
--data '[
    {
        "trace_id": "000000000000000018c51935df0b93b9",
        "span_id": "18c51935df0b93b9",
        "trace_flags": 0,
        "severity_text": "info",
        "severity_number": 4,
        "attributes": {
            "method": "GET",
            "path": "/api/users"
        },
        "resources": {
            "host": "myhost",
            "namespace": "prod"
        },
        "message": "This is a log line"
    }
]'
```
&nbsp;

This curl request will have the timestamp of when you send the above log.

&nbsp;

To specify a particular timestamp in your log, ensure you include the `timestamp` field in your cURL request. Place the timestamp field before the `trace_id` field. For example, `timestamp`: 1698310066000000000

&nbsp;

**Note:**  You can customize the cURL request as needed for your specific use case.
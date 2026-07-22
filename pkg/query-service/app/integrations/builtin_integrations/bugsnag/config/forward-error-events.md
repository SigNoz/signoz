### Forward Bugsnag Error Events

Bugsnag delivers a JSON payload to a webhook each time a notification trigger fires. The bundled `webhookevent` receiver accepts these payloads, and a transform processor maps Bugsnag fields to log attributes.

#### Add the receiver and transform to your Collector config

Add the following to your SigNoz Collector config:

```yaml
receivers:
  webhookevent/bugsnag:
    endpoint: 0.0.0.0:4435
    path: /webhook/<random-secret>
```

```yaml
processors:
  transform/bugsnag:
    error_mode: ignore
    log_statements:
    - context: log
      statements:
      - 'set(resource.attributes["service.name"], "bugsnag")'
      - 'set(attributes["source"], "bugsnag")'
      - 'merge_maps(cache, ParseJSON(body), "upsert")'
      - 'set(attributes["bugsnag.payload"], body)'
      - 'set(severity_text, "ERROR") where cache["error"]["severity"] == "error"'
      - 'set(severity_number, 17) where cache["error"]["severity"] == "error"'
      - 'set(severity_text, "WARN") where cache["error"]["severity"] == "warning"'
      - 'set(severity_number, 13) where cache["error"]["severity"] == "warning"'
      - 'set(severity_text, "INFO") where cache["error"]["severity"] == "info"'
      - 'set(severity_number, 9) where cache["error"]["severity"] == "info"'
      - 'set(severity_text, "INFO") where severity_text == ""'
      - 'set(severity_number, 9) where severity_number == 0'
      - 'set(attributes["bugsnag.trigger.type"], cache["trigger"]["type"])'
      - 'set(attributes["bugsnag.project.name"], cache["project"]["name"])'
      - 'set(attributes["bugsnag.error.id"], cache["error"]["id"])'
      - 'set(attributes["bugsnag.error.url"], cache["error"]["url"])'
      - 'set(attributes["bugsnag.error.status"], cache["error"]["status"])'
      - 'set(attributes["bugsnag.error.unhandled"], cache["error"]["unhandled"])'
      - 'set(attributes["bugsnag.error.context"], cache["error"]["context"])'
      - 'set(attributes["exception.type"], cache["error"]["exceptionClass"])'
      - 'set(attributes["exception.message"], cache["error"]["message"])'
      - 'set(attributes["app.version"], cache["error"]["app"]["version"])'
      - 'set(attributes["bugsnag.release_stage"], cache["error"]["app"]["releaseStage"])'
      - 'set(attributes["device.manufacturer"], cache["error"]["device"]["manufacturer"])'
      - 'set(attributes["device.model.name"], cache["error"]["device"]["model"])'
      - 'set(attributes["os.name"], cache["error"]["device"]["osName"])'
      - 'set(attributes["os.version"], cache["error"]["device"]["osVersion"])'
      - 'set(attributes["user.id"], cache["error"]["user"]["id"])'
      - 'set(attributes["bugsnag.release.version"], cache["release"]["version"])'
      - 'set(attributes["exception.stacktrace"], String(cache["error"]["exceptions"][0]["stacktrace"]))'
      - 'set(body, Concat([cache["error"]["exceptionClass"], ": ", cache["error"]["message"]], "")) where cache["error"]["exceptionClass"] != nil'
      - 'set(body, cache["trigger"]["message"]) where cache["error"] == nil and cache["trigger"]["message"] != nil'
```

The transform stores the raw webhook payload in the `bugsnag.payload` attribute and rewrites the log body to a readable `ExceptionClass: message` line, so the logs explorer and dashboards stay scannable while nothing is lost.

Add the pipeline to the `service` section:

```yaml
service:
  pipelines:
    logs/bugsnag:
      receivers: [webhookevent/bugsnag]
      processors: [transform/bugsnag, batch]
      exporters: [clickhouselogsexporter]
```

If you run a separate gateway Collector in front of SigNoz, use the same receiver and transform there with your existing `otlp` exporter to SigNoz instead of `clickhouselogsexporter`.

#### Expose the receiver

- If SigNoz runs in Docker, publish the port on the Collector container (add `"4435:4435"` to its `ports`).
- Route `https://<your-domain>/webhook/*` to port 4435 through your reverse proxy or load balancer. Keep the rest of SigNoz private — only this path needs to be public.
- Restart the Collector and confirm the receiver is up: `curl http://localhost:4435/health_check` returns `200`.

#### Create the webhook in Bugsnag

1. In the Bugsnag dashboard, open your project and go to **Settings**, then select the **Integrations and email** tab.
2. Under **Data forwarding**, select **Webhook**.
3. Set the webhook URL, including your secret:

```
https://<your-domain>/webhook/<random-secret>
```

4. Choose which events notify the webhook — for example new errors, reopened errors, and error spikes.

**Note:** by default Bugsnag only notifies webhooks about *new* error types, reopened errors, and spikes — repeat occurrences of an already-known error do not fire the webhook. To forward every error occurrence, enable the per-event trigger ("every time an error event is received"); this is higher volume and may be limited on some Bugsnag plans.
5. Save and use **Send test notification**. The event appears in the SigNoz logs explorer within seconds with `source = bugsnag`.

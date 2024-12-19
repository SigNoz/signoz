### Send logs to SigNoz

To test out the receiver, create a pipeline in the pipeline section of the `config.yaml` of the **`otecol-contrib`** directory that you created in the Setup Otel Collector Step.

```bash
...
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics/internal:
      receivers: [prometheus, hostmetrics]
      processors: [resourcedetection, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp, awscloudwatch]
      processors: [batch]
      exporters: [otlp]
```

&nbsp;

### Run OTel Collector
 Run this command inside the `otelcol-contrib` directory :

```bash
./otelcol-contrib --config ./config.yaml 
```

You should be able to see your Cloudwatch logs in the logs tabs of SigNoz Cloud UI.




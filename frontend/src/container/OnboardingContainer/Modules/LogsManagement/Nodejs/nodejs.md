# Collecting NodeJS winston logs

If you are using `winston` as your logging library in your Nodejs application, you can export these logs to SigNoz very easily using various transports provided by `winston`.

## Collecting Nodejs logs when application is deployed on Docker or Kubernetes

When your application is deployed in Docker or a Kubernetes cluster the logs from the console are automatically collected and stored in the node. The SigNoz collector will automatically collect the logs and it will be visible on the SigNoz UI.

You can add a console transport very easily as stated <a href="https://github.com/winstonjs/winston/blob/master/docs/transports.md#console-transport" rel="noopener noreferrer nofollow" target="_blank">here</a>.

```
logger.add(new winston.transports.Console(options));
```

## Collecting Nodejs logs when application is deployed on a Host

When you run your application directly on the host, you will be required to add a intermediary medium ex:- a file, where you can export your logs and the otel-collector can read them and push to signoz.

You can add a file transport very easily as stated <a href="https://github.com/winstonjs/winston/blob/master/docs/transports.md#file-transport" rel="noopener noreferrer nofollow" target="_blank">here</a>.

```
logger.add(new winston.transports.File(options));
```

Once you run your application and the logs are added to a file, you can configure otel collector to read from that file.

For configuring it you can follow the guide [here](./collecting_application_logs_file.md#collecting-application-logs-from-log-file).

Once you configure the otel collector the logs will be visible on the UI.

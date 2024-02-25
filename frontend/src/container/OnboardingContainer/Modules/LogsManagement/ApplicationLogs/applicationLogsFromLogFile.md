## Collect Application Logs from Log file in SigNoz cloud

- Add otel collector binary to your VM by following this [guide](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/).

- Add the filelog reciever to `config.yaml`.

  ```yaml {3-15}
  receivers:
    ...
    filelog/app:
      include: [ /tmp/app.log ]
      start_at: end
  ...
  ```

  Replace `/tmp/app.log` with the path to your log file.

  Note: change the `start_at` value to `beginning` if you want to read the log file from the beginning. It may be useful if you want to send old logs to SigNoz. The log records older than the standard log retention period (default 15 days) will be discarded.

  For parsing logs of different formats you will have to use operators, you can read more about operators [here](https://signoz.io/docs/userguide/logs/#operators-for-parsing-and-manipulating-logs).

  For more configurations that are available for filelog receiver please check [here](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver).

- Next we will modify our pipeline inside `config.yaml` to include the receiver we have created above.

  ```yaml {4}
  service:
      ....
      logs:
          receivers: [otlp, filelog/app]
          processors: [batch]
          exporters: [otlp]
  ```

- Now we can restart the otel collector so that new changes are applied.

- The log will be exported, if you add more lines to the log file it will be exported as well

- If there are no errors your logs will be visible on SigNoz UI.

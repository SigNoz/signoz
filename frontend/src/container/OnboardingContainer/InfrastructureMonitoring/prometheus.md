## Enable a Prometheus Receiver

SigNoz supports all the exporters that are listed on the [Exporters and Integrations](https://prometheus.io/docs/instrumenting/exporters/) page of the Prometheus documentation. If you have a running Prometheus instance, and you expose metrics in Prometheus, then you can scrape them in SigNoz by configuring Prometheus receivers in the `receivers.prometheus.config.scrape_configs` section of the `deploy/docker/clickhouse-setup/otel-collector-metrics-config.yaml` file.

To enable a Prometheus receiver, follow the steps below:

1. Open the `deploy/docker/clickhouse-setup/otel-collector-metrics-config.yaml` file in a plain-text editor.
2. Enable a new Prometheus receiver. Depending on your use case, there are two ways in which you can enable a new Prometheus exporter:

   - **By creating a new job**: The following example shows how you can enable a Prometheus receiver by creating a new job named `my-new-job`:

     ```yaml {15-18}
     receivers:
      otlp:
       protocols:
        grpc:
        http:

      # Data sources: metrics
      prometheus:
       config:
        scrape_configs:
         - job_name: 'otel-collector'
           scrape_interval: 30s
           static_configs:
            - targets: ['otel-collector:8889']
         - job_name: 'my-new-job'
           scrape_interval: 30s
           static_configs:
            - targets: ['localhost:8080']
     processors:
      batch:
       send_batch_size: 1000
       timeout: 10s
     # This file was truncated for brevity.
     ```

   - **By adding a new target to an existing job**: The following example shows the default `otel-collector` job to which a new target (`localhost:8080`) was added:

     ```yaml {14}
     receivers:
      otlp:
       protocols:
        grpc:
        http:

      # Data sources: metrics
      prometheus:
       config:
        scrape_configs:
         - job_name: 'otel-collector'
           scrape_interval: 30s
           static_configs:
            - targets: ['otel-collector:8889', 'localhost:8080']
     processors:
      batch:
       send_batch_size: 1000
       timeout: 10s
     # This file was truncated for brevity.
     ```

     Note that all the jobs are scraped in parallel, and all targets inside a job are scraped serially. For more details about configuring jobs and targets, see the following sections of the Prometheus documentation:

     - [<Scrape_config>](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
     - [Jobs and Instances](https://prometheus.io/docs/concepts/jobs_instances/)

3. <SaveChangesRestart />

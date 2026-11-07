## Integration: Messaging Queues

This package contains the `api` and `translation` logic to support messaging queue monitoring and queue overview aggregation.

Currently supported queues:
1) Kafka (`kafka`)
2) Celery (`celery`)
3) AWS SQS (`aws_sqs`, `sqs`, `aws.sqs`)
4) Google Pub/Sub (`gcp_pubsub`, `pubsub`, `googlecloudpubsub`)
5) AWS Kinesis (`aws_kinesis`, `kinesis`, `aws.kinesis`)
6) Redis (`redis`, `db.system = redis`)

For detailed setup, check our public docs for configuring:
1) Trace collection from Clients (Producer and Consumer spans using OpenTelemetry semantic conventions)
2) Metrics collection from Brokers, Producers, and Consumers

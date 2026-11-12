## Integration: Messaging Queues

This package contains the `api` and `translation` logic to support messaging queue monitoring features in SigNoz.

Currently supported messaging and queuing systems:
1) Apache Kafka (`kafka`)
2) Celery (`celery`)
3) AWS SQS (`aws_sqs`, `sqs`, `aws.sqs`, `amazonsqs`)
4) Google Cloud Pub/Sub (`gcp_pubsub`, `pubsub`, `googlecloudpubsub`, `gcp.pubsub`)
5) AWS Kinesis (`aws_kinesis`, `kinesis`, `aws.kinesis`)
6) Redis Streams / Queues (`redis`, `redis_streams`, `redis.streams`)

For detailed setup, check out our public docs for configuring:
1) Trace collection from Clients (Producer and Consumer)
2) Metrics collection from Brokers, Producers, and Consumers
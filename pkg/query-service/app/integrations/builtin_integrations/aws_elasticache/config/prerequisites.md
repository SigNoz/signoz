## Before You Begin  

To configure metrics and logs collection for an AWS ElastiCache server, you need the following.


- **Ensure Credentials and permissions are set correctly**  
 The components used for this integration relies on AWS SDKs, which offer a variety of ways to provide credentials, including the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables.  
 The following IAM permissions are required:
    - `cloudwatch:ListMetrics`
    - `cloudwatch:GetMetricStatistics`
    - `cloudwatch:GetMetricData`
    - `tag:GetResources` (if aws_tag_select feature is used)
    - `logs:DescribeLogGroups`
    - `logs:FilterLogEvents`

- **Ensure Java Runtime Environment (JRE), version 11 or newer**  
 The CloudWatch Exporter used to collect the metrics requires a Java runtime environment version 11 or newer. This is not required if you can run the docker container.

- **Ensure that an OTEL collector is running in your deployment environment**  
 If needed, please [install an OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) If already installed, ensure that the collector version is v0.88.0 or newer. Also, ensure that you can provide config files to the collector and that you can set environment variables and command line flags used for running it.


- **Ensure that the OTEL collector can access the Redis server**
 To collect Redis native metrics, the collector must be able to access the Redis server as a client. This step is optional.

### Configure AWS

Create a `~/.aws/credentials` file in the machine which should have `aws_access_key_id` and the `aws_secret_access_key` in the default section of credentials file.

An example credential file would look like this:
```bash
[default]
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[user1]
aws_access_key_id=AKIAI44QH8DHBEXAMPLE
aws_secret_access_key=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

**Note:** Replace the `aws_access_key_id`, `aws_secret_access_key`, `aws_access_key_id` and `aws_secret_access_key` with your credential values.

&nbsp;

The account corresponding to these credentials should have the **below-mentioned AWS Identity and Access Management (IAM)** policy. This allows describing and filtering log events across all log groups of that particular AWS account, a crucial step for forwarding CloudWatch logs to SigNoz.

```bash
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "logs:DescribeLogGroups",
                "logs:FilterLogEvents"
            ],
            "Resource": "arn:aws:logs:*:090340947446:log-group:*"
        }
    ]
}
```

**Important Note:** Make sure you have AWS configured on the machine where otel-collector is running.
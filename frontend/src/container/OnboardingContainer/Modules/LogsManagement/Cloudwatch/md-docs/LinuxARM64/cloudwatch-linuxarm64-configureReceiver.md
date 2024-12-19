### Configure awscloudwatch receiver

Add the `awscloudwatch` receiver in the receivers section of `config.yaml` file of the **`otecol-contrib`** directory that you created in the Setup Otel Collector Step.

&nbsp;

You can configure your receiver to collect logs with different conditions. 

&nbsp;

Here are two sample configurations: 

- This configuration below will do autodiscovery and collect 100 log groups starting with prefix application.

```bash

receivers:
...
    awscloudwatch:
        region: us-east-1
        logs:
          poll_interval: 1m
          groups:
            autodiscover:
              limit: 100
              prefix: application
...

```

- This configuration below will not do autodiscovery and specifies the names of the log groups to collect.
```bash
receivers:
...
awscloudwatch:
  profile: 'my-profile'
  region: us-west-1
  logs:
    poll_interval: 5m
    groups:
      named:
        /aws/eks/dev-0/cluster:

...
```

&nbsp;

To know more about the different parameters of awscloudwatch receiver, and see more sample configuration, checkout this [GitHub link](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awscloudwatchreceiver)

